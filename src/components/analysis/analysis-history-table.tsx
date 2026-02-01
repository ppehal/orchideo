'use client'

import Link from 'next/link'
import Image from 'next/image'
import { AlertCircle, ExternalLink } from 'lucide-react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { NullValue } from '@/components/ui/null-value'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { ANALYSIS_STATUS_CONFIG } from '@/lib/constants/analysis-progress'
import { getScoreColor, STATUS_COLORS } from '@/lib/constants/color-schemes'
import { formatDateTime } from '@/lib/utils/date-utils'
import { cn } from '@/lib/utils'
import type { AnalysisHistoryItem } from '@/lib/actions/analysis-history'

interface AnalysisHistoryTableProps {
  analyses: AnalysisHistoryItem[]
}

function isExpired(expiresAt: Date | null): boolean {
  if (!expiresAt) return false
  return new Date(expiresAt) < new Date()
}

function isInProgress(status: string): boolean {
  return ['PENDING', 'COLLECTING_DATA', 'ANALYZING'].includes(status)
}

export function AnalysisHistoryTable({ analyses }: AnalysisHistoryTableProps) {
  return (
    <div className="hidden overflow-x-auto md:block">
      <Table className="min-w-[800px]">
        <TableHeader>
          <TableRow>
            <TableHead className="min-w-[200px]">Stránka</TableHead>
            <TableHead className="w-24 text-right">Skóre</TableHead>
            <TableHead className="w-32">Stav</TableHead>
            <TableHead className="w-40">Vytvořeno</TableHead>
            <TableHead className="w-32 text-right">Akce</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {analyses.map((analysis) => {
            const expired = isExpired(analysis.expires_at)
            const inProgress = isInProgress(analysis.status)
            const statusConfig = ANALYSIS_STATUS_CONFIG[analysis.status]
            const scoreColor = getScoreColor(
              analysis.overall_score !== null ? analysis.overall_score / 100 : null
            )

            return (
              <TableRow key={analysis.id} className={cn(expired && 'opacity-60')}>
                {/* Page */}
                <TableCell>
                  <div className="flex items-center gap-3">
                    {analysis.page_picture ? (
                      <Image
                        src={analysis.page_picture}
                        alt=""
                        width={32}
                        height={32}
                        className="h-8 w-8 rounded-full object-cover"
                        unoptimized
                      />
                    ) : (
                      <div className="bg-muted h-8 w-8 rounded-full" />
                    )}
                    <div className="min-w-0">
                      <div className="truncate font-medium">
                        {analysis.page_name || 'Neznámá stránka'}
                      </div>
                      {!analysis.fb_page_id && (
                        <div className="text-muted-foreground text-xs">Stránka odpojena</div>
                      )}
                    </div>
                  </div>
                </TableCell>

                {/* Score */}
                <TableCell className="text-right">
                  {analysis.overall_score !== null ? (
                    <span className={cn('font-semibold', scoreColor.textClass)}>
                      {analysis.overall_score}
                    </span>
                  ) : (
                    <NullValue />
                  )}
                </TableCell>

                {/* Status */}
                <TableCell>
                  <div className="flex items-center gap-2">
                    {expired ? (
                      <Badge
                        className={cn(
                          STATUS_COLORS.neutral.bgClass,
                          STATUS_COLORS.neutral.textClass
                        )}
                      >
                        Vypršelo
                      </Badge>
                    ) : (
                      <Badge className={cn(statusConfig.bgClass, statusConfig.textClass)}>
                        {statusConfig.label}
                      </Badge>
                    )}
                    {analysis.status === 'FAILED' && analysis.error_message && (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button type="button" className="cursor-help">
                              <AlertCircle className="text-destructive h-4 w-4" />
                              <span className="sr-only">Zobrazit chybu</span>
                            </button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="max-w-xs">{analysis.error_message}</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
                  </div>
                </TableCell>

                {/* Created at */}
                <TableCell className="text-muted-foreground">
                  {formatDateTime(analysis.created_at)}
                </TableCell>

                {/* Actions */}
                <TableCell className="text-right">
                  {analysis.status === 'COMPLETED' && !expired ? (
                    <Button asChild size="sm" variant="outline">
                      <Link href={`/report/${analysis.public_token}`}>
                        Zobrazit
                        <ExternalLink className="ml-1 h-3 w-3" />
                      </Link>
                    </Button>
                  ) : analysis.status === 'COMPLETED' && expired ? (
                    <Button asChild size="sm" variant="outline">
                      <Link href="/analyze">Nová analýza</Link>
                    </Button>
                  ) : analysis.status === 'FAILED' ? (
                    <Button asChild size="sm" variant="outline">
                      <Link href="/analyze">Zkusit znovu</Link>
                    </Button>
                  ) : inProgress ? (
                    <Button size="sm" variant="outline" disabled>
                      Probíhá...
                    </Button>
                  ) : null}
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}
