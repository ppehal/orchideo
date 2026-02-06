'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { BarChart3, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ThresholdPosition } from '@/lib/triggers/debug-types'

export function ThresholdVisualizationCard({ position }: { position: ThresholdPosition }) {
  const [isExpanded, setIsExpanded] = useState(false)

  // Ensure value doesn't overflow edges
  const clampedValue = Math.min(Math.max(position.value, 2), 98)

  return (
    <Card className="border-dashed border-amber-500/50 bg-amber-50/50 dark:bg-amber-950/20">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-amber-600" />
            <CardTitle className="text-base font-medium text-amber-700 dark:text-amber-400">
              Pozice skóre (debug)
            </CardTitle>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            aria-expanded={isExpanded}
            className="gap-1 text-amber-700"
          >
            <ChevronDown
              className={cn('h-4 w-4 transition-transform', !isExpanded && '-rotate-90')}
            />
            {isExpanded ? 'Skrýt' : 'Zobrazit'}
          </Button>
        </div>
      </CardHeader>
      {isExpanded && (
        <CardContent className="space-y-4">
          {/* Progress bar with segments */}
          <div
            role="progressbar"
            aria-label="Pozice skóre na škále kvality"
            aria-valuenow={position.value}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuetext={`${position.value} bodů`}
            className="bg-muted relative h-8 w-full min-w-[280px] overflow-hidden rounded-lg"
          >
            {position.ranges.map((range) => (
              <div
                key={range.status}
                aria-label={`${range.label}: ${range.min}-${range.max} bodů`}
                className={cn(
                  'absolute flex h-full items-center px-2',
                  range.status === 'CRITICAL' && 'bg-red-500/30 dark:bg-red-900/30',
                  range.status === 'NEEDS_IMPROVEMENT' && 'bg-amber-500/30 dark:bg-amber-900/30',
                  range.status === 'GOOD' && 'bg-blue-500/30 dark:bg-blue-900/30',
                  range.status === 'EXCELLENT' && 'bg-green-500/30 dark:bg-green-900/30'
                )}
                style={{
                  left: `${range.min}%`,
                  width: `${range.max - range.min}%`,
                }}
              >
                <span className="text-foreground/70 text-[10px] font-medium sm:text-xs">
                  {range.label}
                </span>
              </div>
            ))}

            {/* Current value marker */}
            <div
              className="bg-primary absolute top-0 bottom-0 z-10 w-0.5"
              style={{ left: `${clampedValue}%` }}
            >
              <div className="absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap">
                <Badge className="font-mono text-xs">{position.value}</Badge>
              </div>
            </div>
          </div>

          {/* Legend */}
          <div className="grid grid-cols-1 gap-2 text-xs sm:grid-cols-2">
            {position.ranges.map((range) => (
              <div key={range.status} className="flex items-center gap-2">
                <div
                  className={cn(
                    'h-3 w-3 flex-shrink-0 rounded',
                    range.status === 'CRITICAL' && 'bg-red-500/30',
                    range.status === 'NEEDS_IMPROVEMENT' && 'bg-amber-500/30',
                    range.status === 'GOOD' && 'bg-blue-500/30',
                    range.status === 'EXCELLENT' && 'bg-green-500/30'
                  )}
                />
                <span className="truncate">
                  {range.label}: {range.min}-{range.max}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      )}
    </Card>
  )
}
