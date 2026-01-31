'use client'

import * as React from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { TrendingUp } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { Skeleton } from '@/components/ui/skeleton'
import { PageSelector, ReliabilityBadge, TrendCard } from '@/components/trends'
import type { TrendResponse } from '@/types/trends'

interface Page {
  id: string
  name: string
}

interface TrendsClientProps {
  pages: Page[]
}

const METRIC_KEYS = [
  'overallScore',
  'engagementRate',
  'postsPerWeek',
  'avgReactions',
  'avgComments',
  'avgShares',
] as const

export function TrendsClient({ pages }: TrendsClientProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const pageIdFromUrl = searchParams.get('page')

  const [selectedPageId, setSelectedPageId] = React.useState<string | null>(
    pageIdFromUrl ?? pages[0]?.id ?? null
  )
  const [trends, setTrends] = React.useState<TrendResponse | null>(null)
  const [isLoading, setIsLoading] = React.useState(false)

  const handlePageChange = React.useCallback(
    (pageId: string) => {
      setSelectedPageId(pageId)
      router.replace(`/trends?page=${pageId}`, { scroll: false })
    },
    [router]
  )

  // Fetch trends when page changes
  React.useEffect(() => {
    if (!selectedPageId) return

    let cancelled = false

    async function fetchTrends() {
      setIsLoading(true)

      try {
        const res = await fetch(`/api/pages/${selectedPageId}/trends`, {
          signal: AbortSignal.timeout(15000),
        })

        if (!res.ok) {
          throw new Error('Failed to fetch trends')
        }

        const data = (await res.json()) as TrendResponse

        if (!cancelled) {
          setTrends(data)
        }
      } catch (error) {
        if (!cancelled) {
          console.error('[TrendsClient] fetch failed', error)
          toast.error('Nepodařilo se načíst trendy')
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false)
        }
      }
    }

    fetchTrends()

    return () => {
      cancelled = true
    }
  }, [selectedPageId])

  if (pages.length === 0) {
    return (
      <EmptyState
        icon={<TrendingUp className="h-12 w-12" />}
        title="Žádné stránky"
        description="Pro zobrazení trendů nejdříve analyzujte alespoň jednu Facebook stránku."
        action={
          <Button asChild>
            <Link href="/analyze">Analyzovat stránku</Link>
          </Button>
        }
      />
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <PageSelector
          pages={pages}
          selectedPageId={selectedPageId}
          onPageChange={handlePageChange}
        />
        {trends && <ReliabilityBadge reliability={trends.reliability} />}
      </div>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-40 w-full" />
          ))}
        </div>
      ) : trends?.reliability.level === 'insufficient' ? (
        <EmptyState
          icon={<TrendingUp className="h-12 w-12" />}
          title="Nedostatek dat"
          description="Pro zobrazení trendů je potřeba alespoň 2 analýzy."
          action={
            <Button asChild>
              <Link href="/analyze">Spustit analýzu</Link>
            </Button>
          }
        />
      ) : trends ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {METRIC_KEYS.map((key) => (
            <TrendCard key={key} metricKey={key} data={trends.trends[key]} />
          ))}
        </div>
      ) : null}
    </div>
  )
}
