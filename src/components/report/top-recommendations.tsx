import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { StatusBadge, getStatusFromScore } from './score-badge'
import { type TriggerResult } from './trigger-card'
import { type TriggerCategory, CATEGORY_WEIGHTS } from './trigger-section'
import { Lightbulb } from 'lucide-react'

interface TopRecommendationsProps {
  triggers: Array<TriggerResult & { category: TriggerCategory }>
  maxRecommendations?: number
}

interface ScoredRecommendation {
  trigger: TriggerResult & { category: TriggerCategory }
  impact: number
}

function calculateImpact(trigger: TriggerResult & { category: TriggerCategory }): number {
  // Impact = (100 - score) * category weight
  // Lower score + higher category weight = higher impact
  const categoryWeight = CATEGORY_WEIGHTS[trigger.category]
  const scoreDeficit = 100 - trigger.score
  return scoreDeficit * categoryWeight
}

export function TopRecommendations({ triggers, maxRecommendations = 5 }: TopRecommendationsProps) {
  // Filter triggers with recommendations and score < 85 (not EXCELLENT)
  const triggersWithRecommendations = triggers.filter((t) => t.recommendation && t.score < 85)

  // Score and sort by impact
  const scored: ScoredRecommendation[] = triggersWithRecommendations
    .map((trigger) => ({
      trigger,
      impact: calculateImpact(trigger),
    }))
    .sort((a, b) => b.impact - a.impact)
    .slice(0, maxRecommendations)

  if (scored.length === 0) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <Lightbulb className="text-primary h-6 w-6" />
            <div>
              <CardTitle>TOP doporučení</CardTitle>
              <CardDescription>Nejdůležitější kroky ke zlepšení</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground py-4 text-center text-sm">
            Gratulujeme! Vaše stránka je ve výborném stavu.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <Lightbulb className="text-primary h-6 w-6" />
          <div>
            <CardTitle>TOP {scored.length} doporučení</CardTitle>
            <CardDescription>Nejdůležitější kroky ke zlepšení</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ol className="space-y-4">
          {scored.map(({ trigger }, index) => (
            <li key={trigger.id} className="flex flex-col gap-4 rounded-lg border p-4 sm:flex-row">
              <div className="bg-primary text-primary-foreground flex h-8 w-8 shrink-0 items-center justify-center rounded-full font-semibold">
                {index + 1}
              </div>
              <div className="flex-1 space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <h4 className="font-medium">{trigger.name}</h4>
                  <StatusBadge status={getStatusFromScore(trigger.score)} size="sm" />
                </div>
                <p className="text-muted-foreground text-sm">{trigger.recommendation}</p>
                {trigger.details?.currentValue !== undefined && (
                  <p className="text-muted-foreground text-xs">
                    Aktuální hodnota:{' '}
                    <span className="font-medium">{trigger.details.currentValue}</span>
                    {trigger.details.targetValue !== undefined && (
                      <>
                        {' '}
                        → Cíl: <span className="font-medium">{trigger.details.targetValue}</span>
                      </>
                    )}
                  </p>
                )}
              </div>
            </li>
          ))}
        </ol>
      </CardContent>
    </Card>
  )
}
