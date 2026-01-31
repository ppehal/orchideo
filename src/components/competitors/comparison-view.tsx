'use client'

import * as React from 'react'
import Link from 'next/link'
import { ArrowLeft, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { LoadingButton } from '@/components/ui/loading-button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ReliabilityBadge } from '@/components/trends'
import { RankingTable } from './ranking-table'
import type { ComparisonResult, PageMetrics } from '@/lib/services/competitors'

interface ComparisonViewProps {
  groupId: string
}

const SORT_OPTIONS = [
  { value: 'overallScore', label: 'Celkové skóre' },
  { value: 'engagementRate', label: 'Engagement Rate' },
  { value: 'postsPerWeek', label: 'Příspěvky/týden' },
  { value: 'avgReactions', label: 'Prům. reakce' },
  { value: 'avgComments', label: 'Prům. komentáře' },
  { value: 'avgShares', label: 'Prům. sdílení' },
] as const

type SortKey = (typeof SORT_OPTIONS)[number]['value']

// Transform API metrics to component metrics format
function transformMetrics(page: PageMetrics) {
  return {
    pageId: page.pageId,
    pageName: page.pageName,
    isPrimary: page.isPrimary,
    metrics: {
      overallScore: page.metrics.overall_score ?? null,
      engagementRate: page.metrics.engagement_rate ?? null,
      postsPerWeek: page.metrics.posts_per_week ?? null,
      avgReactions: page.metrics.avg_reactions ?? null,
      avgComments: page.metrics.avg_comments ?? null,
      avgShares: page.metrics.avg_shares ?? null,
    },
  }
}

export function ComparisonView({ groupId }: ComparisonViewProps) {
  const [comparison, setComparison] = React.useState<ComparisonResult | null>(null)
  const [isLoading, setIsLoading] = React.useState(true)
  const [isRefreshing, setIsRefreshing] = React.useState(false)
  const [sortBy, setSortBy] = React.useState<SortKey>('overallScore')

  const fetchComparison = React.useCallback(async () => {
    try {
      const res = await fetch(`/api/competitor-groups/${groupId}/comparison`, {
        signal: AbortSignal.timeout(15000),
      })

      if (!res.ok) {
        throw new Error('Failed to fetch comparison')
      }

      const data = (await res.json()) as ComparisonResult
      setComparison(data)
    } catch (error) {
      console.error('[ComparisonView] fetch failed', error)
      toast.error('Nepodařilo se načíst porovnání')
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }, [groupId])

  React.useEffect(() => {
    fetchComparison()
  }, [fetchComparison])

  const handleRefresh = React.useCallback(() => {
    setIsRefreshing(true)
    fetchComparison()
  }, [fetchComparison])

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-96 w-full" />
      </div>
    )
  }

  if (!comparison) {
    return (
      <div className="text-center">
        <p className="text-muted-foreground">Nepodařilo se načíst porovnání</p>
        <Button variant="outline" className="mt-4" onClick={handleRefresh}>
          Zkusit znovu
        </Button>
      </div>
    )
  }

  const transformedPages = comparison.pages.map(transformMetrics)
  const reliabilityInfo = {
    ...comparison.reliability,
    snapshotCount: comparison.reliability.pagesWithSnapshots,
    oldestSnapshotDate: null,
    newestSnapshotDate: null,
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/competitors">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Zpět
          </Link>
        </Button>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">{comparison.groupName}</h1>
          <p className="text-muted-foreground text-sm">
            {comparison.pages.length} stránek v porovnání
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <ReliabilityBadge reliability={reliabilityInfo} />
          <LoadingButton variant="outline" size="sm" onClick={handleRefresh} loading={isRefreshing}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Obnovit
          </LoadingButton>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <span className="text-muted-foreground text-sm">Seřadit podle:</span>
        <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortKey)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SORT_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <RankingTable pages={transformedPages} sortBy={sortBy} />

      <p className="text-muted-foreground text-xs">
        * Označuje vaši primární stránku. Porovnání vypočítáno:{' '}
        {new Date(comparison.meta.calculatedAt).toLocaleString('cs-CZ')}
      </p>
    </div>
  )
}
