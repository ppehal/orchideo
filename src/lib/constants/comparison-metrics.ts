/**
 * Constants for competitor comparison metrics.
 */

/**
 * Direction interpretation for metrics (higher is better or lower is better)
 */
export type MetricDirection = 'higher_better' | 'lower_better' | 'neutral'

/**
 * Definition of a comparison metric
 */
export interface ComparisonMetricDef {
  key: string
  name: string
  description: string
  unit: string
  direction: MetricDirection
  // Format function for display
  format: (value: number) => string
}

/**
 * Format helpers
 */
const formatPercent = (value: number): string => `${(value * 100).toFixed(2)}%`
const formatNumber = (value: number): string =>
  value.toLocaleString('cs-CZ', { maximumFractionDigits: 1 })
const formatScore = (value: number): string => `${Math.round(value)}`

/**
 * Catalog of metrics available for competitor comparison.
 */
export const COMPARISON_METRICS: ComparisonMetricDef[] = [
  {
    key: 'overall_score',
    name: 'Celkové skóre',
    description: 'Celkové hodnocení výkonu stránky',
    unit: 'bodů',
    direction: 'higher_better',
    format: formatScore,
  },
  {
    key: 'engagement_rate',
    name: 'Engagement Rate',
    description: 'Poměr interakcí k počtu fanoušků',
    unit: '%',
    direction: 'higher_better',
    format: formatPercent,
  },
  {
    key: 'avg_reactions',
    name: 'Průměr reakcí',
    description: 'Průměrný počet reakcí na příspěvek',
    unit: '',
    direction: 'higher_better',
    format: formatNumber,
  },
  {
    key: 'avg_comments',
    name: 'Průměr komentářů',
    description: 'Průměrný počet komentářů na příspěvek',
    unit: '',
    direction: 'higher_better',
    format: formatNumber,
  },
  {
    key: 'avg_shares',
    name: 'Průměr sdílení',
    description: 'Průměrný počet sdílení na příspěvek',
    unit: '',
    direction: 'higher_better',
    format: formatNumber,
  },
  {
    key: 'posts_per_week',
    name: 'Příspěvky/týden',
    description: 'Průměrný počet příspěvků za týden',
    unit: '',
    direction: 'neutral', // Depends on strategy
    format: formatNumber,
  },
  {
    key: 'fan_count',
    name: 'Počet fanoušků',
    description: 'Celkový počet sledujících stránku',
    unit: '',
    direction: 'higher_better',
    format: formatNumber,
  },
]

/**
 * Get metric definition by key
 */
export function getMetricDef(key: string): ComparisonMetricDef | undefined {
  return COMPARISON_METRICS.find((m) => m.key === key)
}
