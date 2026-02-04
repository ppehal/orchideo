import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ScoreBadge, type TriggerStatus } from '../score-badge'
import { cn } from '@/lib/utils'
import {
  TRIGGER_STATUS_ICONS,
  TRIGGER_STATUS_ICON_COLORS,
} from '@/lib/constants/trigger-status'

interface TriggerDetailHeaderProps {
  name: string
  description: string
  score: number
  status: TriggerStatus
}

export function TriggerDetailHeader({
  name,
  description,
  score,
  status,
}: TriggerDetailHeaderProps) {
  const Icon = TRIGGER_STATUS_ICONS[status]

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <Icon className={cn('mt-1 h-6 w-6 shrink-0', TRIGGER_STATUS_ICON_COLORS[status])} />
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
