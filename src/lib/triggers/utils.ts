import type { TriggerStatus, TriggerEvaluation, TriggerCategory, FallbackReason } from './types'
import { SCORE_THRESHOLDS, CATEGORY_WEIGHTS } from './types'

/**
 * Get status from score
 * 85-100 = EXCELLENT
 * 70-84  = GOOD
 * 40-69  = NEEDS_IMPROVEMENT
 * 0-39   = CRITICAL
 */
export function getStatus(score: number): TriggerStatus {
  if (score >= SCORE_THRESHOLDS.EXCELLENT) return 'EXCELLENT'
  if (score >= SCORE_THRESHOLDS.GOOD) return 'GOOD'
  if (score >= SCORE_THRESHOLDS.NEEDS_IMPROVEMENT) return 'NEEDS_IMPROVEMENT'
  return 'CRITICAL'
}

/**
 * Normalize a value to 0-100 scale
 * @param value - The value to normalize
 * @param min - Minimum expected value (maps to 0)
 * @param max - Maximum expected value (maps to 100)
 * @param invert - If true, higher values = lower score
 */
export function normalizeScore(value: number, min: number, max: number, invert = false): number {
  // Clamp value to range
  const clamped = Math.max(min, Math.min(max, value))
  // Normalize to 0-1
  const normalized = (clamped - min) / (max - min)
  // Convert to 0-100, optionally inverted
  const score = invert ? (1 - normalized) * 100 : normalized * 100
  return Math.round(score)
}

/**
 * Calculate average score for a list of triggers
 */
export function calculateAverageScore(triggers: TriggerEvaluation[]): number {
  if (triggers.length === 0) return 0
  const sum = triggers.reduce((acc, t) => acc + t.score, 0)
  return Math.round(sum / triggers.length)
}

/**
 * Calculate category score (average of triggers in category)
 */
export function calculateCategoryScore(
  triggers: TriggerEvaluation[],
  category: TriggerCategory
): number {
  const categoryTriggers = triggers.filter((t) => t.category === category)
  return calculateAverageScore(categoryTriggers)
}

/**
 * Calculate overall score using category weights
 */
export function calculateOverallScore(triggers: TriggerEvaluation[]): number {
  if (triggers.length === 0) return 0

  // Group by category
  const byCategory = new Map<TriggerCategory, TriggerEvaluation[]>()
  for (const trigger of triggers) {
    const existing = byCategory.get(trigger.category) ?? []
    existing.push(trigger)
    byCategory.set(trigger.category, existing)
  }

  let totalScore = 0
  let totalWeight = 0

  for (const [category, categoryTriggers] of byCategory) {
    const categoryScore = calculateAverageScore(categoryTriggers)
    const weight = CATEGORY_WEIGHTS[category]
    totalScore += categoryScore * weight
    totalWeight += weight
  }

  return totalWeight > 0 ? Math.round(totalScore / totalWeight) : 0
}

/**
 * Create a fallback evaluation for when data is insufficient
 */
export function createFallbackEvaluation(
  id: string,
  name: string,
  description: string,
  category: TriggerCategory,
  reason: FallbackReason,
  context?: string
): TriggerEvaluation {
  const score = 50 // Default to NEEDS_IMPROVEMENT for fallback

  return {
    id,
    name,
    description,
    category,
    score,
    status: getStatus(score),
    recommendation: undefined,
    details: {
      reason,
      context: context ?? getDefaultFallbackContext(reason),
    },
  }
}

function getDefaultFallbackContext(reason: FallbackReason): string {
  switch (reason) {
    case 'INSUFFICIENT_DATA':
      return 'Nedostatek dat pro přesné vyhodnocení'
    case 'METRIC_UNAVAILABLE':
      return 'Metrika není dostupná z Facebook API'
    case 'NOT_APPLICABLE':
      return 'Tento trigger není pro tuto stránku relevantní'
  }
}

/**
 * Calculate percentage of posts matching a condition
 */
export function calculatePercentage(
  posts: Array<{ [key: string]: unknown }>,
  condition: (post: { [key: string]: unknown }) => boolean
): number {
  if (posts.length === 0) return 0
  const matching = posts.filter(condition).length
  return Math.round((matching / posts.length) * 100)
}

/**
 * Score based on percentage thresholds
 * @param percentage - The percentage value (0-100)
 * @param thresholds - Object with excellent, good, needsImprovement thresholds
 * @param invert - If true, lower percentage = better score
 */
export function scoreFromPercentage(
  percentage: number,
  thresholds: {
    excellent: number
    good: number
    needsImprovement: number
  },
  invert = false
): number {
  const value = invert ? 100 - percentage : percentage

  if (value >= thresholds.excellent) return 95
  if (value >= thresholds.good) return 80
  if (value >= thresholds.needsImprovement) return 55
  return 30
}

/**
 * Format a number as percentage string
 */
export function formatPercent(value: number, decimals = 0): string {
  return `${value.toFixed(decimals)}%`
}

/**
 * Format a number with Czech locale
 */
export function formatNumber(value: number): string {
  return value.toLocaleString('cs-CZ')
}
