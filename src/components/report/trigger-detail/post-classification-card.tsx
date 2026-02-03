'use client'

import { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Tags, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { PostClassification } from '@/lib/triggers/debug-types'

const INITIAL_DISPLAY = 10
const MAX_KEYWORDS_DISPLAY = 10

export function PostClassificationCard({
  classifications,
}: {
  classifications: PostClassification[]
}) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [showAll, setShowAll] = useState(false)

  // Calculate counts
  const { salesCount, brandCount, engagementCount } = useMemo(() => {
    return {
      salesCount: classifications.filter((c) => c.classification === 'SALES').length,
      brandCount: classifications.filter((c) => c.classification === 'BRAND').length,
      engagementCount: classifications.filter((c) => c.classification === 'ENGAGEMENT').length,
    }
  }, [classifications])

  // Limit displayed posts
  const displayedPosts = useMemo(() => {
    return showAll ? classifications : classifications.slice(0, INITIAL_DISPLAY)
  }, [showAll, classifications])

  return (
    <Card className="border-dashed border-amber-500/50 bg-amber-50/50 dark:bg-amber-950/20">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Tags className="h-4 w-4 text-amber-600" />
            <CardTitle className="text-base font-medium text-amber-700 dark:text-amber-400">
              Analýza klasifikace postů (debug)
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
        <p className="text-xs text-muted-foreground mt-2">
          Zobrazuje, které klíčová slova byla nalezena v každém postu
        </p>
      </CardHeader>
      {isExpanded && (
        <CardContent className="space-y-4">
          {/* Summary - always visible */}
          <div className="flex gap-2 flex-wrap">
            <Badge variant="outline" className="gap-1.5">
              <span className="w-2 h-2 rounded-full bg-red-500" />
              {salesCount} SALES
            </Badge>
            <Badge variant="outline" className="gap-1.5">
              <span className="w-2 h-2 rounded-full bg-blue-500" />
              {brandCount} BRAND
            </Badge>
            <Badge variant="outline" className="gap-1.5">
              <span className="w-2 h-2 rounded-full bg-green-500" />
              {engagementCount} ENGAGEMENT
            </Badge>
          </div>

          {/* Post list */}
          <div className="space-y-2">
            {displayedPosts.map((post) => (
              <Collapsible key={post.postId} className="border rounded-lg">
                <CollapsibleTrigger className="flex items-center justify-between w-full p-3 hover:bg-muted/50 transition-colors">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <Badge
                      variant={
                        post.classification === 'SALES'
                          ? 'destructive'
                          : post.classification === 'BRAND'
                            ? 'secondary'
                            : 'default'
                      }
                      className="flex-shrink-0"
                    >
                      {post.classification}
                    </Badge>
                    <span className="text-sm text-muted-foreground line-clamp-1 text-left">
                      Post ID: {post.postId}
                    </span>
                  </div>
                  <ChevronDown className="h-4 w-4 flex-shrink-0 ml-2" />
                </CollapsibleTrigger>
                <CollapsibleContent className="px-3 py-3 bg-muted/30 space-y-3">
                  {/* Sales keywords */}
                  {post.matchedKeywords.sales.length > 0 && (
                    <div className="space-y-1.5">
                      <span className="text-xs font-medium text-red-600 dark:text-red-400">
                        Prodejní klíčová slova ({post.matchedKeywords.sales.length}):
                      </span>
                      <div className="flex flex-wrap gap-1">
                        {post.matchedKeywords.sales.slice(0, MAX_KEYWORDS_DISPLAY).map((kw) => (
                          <Badge key={kw} variant="destructive" className="text-xs">
                            {kw}
                          </Badge>
                        ))}
                        {post.matchedKeywords.sales.length > MAX_KEYWORDS_DISPLAY && (
                          <Badge variant="outline" className="text-xs">
                            +{post.matchedKeywords.sales.length - MAX_KEYWORDS_DISPLAY} dalších
                          </Badge>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Brand keywords */}
                  {post.matchedKeywords.brand.length > 0 && (
                    <div className="space-y-1.5">
                      <span className="text-xs font-medium text-blue-600 dark:text-blue-400">
                        Brandová klíčová slova ({post.matchedKeywords.brand.length}):
                      </span>
                      <div className="flex flex-wrap gap-1">
                        {post.matchedKeywords.brand.slice(0, MAX_KEYWORDS_DISPLAY).map((kw) => (
                          <Badge key={kw} variant="secondary" className="text-xs">
                            {kw}
                          </Badge>
                        ))}
                        {post.matchedKeywords.brand.length > MAX_KEYWORDS_DISPLAY && (
                          <Badge variant="outline" className="text-xs">
                            +{post.matchedKeywords.brand.length - MAX_KEYWORDS_DISPLAY} dalších
                          </Badge>
                        )}
                      </div>
                    </div>
                  )}

                  {/* No keywords */}
                  {post.matchedKeywords.sales.length === 0 &&
                    post.matchedKeywords.brand.length === 0 && (
                      <div className="text-xs text-muted-foreground">
                        Žádná klíčová slova nenalezena
                      </div>
                    )}

                  {/* Reasoning */}
                  <div className="pt-2 border-t">
                    <span className="text-xs font-medium">Zdůvodnění:</span>
                    <p className="text-xs text-muted-foreground mt-1">{post.reasoning}</p>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            ))}
          </div>

          {/* Show more button */}
          {classifications.length > INITIAL_DISPLAY && (
            <Button variant="ghost" size="sm" onClick={() => setShowAll(!showAll)} className="w-full">
              {showAll ? 'Zobrazit méně' : `Zobrazit všech ${classifications.length} postů`}
            </Button>
          )}
        </CardContent>
      )}
    </Card>
  )
}
