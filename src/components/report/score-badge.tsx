import { cn } from '@/lib/utils'

export type TriggerStatus = 'EXCELLENT' | 'GOOD' | 'NEEDS_IMPROVEMENT' | 'CRITICAL'

interface ScoreBadgeProps {
  score: number
  size?: 'sm' | 'md' | 'lg'
  showLabel?: boolean
  className?: string
}

// Score thresholds for status mapping
// 85-100 = EXCELLENT
// 70-84  = GOOD
// 40-69  = NEEDS_IMPROVEMENT
// 0-39   = CRITICAL
export function getStatusFromScore(score: number): TriggerStatus {
  if (score >= 85) return 'EXCELLENT'
  if (score >= 70) return 'GOOD'
  if (score >= 40) return 'NEEDS_IMPROVEMENT'
  return 'CRITICAL'
}

const STATUS_CONFIG: Record<TriggerStatus, { label: string; bgClass: string; textClass: string }> =
  {
    EXCELLENT: {
      label: 'Výborné',
      bgClass: 'bg-green-100 dark:bg-green-900/30',
      textClass: 'text-green-700 dark:text-green-400',
    },
    GOOD: {
      label: 'Dobré',
      bgClass: 'bg-blue-100 dark:bg-blue-900/30',
      textClass: 'text-blue-700 dark:text-blue-400',
    },
    NEEDS_IMPROVEMENT: {
      label: 'Ke zlepšení',
      bgClass: 'bg-amber-100 dark:bg-amber-900/30',
      textClass: 'text-amber-700 dark:text-amber-400',
    },
    CRITICAL: {
      label: 'Kritické',
      bgClass: 'bg-red-100 dark:bg-red-900/30',
      textClass: 'text-red-700 dark:text-red-400',
    },
  }

const SIZE_CLASSES = {
  sm: 'px-2 py-0.5 text-xs',
  md: 'px-2.5 py-1 text-sm',
  lg: 'px-3 py-1.5 text-base',
}

export function ScoreBadge({ score, size = 'md', showLabel = true, className }: ScoreBadgeProps) {
  const status = getStatusFromScore(score)
  const config = STATUS_CONFIG[status]

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
  const config = STATUS_CONFIG[status]

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
