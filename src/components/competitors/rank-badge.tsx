import { cn } from '@/lib/utils'
import { NullValue } from '@/components/ui/null-value'

const RANK_CONFIG = {
  1: { bgClass: 'bg-yellow-400', textClass: 'text-yellow-900' },
  2: { bgClass: 'bg-gray-300', textClass: 'text-gray-700' },
  3: { bgClass: 'bg-amber-600', textClass: 'text-white' },
} as const

interface RankBadgeProps {
  rank: number
}

export function RankBadge({ rank }: RankBadgeProps) {
  if (rank <= 0) return <NullValue />

  const config = RANK_CONFIG[rank as 1 | 2 | 3]

  if (config) {
    return (
      <span
        className={cn(
          'inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold',
          config.bgClass,
          config.textClass
        )}
        role="img"
        aria-label={`${rank}. místo`}
      >
        {rank}
      </span>
    )
  }

  return <span className="text-muted-foreground text-sm">#{rank}</span>
}
