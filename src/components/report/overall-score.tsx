import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { getStatusFromScore, type TriggerStatus } from './score-badge'

interface OverallScoreProps {
  score: number
  className?: string
}

const STATUS_CONFIG: Record<TriggerStatus, { label: string; color: string; bgColor: string }> = {
  EXCELLENT: {
    label: 'Výborné',
    color: 'text-green-600 dark:text-green-400',
    bgColor: 'from-green-500/20 to-green-500/5',
  },
  GOOD: {
    label: 'Dobré',
    color: 'text-blue-600 dark:text-blue-400',
    bgColor: 'from-blue-500/20 to-blue-500/5',
  },
  NEEDS_IMPROVEMENT: {
    label: 'Ke zlepšení',
    color: 'text-amber-600 dark:text-amber-400',
    bgColor: 'from-amber-500/20 to-amber-500/5',
  },
  CRITICAL: {
    label: 'Kritické',
    color: 'text-red-600 dark:text-red-400',
    bgColor: 'from-red-500/20 to-red-500/5',
  },
}

export function OverallScore({ score, className }: OverallScoreProps) {
  const status = getStatusFromScore(score)
  const config = STATUS_CONFIG[status]

  return (
    <Card className={cn('overflow-hidden', className)}>
      <div className={cn('bg-gradient-to-b p-8', config.bgColor)}>
        <CardContent className="flex flex-col items-center justify-center p-0">
          <p className="text-muted-foreground mb-2 text-sm font-medium tracking-wide uppercase">
            Celkové skóre
          </p>
          <div className="flex items-start gap-1">
            <span className={cn('text-7xl font-bold tabular-nums', config.color)}>{score}</span>
            <span className="text-muted-foreground mt-2 text-lg sm:text-2xl">/100</span>
          </div>
          <p className={cn('mt-2 text-xl font-semibold', config.color)}>{config.label}</p>
        </CardContent>
      </div>
    </Card>
  )
}
