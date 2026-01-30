import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { TriggerCard, type TriggerResult } from './trigger-card'
import { ScoreBadge } from './score-badge'
import { cn } from '@/lib/utils'

export type TriggerCategory =
  | 'BASIC'
  | 'CONTENT'
  | 'TECHNICAL'
  | 'TIMING'
  | 'SHARING'
  | 'PAGE_SETTINGS'

interface TriggerSectionProps {
  category: TriggerCategory
  triggers: TriggerResult[]
  className?: string
}

const CATEGORY_CONFIG: Record<
  TriggerCategory,
  { title: string; description: string; icon: string }
> = {
  BASIC: {
    title: 'Základní metriky',
    description: 'Engagement a interakce s fanoušky',
    icon: '📊',
  },
  CONTENT: {
    title: 'Obsah',
    description: 'Kvalita a struktura příspěvků',
    icon: '📝',
  },
  TECHNICAL: {
    title: 'Technické aspekty',
    description: 'Formáty, velikosti a technická kvalita',
    icon: '⚙️',
  },
  TIMING: {
    title: 'Časování',
    description: 'Frekvence a načasování příspěvků',
    icon: '⏰',
  },
  SHARING: {
    title: 'Sdílení',
    description: 'Strategie sdílení obsahu',
    icon: '🔗',
  },
  PAGE_SETTINGS: {
    title: 'Nastavení stránky',
    description: 'Profilová a cover fotka',
    icon: '🖼️',
  },
}

// Category weights for overall score calculation
export const CATEGORY_WEIGHTS: Record<TriggerCategory, number> = {
  BASIC: 0.35,
  CONTENT: 0.3,
  TECHNICAL: 0.2,
  TIMING: 0.05,
  SHARING: 0.05,
  PAGE_SETTINGS: 0.05,
}

export function calculateCategoryScore(triggers: TriggerResult[]): number {
  if (triggers.length === 0) return 0
  const sum = triggers.reduce((acc, t) => acc + t.score, 0)
  return Math.round(sum / triggers.length)
}

export function TriggerSection({ category, triggers, className }: TriggerSectionProps) {
  const config = CATEGORY_CONFIG[category]
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
                <TriggerCard key={trigger.id} trigger={trigger} />
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
