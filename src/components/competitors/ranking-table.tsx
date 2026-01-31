'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { NullValue } from '@/components/ui/null-value'
import { METRIC_LABELS_SHORT, METRIC_KEYS, formatMetricValue } from '@/lib/constants/metrics'
import { RankBadge } from './rank-badge'

interface PageMetrics {
  pageId: string
  pageName: string
  isPrimary: boolean
  metrics: {
    overallScore: number | null
    engagementRate: number | null
    postsPerWeek: number | null
    avgReactions: number | null
    avgComments: number | null
    avgShares: number | null
  }
}

interface RankingTableProps {
  pages: PageMetrics[]
  sortBy: keyof PageMetrics['metrics']
}

export function RankingTable({ pages, sortBy }: RankingTableProps) {
  // Sort pages by the selected metric (descending)
  const sortedPages = [...pages].sort((a, b) => {
    const aVal = a.metrics[sortBy]
    const bVal = b.metrics[sortBy]
    if (aVal === null && bVal === null) return 0
    if (aVal === null) return 1
    if (bVal === null) return -1
    return bVal - aVal
  })

  return (
    <>
      {/* Mobile card layout */}
      <div className="space-y-3 md:hidden">
        {sortedPages.map((page, index) => (
          <Card key={page.pageId}>
            <CardHeader className="flex-row items-center gap-3 pb-2">
              <RankBadge rank={index + 1} />
              <div className="min-w-0 flex-1">
                <CardTitle className="truncate text-base">
                  {page.isPrimary && <span className="text-primary mr-1">*</span>}
                  {page.pageName}
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                {METRIC_KEYS.map((key) => (
                  <div key={key} className="flex justify-between">
                    <span className="text-muted-foreground">{METRIC_LABELS_SHORT[key]}</span>
                    <span className="font-medium">
                      {page.metrics[key] !== null ? (
                        formatMetricValue(key, page.metrics[key])
                      ) : (
                        <NullValue />
                      )}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Desktop table layout */}
      <div className="hidden overflow-x-auto md:block">
        <Table className="min-w-[900px]">
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">#</TableHead>
              <TableHead className="min-w-[180px]">Stránka</TableHead>
              {METRIC_KEYS.map((key) => (
                <TableHead key={key} className="w-24 text-right">
                  {METRIC_LABELS_SHORT[key]}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedPages.map((page, index) => (
              <TableRow key={page.pageId}>
                <TableCell>
                  <RankBadge rank={index + 1} />
                </TableCell>
                <TableCell className="font-medium">
                  {page.isPrimary && <span className="text-primary mr-1">*</span>}
                  {page.pageName}
                </TableCell>
                {METRIC_KEYS.map((key) => (
                  <TableCell key={key} className="text-right">
                    {page.metrics[key] !== null ? (
                      formatMetricValue(key, page.metrics[key])
                    ) : (
                      <NullValue />
                    )}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </>
  )
}
