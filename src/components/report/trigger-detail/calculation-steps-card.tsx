'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Calculator, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { CalculationStep } from '@/lib/triggers/debug-types'

interface CalculationStepsCardProps {
  steps: CalculationStep[]
}

export function CalculationStepsCard({ steps }: CalculationStepsCardProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  return (
    <Card className="border-dashed border-amber-500/50 bg-amber-50/50 dark:bg-amber-950/20">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calculator className="h-4 w-4 text-amber-600" />
            <CardTitle className="text-base font-medium text-amber-700 dark:text-amber-400">
              Krokový výpočet (debug)
            </CardTitle>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            aria-expanded={isExpanded}
            aria-controls="calculation-steps-content"
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
        <CardContent id="calculation-steps-content" className="space-y-4">
          {steps.map((step, i) => (
            <div key={i} className="flex gap-3">
              {/* Step number badge */}
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-amber-100 dark:bg-amber-900 flex items-center justify-center text-xs font-medium text-amber-700 dark:text-amber-300">
                {step.step}
              </span>

              {/* Step content */}
              <div className="flex-1 min-w-0 space-y-2">
                <p className="text-sm font-medium">{step.description}</p>

                {step.formula && (
                  <pre className="bg-muted/50 rounded px-2 py-1.5 text-xs font-mono overflow-x-auto">
                    {step.formula}
                  </pre>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-xs text-muted-foreground">
                  {Object.entries(step.inputs).map(([key, value]) => (
                    <div key={key} className="flex justify-between gap-2">
                      <span className="font-medium">{key}:</span>
                      <span className="font-mono">{value}</span>
                    </div>
                  ))}
                </div>

                <div className="pt-1">
                  <Badge variant="outline" className="font-mono text-xs">
                    → {step.result}
                  </Badge>
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      )}
    </Card>
  )
}
