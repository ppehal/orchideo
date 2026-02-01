'use client'

import Link from 'next/link'
import Image from 'next/image'
import { AlertCircle, ExternalLink } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { NullValue } from '@/components/ui/null-value'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { ANALYSIS_STATUS_CONFIG } from '@/lib/constants/analysis-progress'
import { getScoreColor, STATUS_COLORS } from '@/lib/constants/color-schemes'
import { formatDateTime } from '@/lib/utils/date-utils'
import { cn } from '@/lib/utils'
import type { AnalysisHistoryItem } from '@/lib/actions/analysis-history'

interface AnalysisHistoryCardsProps {
  analyses: AnalysisHistoryItem[]
}

function isExpired(expiresAt: Date | null): boolean {
  if (!expiresAt) return false
  return new Date(expiresAt) < new Date()
}

function isInProgress(status: string): boolean {
  return ['PENDING', 'COLLECTING_DATA', 'ANALYZING'].includes(status)
}

export function AnalysisHistoryCards({ analyses }: AnalysisHistoryCardsProps) {
  return (
    <div className="space-y-4 md:hidden">
      {analyses.map((analysis) => {
        const expired = isExpired(analysis.expires_at)
        const inProgress = isInProgress(analysis.status)
        const statusConfig = ANALYSIS_STATUS_CONFIG[analysis.status]
        const scoreColor = getScoreColor(
          analysis.overall_score !== null ? analysis.overall_score / 100 : null
        )

        return (
          <Card key={analysis.id} className={cn(expired && 'opacity-60')}>
            <CardHeader className="flex-row items-center gap-3 pb-2">
              {/* Page picture */}
              {analysis.page_picture ? (
                <Image
                  src={analysis.page_picture}
                  alt=""
                  width={40}
                  height={40}
                  className="h-10 w-10 rounded-full object-cover"
                  unoptimized
                />
              ) : (
                <div className="bg-muted h-10 w-10 rounded-full" />
              )}

              {/* Page name + status */}
              <div className="min-w-0 flex-1">
                <CardTitle className="truncate text-base">
                  {analysis.page_name || 'Neznámá stránka'}
                </CardTitle>
                <div className="mt-1 flex items-center gap-2">
                  {expired ? (
                    <Badge
                      className={cn(STATUS_COLORS.neutral.bgClass, STATUS_COLORS.neutral.textClass)}
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
              </div>

              {/* Score */}
              {analysis.overall_score !== null ? (
                <span className={cn('text-2xl font-bold', scoreColor.textClass)}>
                  {analysis.overall_score}
                </span>
              ) : (
                <NullValue className="text-2xl" />
              )}
            </CardHeader>

            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-muted-foreground text-sm">
                    {formatDateTime(analysis.created_at)}
                  </div>
                  {!analysis.fb_page_id && (
                    <div className="text-muted-foreground text-xs">Stránka odpojena</div>
                  )}
                </div>

                {/* Actions */}
                {analysis.status === 'COMPLETED' && !expired ? (
                  <Button asChild size="sm">
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
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
