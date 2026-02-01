import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ScoreBadge, type TriggerStatus } from '../score-badge'
import { CheckCircle2, AlertTriangle, XCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

interface TriggerDetailHeaderProps {
  name: string
  description: string
  score: number
  status: TriggerStatus
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

export function TriggerDetailHeader({
  name,
  description,
  score,
  status,
}: TriggerDetailHeaderProps) {
  const Icon = STATUS_ICONS[status]

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <Icon className={cn('mt-1 h-6 w-6 shrink-0', STATUS_ICON_COLORS[status])} />
            <div>
              <CardTitle className="text-xl">{name}</CardTitle>
              <CardDescription className="mt-1 text-base">{description}</CardDescription>
            </div>
          </div>
          <ScoreBadge score={score} size="lg" />
        </div>
      </CardHeader>
    </Card>
  )
}
