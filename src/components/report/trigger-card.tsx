import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ScoreBadge, type TriggerStatus, getStatusFromScore } from './score-badge'
import { cn } from '@/lib/utils'
import { AlertCircle, CheckCircle2, AlertTriangle, XCircle } from 'lucide-react'

export interface TriggerResult {
  id: string
  name: string
  description: string
  score: number
  recommendation?: string
  details?: {
    reason?: string
    currentValue?: string | number
    targetValue?: string | number
    context?: string
  }
}

interface TriggerCardProps {
  trigger: TriggerResult
  className?: string
}

const STATUS_ICONS: Record<TriggerStatus, typeof CheckCircle2> = {
  EXCELLENT: CheckCircle2,
  GOOD: CheckCircle2,
  NEEDS_IMPROVEMENT: AlertTriangle,
  CRITICAL: XCircle,
}

const STATUS_ICON_COLORS: Record<TriggerStatus, string> = {
  EXCELLENT: 'text-green-500',
  GOOD: 'text-blue-500',
  NEEDS_IMPROVEMENT: 'text-amber-500',
  CRITICAL: 'text-red-500',
}

export function TriggerCard({ trigger, className }: TriggerCardProps) {
  const status = getStatusFromScore(trigger.score)
  const Icon = STATUS_ICONS[status]

  return (
    <Card className={cn('relative overflow-hidden', className)}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <Icon className={cn('mt-0.5 h-5 w-5 shrink-0', STATUS_ICON_COLORS[status])} />
            <div>
              <CardTitle className="text-base font-medium">{trigger.name}</CardTitle>
              <CardDescription className="mt-1">{trigger.description}</CardDescription>
            </div>
          </div>
          <ScoreBadge score={trigger.score} size="sm" showLabel={false} />
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {trigger.details?.currentValue !== undefined && (
          <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
            <div>
              <span className="text-muted-foreground">Aktuální: </span>
              <span className="font-medium">{trigger.details.currentValue}</span>
            </div>
            {trigger.details.targetValue !== undefined && (
              <div>
                <span className="text-muted-foreground">Cíl: </span>
                <span className="font-medium">{trigger.details.targetValue}</span>
              </div>
            )}
          </div>
        )}

        {trigger.recommendation && status !== 'EXCELLENT' && (
          <div className="bg-muted/50 rounded-md p-3">
            <div className="flex gap-2">
              <AlertCircle className="text-muted-foreground mt-0.5 h-4 w-4 shrink-0" />
              <p className="text-muted-foreground text-sm">{trigger.recommendation}</p>
            </div>
          </div>
        )}

        {trigger.details?.context && (
          <p className="text-muted-foreground text-xs">{trigger.details.context}</p>
        )}

        {trigger.details?.reason === 'INSUFFICIENT_DATA' && (
          <p className="text-muted-foreground text-xs italic">
            * Nedostatek dat pro přesné vyhodnocení
          </p>
        )}
      </CardContent>
    </Card>
  )
}
