'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Database, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { BenchmarkContext } from '@/lib/triggers/debug-types'

export function BenchmarkContextCard({ context }: { context: BenchmarkContext }) {
  const [isExpanded, setIsExpanded] = useState(false)

  return (
    <Card className="border-dashed border-amber-500/50 bg-amber-50/50 dark:bg-amber-950/20">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Database className="h-4 w-4 text-amber-600" />
            <CardTitle className="text-base font-medium text-amber-700 dark:text-amber-400">
              Kontext benchmarku (debug)
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
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            <div className="space-y-1">
              <dt className="text-muted-foreground text-xs">Obor:</dt>
              <dd className="font-medium truncate" title={context.industryName}>
                {context.industryName}
              </dd>
            </div>
            <div className="space-y-1">
              <dt className="text-muted-foreground text-xs">Kód oboru:</dt>
              <dd className="font-mono text-xs">{context.industryCode}</dd>
            </div>
            <div className="space-y-1 sm:col-span-2">
              <dt className="text-muted-foreground text-xs">Zdroj:</dt>
              <dd>
                <Badge variant={context.source === 'database' ? 'default' : 'outline'}>
                  {context.source === 'database' ? 'Databáze' : 'Výchozí hodnoty'}
                </Badge>
              </dd>
            </div>
          </dl>

          <Separator />

          <div className="space-y-2">
            <h4 className="text-sm font-medium">Hodnoty benchmarku:</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {Object.entries(context.values).map(([key, value]) => (
                <div key={key} className="flex justify-between items-center gap-2 text-sm">
                  <span className="text-muted-foreground truncate">{key}</span>
                  <span className="font-mono font-medium flex-shrink-0">
                    {typeof value === 'number' ? value.toFixed(1) : value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  )
}
