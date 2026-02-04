'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ChevronDown, ChevronRight, Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { RecommendationCard } from './recommendation-card'

interface CategoryDimension {
  id: string
  label: string
  min?: number
  max?: number
}

interface CategoryDefinition {
  intro: string
  dimensions: Record<string, CategoryDimension[]>
  recommendations: Record<string, string>
}

interface CategoryDisplayProps {
  definition: CategoryDefinition
  currentKey: string
}

/**
 * Detects the structure type based on dimension keys
 */
function getStructureType(
  dimensions: Record<string, CategoryDimension[]>
): '3d' | '2d' | '1d' | 'unknown' {
  const keys = Object.keys(dimensions)

  // BASIC_001: fanCount, postsPerMonth, interactionsPerPost
  if (
    keys.includes('fanCount') &&
    keys.includes('postsPerMonth') &&
    keys.includes('interactionsPerPost')
  ) {
    return '3d'
  }

  // BASIC_005: fanCount, reachQuality
  if (keys.includes('fanCount') && keys.includes('reachQuality')) {
    return '2d'
  }

  // Generic detection by number of dimensions
  if (keys.length === 3) return '3d'
  if (keys.length === 2) return '2d'
  if (keys.length === 1) return '1d'

  return 'unknown'
}

/**
 * Parse 3D category key (BASIC_001 style)
 * Keys: SMALL_LOW_VERY_LOW, MEDIUM_SMALL_HIGH_LOW, etc.
 */
function parse3DCategoryKey(key: string): { dim1: string; dim2: string; dim3: string } {
  const parts = key.split('_')

  let dim1 = parts[0] ?? 'SMALL'
  let dim2 = parts[1] ?? 'LOW'
  let dim3 = parts.slice(2).join('_') || 'VERY_LOW'

  if (parts.length === 4) {
    if (parts[0] === 'MEDIUM') {
      dim1 = `${parts[0]}_${parts[1]}`
      dim2 = parts[2] ?? 'LOW'
      dim3 = parts[3] ?? 'VERY_LOW'
    } else {
      dim1 = parts[0] ?? 'SMALL'
      dim2 = `${parts[1]}_${parts[2]}`
      dim3 = parts[3] ?? 'VERY_LOW'
    }
  } else if (parts.length === 5) {
    dim1 = `${parts[0]}_${parts[1]}`
    dim2 = `${parts[2]}_${parts[3]}`
    dim3 = parts[4] ?? 'VERY_LOW'
  } else if (parts.length === 6) {
    dim1 = `${parts[0]}_${parts[1]}`
    dim2 = `${parts[2]}_${parts[3]}`
    dim3 = `${parts[4]}_${parts[5]}`
  }

  return { dim1, dim2, dim3 }
}

/**
 * Parse 2D category key (BASIC_005 style)
 * Keys: SMALL, MEDIUM_SMALL_HIGH, MEDIUM_SMALL_LOW, LARGE_HIGH, etc.
 */
function parse2DCategoryKey(
  key: string,
  dim1Options: CategoryDimension[]
): { dim1: string; dim2: string | null } {
  // Check if key matches any dim1 option exactly (e.g., "SMALL" for fallback)
  const exactMatch = dim1Options.find((d) => d.id === key)
  if (exactMatch) {
    return { dim1: key, dim2: null }
  }

  // Try to find the longest matching dim1 prefix
  const sortedOptions = [...dim1Options].sort((a, b) => b.id.length - a.id.length)
  for (const opt of sortedOptions) {
    if (key.startsWith(opt.id + '_')) {
      const dim2 = key.slice(opt.id.length + 1)
      return { dim1: opt.id, dim2 }
    }
  }

  // Fallback: split by last underscore
  const lastUnderscore = key.lastIndexOf('_')
  if (lastUnderscore > 0) {
    return { dim1: key.slice(0, lastUnderscore), dim2: key.slice(lastUnderscore + 1) }
  }

  return { dim1: key, dim2: null }
}

/**
 * 3D Category Display (BASIC_001 style)
 */
function CategoryDisplay3D({
  definition,
  currentKey,
}: {
  definition: CategoryDefinition
  currentKey: string
}) {
  const [showAll, setShowAll] = useState(false)

  const dims = definition.dimensions
  const dim1Key = Object.keys(dims)[0] ?? 'fanCount'
  const dim2Key = Object.keys(dims)[1] ?? 'postsPerMonth'
  const dim3Key = Object.keys(dims)[2] ?? 'interactionsPerPost'

  const dim1Options = dims[dim1Key] ?? []
  const dim2Options = dims[dim2Key] ?? []
  const dim3Options = dims[dim3Key] ?? []

  const { dim1: currentDim1, dim2: currentDim2, dim3: currentDim3 } = parse3DCategoryKey(currentKey)

  const currentRecommendation = definition.recommendations[currentKey]

  const currentDim1Label = dim1Options.find((d) => d.id === currentDim1)?.label ?? currentDim1
  const currentDim2Label = dim2Options.find((d) => d.id === currentDim2)?.label ?? currentDim2
  const currentDim3Label = dim3Options.find((d) => d.id === currentDim3)?.label ?? currentDim3

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
            {currentDim1Label}
          </Badge>
          <Badge variant="secondary" className="gap-1">
            <Check className="h-3 w-3" />
            {currentDim2Label}
          </Badge>
          <Badge variant="secondary" className="gap-1">
            <Check className="h-3 w-3" />
            {currentDim3Label}
          </Badge>
        </div>

        {/* Current recommendation */}
        {currentRecommendation && <RecommendationCard text={currentRecommendation} />}

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

        {/* All categories - 3D nested structure */}
        {showAll && (
          <div className="space-y-4 pt-2">
            {dim1Options.map((d1) => (
              <div key={d1.id} className="space-y-2">
                <h4 className={cn('text-sm font-medium', d1.id === currentDim1 && 'text-primary')}>
                  {d1.id === currentDim1 && '▶ '}
                  Stránky {d1.label}
                </h4>

                <div className="ml-4 space-y-2">
                  {dim2Options.map((d2) => (
                    <div key={`${d1.id}_${d2.id}`} className="space-y-1">
                      <h5
                        className={cn(
                          'text-muted-foreground text-sm',
                          d1.id === currentDim1 &&
                            d2.id === currentDim2 &&
                            'text-primary font-medium'
                        )}
                      >
                        {d1.id === currentDim1 && d2.id === currentDim2 && '▶ '}
                        {d2.label}
                      </h5>

                      <div className="ml-4 space-y-1">
                        {dim3Options.map((d3) => {
                          const key = `${d1.id}_${d2.id}_${d3.id}`
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
                                  {d3.label}
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

/**
 * 2D Category Display (BASIC_005 style)
 */
function CategoryDisplay2D({
  definition,
  currentKey,
}: {
  definition: CategoryDefinition
  currentKey: string
}) {
  const [showAll, setShowAll] = useState(false)

  const dims = definition.dimensions
  const dim1Key = Object.keys(dims)[0] ?? 'fanCount'
  const dim2Key = Object.keys(dims)[1] ?? 'reachQuality'

  const dim1Options = dims[dim1Key] ?? []
  const dim2Options = dims[dim2Key] ?? []

  const { dim1: currentDim1, dim2: currentDim2 } = parse2DCategoryKey(currentKey, dim1Options)

  const currentRecommendation = definition.recommendations[currentKey]

  const currentDim1Label = dim1Options.find((d) => d.id === currentDim1)?.label ?? currentDim1
  const currentDim2Label = currentDim2
    ? (dim2Options.find((d) => d.id === currentDim2)?.label ?? currentDim2)
    : null

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
            {currentDim1Label}
          </Badge>
          {currentDim2Label && (
            <Badge variant="secondary" className="gap-1">
              <Check className="h-3 w-3" />
              {currentDim2Label}
            </Badge>
          )}
        </div>

        {/* Current recommendation */}
        {currentRecommendation && <RecommendationCard text={currentRecommendation} />}

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

        {/* All categories - 2D structure */}
        {showAll && (
          <div className="space-y-4 pt-2">
            {dim1Options.map((d1) => {
              // Check if this dim1 has sub-categories (dim2) or is standalone
              const standaloneKey = d1.id
              const hasStandalone = definition.recommendations[standaloneKey] !== undefined

              return (
                <div key={d1.id} className="space-y-2">
                  <h4
                    className={cn('text-sm font-medium', d1.id === currentDim1 && 'text-primary')}
                  >
                    {d1.id === currentDim1 && '▶ '}
                    {d1.label}
                  </h4>

                  <div className="ml-4 space-y-1">
                    {/* Standalone category (e.g., SMALL with no dim2) */}
                    {hasStandalone && (
                      <div
                        className={cn(
                          'rounded-md p-2 text-sm',
                          standaloneKey === currentKey
                            ? 'bg-primary/10 border-primary/30 border'
                            : 'bg-muted/30'
                        )}
                      >
                        <div className="flex items-center gap-2">
                          {standaloneKey === currentKey ? (
                            <Badge variant="default" className="bg-primary shrink-0 text-xs">
                              VAŠE KATEGORIE
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground text-xs">○</span>
                          )}
                          <span
                            className={cn('text-xs', standaloneKey === currentKey && 'font-medium')}
                          >
                            (bez dalšího dělení)
                          </span>
                        </div>
                        {definition.recommendations[standaloneKey] && (
                          <p
                            className={cn(
                              'mt-1 text-xs leading-relaxed',
                              standaloneKey === currentKey
                                ? 'text-foreground'
                                : 'text-muted-foreground line-clamp-2'
                            )}
                          >
                            {definition.recommendations[standaloneKey]}
                          </p>
                        )}
                      </div>
                    )}

                    {/* Categories with dim2 sub-categories */}
                    {!hasStandalone &&
                      dim2Options.map((d2) => {
                        const key = `${d1.id}_${d2.id}`
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
                                {d2.label}
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
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

/**
 * 1D Category Display (CONT_002, TECH_001, SHARE_001, etc.)
 * Handles single-dimension triggers with flat category list
 */
function CategoryDisplay1D({
  definition,
  currentKey,
}: {
  definition: CategoryDefinition
  currentKey: string
}) {
  const [showAll, setShowAll] = useState(false)

  const dims = definition.dimensions
  const dimKey = Object.keys(dims)[0] ?? 'unknown'
  const dimOptions = dims[dimKey] ?? []

  // Check if currentKey is a real category (not fallback like INSUFFICIENT, UNAVAILABLE)
  const isInDimensions = dimOptions.some((d) => d.id === currentKey)
  const currentLabel = dimOptions.find((d) => d.id === currentKey)?.label ?? currentKey
  const currentRecommendation = definition.recommendations[currentKey]

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-medium">Vaše zařazení</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current category badge */}
        <div className="flex flex-wrap gap-2">
          <Badge variant="secondary" className="gap-1">
            <Check className="h-3 w-3" />
            {currentLabel}
          </Badge>
        </div>

        {/* Current recommendation */}
        {currentRecommendation && <RecommendationCard text={currentRecommendation} />}

        {/* Toggle and category list - only show if currentKey is in dimensions */}
        {isInDimensions && (
          <>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowAll(!showAll)}
              className="gap-2"
            >
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

            {/* All categories - flat list */}
            {showAll && (
              <div className="space-y-2 pt-2">
                {dimOptions.map((d) => {
                  const isActive = d.id === currentKey
                  const recommendation = definition.recommendations[d.id]

                  return (
                    <div
                      key={d.id}
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
                        <span className={cn('text-xs', isActive && 'font-medium')}>{d.label}</span>
                      </div>
                      {recommendation && (
                        <p
                          className={cn(
                            'mt-1 text-xs leading-relaxed',
                            isActive ? 'text-foreground' : 'text-muted-foreground line-clamp-2'
                          )}
                        >
                          {recommendation}
                        </p>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}

/**
 * Main CategoryDisplay component - automatically selects the right display mode
 */
export function CategoryDisplay({ definition, currentKey }: CategoryDisplayProps) {
  const structureType = getStructureType(definition.dimensions)

  if (structureType === '3d') {
    return <CategoryDisplay3D definition={definition} currentKey={currentKey} />
  }

  if (structureType === '2d') {
    return <CategoryDisplay2D definition={definition} currentKey={currentKey} />
  }

  if (structureType === '1d') {
    return <CategoryDisplay1D definition={definition} currentKey={currentKey} />
  }

  // Fallback for unknown structures - just show recommendation
  const currentRecommendation = definition.recommendations[currentKey]

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-medium">Vaše zařazení</CardTitle>
      </CardHeader>
      <CardContent>
        {currentRecommendation && <RecommendationCard text={currentRecommendation} />}
      </CardContent>
    </Card>
  )
}
