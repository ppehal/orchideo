/**
 * Centralized metric labels for UI components.
 *
 * These use camelCase keys matching the frontend/API format.
 * For comparison service (snake_case), see comparison-metrics.ts.
 */

/**
 * Full labels for metric display in cards, charts, etc.
 */
export const METRIC_LABELS: Record<string, string> = {
  overallScore: 'Celkové skóre',
  engagementRate: 'Engagement Rate',
  postsPerWeek: 'Příspěvky/týden',
  avgReactions: 'Prům. reakce',
  avgComments: 'Prům. komentáře',
  avgShares: 'Prům. sdílení',
  fanCount: 'Počet fanoušků',
}

/**
 * Short labels for compact displays (tables, badges)
 */
export const METRIC_LABELS_SHORT: Record<string, string> = {
  overallScore: 'Skóre',
  engagementRate: 'Engagement',
  postsPerWeek: 'Příspěvky/týden',
  avgReactions: 'Reakce',
  avgComments: 'Komentáře',
  avgShares: 'Sdílení',
  fanCount: 'Fanoušci',
}

/**
 * Ordered list of metric keys for iteration
 */
export const METRIC_KEYS = [
  'overallScore',
  'engagementRate',
  'postsPerWeek',
  'avgReactions',
  'avgComments',
  'avgShares',
] as const

export type MetricKey = (typeof METRIC_KEYS)[number]

/**
 * Format a metric value for display
 */
export function formatMetricValue(key: string, value: number): string {
  if (key === 'engagementRate') {
    return `${value.toFixed(2)}%`
  }
  if (key === 'overallScore') {
    return `${Math.round(value)}`
  }
  if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}k`
  }
  return value.toFixed(1)
}
