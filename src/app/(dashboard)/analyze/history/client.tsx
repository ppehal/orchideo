'use client'

import * as React from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { FileText, Search } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { AnalysisFilters, AnalysisHistoryTable, AnalysisHistoryCards } from '@/components/analysis'
import type { AnalysisHistoryItem, UserPage } from '@/lib/actions/analysis-history'

interface AnalysisHistoryClientProps {
  initialAnalyses: AnalysisHistoryItem[]
  pages: UserPage[]
  initialFilters: {
    status: string
    pageId: string
    sort: string
  }
}

export function AnalysisHistoryClient({
  initialAnalyses,
  pages,
  initialFilters,
}: AnalysisHistoryClientProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  // Read from URL or use initial values
  const status = searchParams.get('status') ?? initialFilters.status
  const pageId = searchParams.get('page') ?? initialFilters.pageId
  const sort = searchParams.get('sort') ?? initialFilters.sort

  const hasActiveFilters = status !== 'ALL' || pageId !== 'ALL'

  const updateFilters = React.useCallback(
    (updates: { status?: string; page?: string; sort?: string }) => {
      const params = new URLSearchParams(searchParams.toString())

      Object.entries(updates).forEach(([key, value]) => {
        if (value && value !== 'ALL' && value !== 'newest') {
          params.set(key, value)
        } else {
          params.delete(key)
        }
      })

      const queryString = params.toString()
      router.replace(queryString ? `?${queryString}` : '/analyze/history', {
        scroll: false,
      })
    },
    [router, searchParams]
  )

  const handleStatusChange = React.useCallback(
    (newStatus: string) => {
      updateFilters({ status: newStatus })
    },
    [updateFilters]
  )

  const handlePageChange = React.useCallback(
    (newPageId: string) => {
      updateFilters({ page: newPageId })
    },
    [updateFilters]
  )

  const handleSortChange = React.useCallback(
    (newSort: string) => {
      updateFilters({ sort: newSort })
    },
    [updateFilters]
  )

  const clearFilters = React.useCallback(() => {
    router.replace('/analyze/history', { scroll: false })
  }, [router])

  // Empty state: no analyses at all
  if (initialAnalyses.length === 0 && !hasActiveFilters) {
    return (
      <EmptyState
        icon={<FileText className="h-12 w-12" />}
        title="Žádné analýzy"
        description="Zatím jste neprovedli žádnou analýzu."
        action={
          <Button asChild>
            <Link href="/analyze">Spustit první analýzu</Link>
          </Button>
        }
      />
    )
  }

  // Empty state: no results for current filters
  if (initialAnalyses.length === 0 && hasActiveFilters) {
    return (
      <div className="space-y-6">
        <AnalysisFilters
          pages={pages}
          selectedStatus={status}
          selectedPageId={pageId}
          selectedSort={sort}
          onStatusChange={handleStatusChange}
          onPageChange={handlePageChange}
          onSortChange={handleSortChange}
        />

        <EmptyState
          icon={<Search className="h-12 w-12" />}
          title="Žádné výsledky"
          description="Pro zadané filtry nebyly nalezeny žádné analýzy."
          action={
            <Button variant="outline" onClick={clearFilters}>
              Zrušit filtry
            </Button>
          }
        />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <AnalysisFilters
        pages={pages}
        selectedStatus={status}
        selectedPageId={pageId}
        selectedSort={sort}
        onStatusChange={handleStatusChange}
        onPageChange={handlePageChange}
        onSortChange={handleSortChange}
      />

      <div role="region" aria-label="Seznam analýz" aria-live="polite">
        <AnalysisHistoryTable analyses={initialAnalyses} />
        <AnalysisHistoryCards analyses={initialAnalyses} />
      </div>
    </div>
  )
}
