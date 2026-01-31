import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import type { TrendReliabilityInfo } from '@/types/trends'

const RELIABILITY_CONFIG = {
  high: { label: 'Spolehlivé', bgClass: 'bg-green-50', textClass: 'text-green-700' },
  medium: { label: 'Orientační', bgClass: 'bg-blue-50', textClass: 'text-blue-700' },
  low: { label: 'Omezené', bgClass: 'bg-amber-50', textClass: 'text-amber-700' },
  insufficient: { label: 'Nedostatek dat', bgClass: 'bg-red-50', textClass: 'text-red-700' },
} as const

interface ReliabilityBadgeProps {
  reliability: TrendReliabilityInfo
}

export function ReliabilityBadge({ reliability }: ReliabilityBadgeProps) {
  const config = RELIABILITY_CONFIG[reliability.level]

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge
            variant="outline"
            className={cn('cursor-help border-0', config.bgClass, config.textClass)}
          >
            {config.label}
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <p>{reliability.message}</p>
          <p className="text-muted-foreground mt-1 text-xs">
            Počet analýz: {reliability.snapshotCount}
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
