import { TrendingUp, TrendingDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { TrendDirection } from '@/types/trends'

interface TrendIndicatorProps {
  direction: TrendDirection
  changePercent: number | null
  isSignificant: boolean
}

export function TrendIndicator({ direction, changePercent, isSignificant }: TrendIndicatorProps) {
  if (!isSignificant || changePercent === null) {
    return <span className="text-muted-foreground text-sm">stabilní</span>
  }

  const isUp = direction === 'up'

  return (
    <span
      className={cn(
        'flex items-center text-sm font-medium',
        isUp ? 'text-green-600' : 'text-red-600'
      )}
    >
      {isUp ? <TrendingUp className="mr-1 h-4 w-4" /> : <TrendingDown className="mr-1 h-4 w-4" />}
      {isUp ? '+' : ''}
      {changePercent.toFixed(1)}%
    </span>
  )
}
