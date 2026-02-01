'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ChevronDown, ChevronRight, Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { CategoryDimension } from '@/lib/constants/trigger-categories/basic-001'

interface CategoryDefinition {
  intro: string
  dimensions: {
    fanCount: CategoryDimension[]
    postsPerMonth: CategoryDimension[]
    interactionsPerPost: CategoryDimension[]
  }
  recommendations: Record<string, string>
}

interface CategoryDisplayProps {
  definition: CategoryDefinition
  currentKey: string
}

/**
 * Parse the category key to extract fan, post, and interaction categories.
 * Keys can have different formats:
 * - SMALL_LOW_VERY_LOW (3 parts, last part is compound)
 * - MEDIUM_SMALL_HIGH_LOW (4 parts)
 * - MEDIUM_SMALL_VERY_HIGH_LOW (5 parts)
 * - MEDIUM_SMALL_VERY_HIGH_VERY_LOW (6 parts)
 */
function parseCategoryKey(key: string): {
  fanCat: string
  postCat: string
  intCat: string
} {
  const parts = key.split('_')

  // Default fallback
  let fanCat = parts[0] ?? 'SMALL'
  let postCat = parts[1] ?? 'LOW'
  let intCat = parts.slice(2).join('_') || 'VERY_LOW'

  if (parts.length === 4) {
    // Could be MEDIUM_SMALL, MEDIUM_LARGE, or VERY_HIGH
    if (parts[0] === 'MEDIUM') {
      fanCat = `${parts[0]}_${parts[1]}`
      postCat = parts[2] ?? 'LOW'
      intCat = parts[3] ?? 'VERY_LOW'
    } else {
      fanCat = parts[0] ?? 'SMALL'
      postCat = `${parts[1]}_${parts[2]}`
      intCat = parts[3] ?? 'VERY_LOW'
    }
  } else if (parts.length === 5) {
    // MEDIUM_SMALL_VERY_HIGH_LOW or similar
    fanCat = `${parts[0]}_${parts[1]}`
    postCat = `${parts[2]}_${parts[3]}`
    intCat = parts[4] ?? 'VERY_LOW'
  } else if (parts.length === 6) {
    // MEDIUM_SMALL_VERY_HIGH_VERY_LOW
    fanCat = `${parts[0]}_${parts[1]}`
    postCat = `${parts[2]}_${parts[3]}`
    intCat = `${parts[4]}_${parts[5]}`
  }

  return { fanCat, postCat, intCat }
}

export function CategoryDisplay({ definition, currentKey }: CategoryDisplayProps) {
  const [showAll, setShowAll] = useState(false)

  // Parse current category key
  const {
    fanCat: currentFanCat,
    postCat: currentPostCat,
    intCat: currentIntCat,
  } = parseCategoryKey(currentKey)

  // Get current recommendation
  const currentRecommendation = definition.recommendations[currentKey]

  // Get current category labels
  const currentFanLabel =
    definition.dimensions.fanCount.find((d) => d.id === currentFanCat)?.label ?? currentFanCat
  const currentPostLabel =
    definition.dimensions.postsPerMonth.find((d) => d.id === currentPostCat)?.label ??
    currentPostCat
  const currentIntLabel =
    definition.dimensions.interactionsPerPost.find((d) => d.id === currentIntCat)?.label ??
    currentIntCat

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-medium">Vaše zařazení</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current category badges */}
        <div className="flex flex-wrap gap-2">
          <Badge variant="secondary" className="gap-1">
            <Check className="h-3 w-3" />
            {currentFanLabel}
          </Badge>
          <Badge variant="secondary" className="gap-1">
            <Check className="h-3 w-3" />
            {currentPostLabel}
          </Badge>
          <Badge variant="secondary" className="gap-1">
            <Check className="h-3 w-3" />
            {currentIntLabel}
          </Badge>
        </div>

        {/* Current recommendation */}
        {currentRecommendation && (
          <div className="bg-primary/5 border-primary/20 rounded-lg border p-4">
            <p className="text-sm leading-relaxed">{currentRecommendation}</p>
          </div>
        )}

        {/* Toggle to show all categories */}
        <Button variant="ghost" size="sm" onClick={() => setShowAll(!showAll)} className="gap-2">
          {showAll ? (
            <>
              <ChevronDown className="h-4 w-4" />
              Skrýt všechny kategorie
            </>
          ) : (
            <>
              <ChevronRight className="h-4 w-4" />
              Zobrazit všechny kategorie
            </>
          )}
        </Button>

        {/* All categories */}
        {showAll && (
          <div className="space-y-4 pt-2">
            {definition.dimensions.fanCount.map((fanDim) => (
              <div key={fanDim.id} className="space-y-2">
                <h4
                  className={cn(
                    'text-sm font-medium',
                    fanDim.id === currentFanCat && 'text-primary'
                  )}
                >
                  {fanDim.id === currentFanCat && '▶ '}
                  Stránky {fanDim.label}
                </h4>

                <div className="ml-4 space-y-2">
                  {definition.dimensions.postsPerMonth.map((postDim) => (
                    <div key={`${fanDim.id}_${postDim.id}`} className="space-y-1">
                      <h5
                        className={cn(
                          'text-muted-foreground text-sm',
                          fanDim.id === currentFanCat &&
                            postDim.id === currentPostCat &&
                            'text-primary font-medium'
                        )}
                      >
                        {fanDim.id === currentFanCat && postDim.id === currentPostCat && '▶ '}
                        {postDim.label}
                      </h5>

                      <div className="ml-4 space-y-1">
                        {definition.dimensions.interactionsPerPost.map((intDim) => {
                          const key = `${fanDim.id}_${postDim.id}_${intDim.id}`
                          const isActive = key === currentKey
                          const recommendation = definition.recommendations[key]

                          return (
                            <div
                              key={key}
                              className={cn(
                                'rounded-md p-2 text-sm',
                                isActive ? 'bg-primary/10 border-primary/30 border' : 'bg-muted/30'
                              )}
                            >
                              <div className="flex items-center gap-2">
                                {isActive ? (
                                  <Badge variant="default" className="bg-primary shrink-0 text-xs">
                                    VAŠE KATEGORIE
                                  </Badge>
                                ) : (
                                  <span className="text-muted-foreground text-xs">○</span>
                                )}
                                <span className={cn('text-xs', isActive && 'font-medium')}>
                                  {intDim.label}
                                </span>
                              </div>
                              {recommendation && (
                                <p
                                  className={cn(
                                    'mt-1 text-xs leading-relaxed',
                                    isActive
                                      ? 'text-foreground'
                                      : 'text-muted-foreground line-clamp-2'
                                  )}
                                >
                                  {recommendation}
                                </p>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
