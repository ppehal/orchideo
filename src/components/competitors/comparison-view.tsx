'use client'

import * as React from 'react'
import Link from 'next/link'
import { ArrowLeft, History, RefreshCw, Save } from 'lucide-react'
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
import { HistorySelector, type HistoryItem } from './history-selector'
import { formatDateTime } from '@/lib/utils/date-utils'
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

  // History state
  const [history, setHistory] = React.useState<HistoryItem[]>([])
  const [isLoadingHistory, setIsLoadingHistory] = React.useState(true)
  const [selectedSnapshotId, setSelectedSnapshotId] = React.useState<string | null>(null)
  const [isSaving, setIsSaving] = React.useState(false)

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

  // Fetch history on mount
  React.useEffect(() => {
    let cancelled = false

    async function fetchHistory() {
      try {
        const res = await fetch(`/api/competitor-groups/${groupId}/comparison?history=true`, {
          signal: AbortSignal.timeout(10000),
        })

        if (!res.ok) throw new Error('Failed to fetch history')

        const data = await res.json()
        if (!cancelled) {
          setHistory(data.history ?? [])
        }
      } catch (error) {
        console.error('[ComparisonView] history fetch failed', error)
      } finally {
        if (!cancelled) {
          setIsLoadingHistory(false)
        }
      }
    }

    fetchHistory()

    return () => {
      cancelled = true
    }
  }, [groupId])

  // Reset if selected snapshot no longer exists
  React.useEffect(() => {
    if (!selectedSnapshotId || isLoadingHistory) return

    const exists = history.some((h) => h.id === selectedSnapshotId)
    if (!exists && history.length > 0) {
      setSelectedSnapshotId(null)
      toast.error('Snapshot nenalezen')
    }
  }, [selectedSnapshotId, history, isLoadingHistory])

  const handleRefresh = React.useCallback(() => {
    setIsRefreshing(true)
    fetchComparison()
  }, [fetchComparison])

  const handleSaveSnapshot = React.useCallback(async () => {
    setIsSaving(true)
    const toastId = toast.loading('Ukládám snapshot...', {
      description: 'Toto může chvíli trvat',
    })

    try {
      const res = await fetch(`/api/competitor-groups/${groupId}/comparison`, {
        method: 'POST',
        signal: AbortSignal.timeout(15000),
      })

      if (!res.ok) throw new Error('Failed')

      toast.success('Snapshot uložen', { id: toastId })

      // Refresh history
      const histRes = await fetch(`/api/competitor-groups/${groupId}/comparison?history=true`, {
        signal: AbortSignal.timeout(10000),
      })
      if (histRes.ok) {
        const data = await histRes.json()
        setHistory(data.history ?? [])
      }
    } catch (error) {
      console.error('[ComparisonView] save failed', error)
      toast.error('Nepodařilo se uložit snapshot', { id: toastId })
    } finally {
      setIsSaving(false)
    }
  }, [groupId])

  // Derived data - show historical or current
  const displayData = React.useMemo(() => {
    if (selectedSnapshotId) {
      const snapshot = history.find((h) => h.id === selectedSnapshotId)
      return snapshot?.data ?? comparison
    }
    return comparison
  }, [selectedSnapshotId, history, comparison])

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

  const dataToShow = displayData ?? comparison
  const transformedPages = dataToShow.pages.map(transformMetrics)
  const reliabilityInfo = {
    ...dataToShow.reliability,
    snapshotCount: dataToShow.reliability.pagesWithSnapshots,
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
          <h1 className="text-2xl font-bold">{dataToShow.groupName}</h1>
          <p className="text-muted-foreground text-sm">
            {dataToShow.pages.length} stránek v porovnání
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <HistorySelector
            history={history}
            selectedId={selectedSnapshotId}
            onSelect={setSelectedSnapshotId}
            isLoading={isLoadingHistory}
          />
          <ReliabilityBadge reliability={reliabilityInfo} />
          {!selectedSnapshotId && (
            <LoadingButton
              variant="outline"
              size="sm"
              onClick={handleSaveSnapshot}
              loading={isSaving}
            >
              <Save className="mr-2 h-4 w-4" />
              <span className="hidden sm:inline">Uložit snapshot</span>
              <span className="sm:hidden">Uložit</span>
            </LoadingButton>
          )}
          <LoadingButton variant="outline" size="sm" onClick={handleRefresh} loading={isRefreshing}>
            <RefreshCw className="mr-2 h-4 w-4" />
            <span className="hidden sm:inline">Obnovit</span>
          </LoadingButton>
        </div>
      </div>

      {selectedSnapshotId && (
        <div className="bg-muted/50 flex flex-col gap-2 rounded-md border px-3 py-2 text-sm sm:flex-row sm:items-center">
          <div className="flex items-center gap-2">
            <History className="h-4 w-4 shrink-0" />
            <span>
              Historické porovnání z <strong>{formatDateTime(dataToShow.meta.calculatedAt)}</strong>
            </span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="self-start sm:ml-auto"
            onClick={() => setSelectedSnapshotId(null)}
          >
            Zpět na aktuální
          </Button>
        </div>
      )}

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
        {formatDateTime(dataToShow.meta.calculatedAt)}
      </p>
    </div>
  )
}
