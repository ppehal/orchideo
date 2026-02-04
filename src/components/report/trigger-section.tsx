import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { TriggerCard, type TriggerResult } from './trigger-card'
import { ScoreBadge } from './score-badge'
import { cn } from '@/lib/utils'
import {
  type TriggerCategory,
  TRIGGER_CATEGORY_CONFIG,
  CATEGORY_WEIGHTS,
} from '@/lib/constants/trigger-categories'

export { type TriggerCategory, CATEGORY_WEIGHTS }

interface TriggerSectionProps {
  category: TriggerCategory
  triggers: TriggerResult[]
  reportToken?: string
  className?: string
}

export function calculateCategoryScore(triggers: TriggerResult[]): number {
  if (triggers.length === 0) return 0
  const sum = triggers.reduce((acc, t) => acc + t.score, 0)
  return Math.round(sum / triggers.length)
}

export function TriggerSection({
  category,
  triggers,
  reportToken,
  className,
}: TriggerSectionProps) {
  const config = TRIGGER_CATEGORY_CONFIG[category]
  const categoryScore = calculateCategoryScore(triggers)
  const weight = CATEGORY_WEIGHTS[category]

  return (
    <section className={cn('space-y-4', className)}>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-2xl">{config.icon}</span>
              <div>
                <CardTitle>{config.title}</CardTitle>
                <CardDescription>{config.description}</CardDescription>
              </div>
            </div>
            <div className="flex flex-col items-end gap-1">
              <ScoreBadge score={categoryScore} />
              <span className="text-muted-foreground text-xs">
                Váha: {Math.round(weight * 100)}%
              </span>
            </div>
          </div>
        </CardHeader>
        {triggers.length > 0 && (
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              {triggers.map((trigger) => (
                <TriggerCard key={trigger.id} trigger={trigger} reportToken={reportToken} />
              ))}
            </div>
          </CardContent>
        )}
        {triggers.length === 0 && (
          <CardContent>
            <p className="text-muted-foreground py-4 text-center text-sm">
              Žádné triggery v této kategorii
            </p>
          </CardContent>
        )}
      </Card>
    </section>
  )
}
