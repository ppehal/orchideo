import { cn } from '@/lib/utils'
import {
  type TriggerStatus,
  TRIGGER_STATUS_CONFIG,
  getStatusFromScore,
} from '@/lib/constants/trigger-status'

interface ScoreBadgeProps {
  score: number
  size?: 'sm' | 'md' | 'lg'
  showLabel?: boolean
  className?: string
}

export { type TriggerStatus, getStatusFromScore }

const SIZE_CLASSES = {
  sm: 'px-2 py-0.5 text-xs',
  md: 'px-2.5 py-1 text-sm',
  lg: 'px-3 py-1.5 text-base',
}

export function ScoreBadge({ score, size = 'md', showLabel = true, className }: ScoreBadgeProps) {
  const status = getStatusFromScore(score)
  const config = TRIGGER_STATUS_CONFIG[status]

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full font-medium',
        config.bgClass,
        config.textClass,
        SIZE_CLASSES[size],
        className
      )}
    >
      <span className="font-semibold">{score}</span>
      {showLabel && <span className="text-current/80">• {config.label}</span>}
    </span>
  )
}

export function StatusBadge({
  status,
  size = 'md',
  className,
}: {
  status: TriggerStatus
  size?: 'sm' | 'md' | 'lg'
  className?: string
}) {
  const config = TRIGGER_STATUS_CONFIG[status]

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full font-medium',
        config.bgClass,
        config.textClass,
        SIZE_CLASSES[size],
        className
      )}
    >
      {config.label}
    </span>
  )
}
