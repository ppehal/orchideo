/**
 * Centralized color schemes for consistent styling across Orchideo.
 *
 * SINGLE SOURCE OF TRUTH for all color definitions.
 *
 * Pattern used:
 * - Light mode: bg-[color]-100, text-[color]-700, border-[color]-200
 * - Dark mode:  dark:bg-[color]-900/30, dark:text-[color]-400, dark:border-[color]-800
 */

// =============================================================================
// COLOR CONFIG TYPE
// =============================================================================

export interface ColorConfig {
  bgClass: string
  textClass: string
  borderClass?: string
  dotClass?: string
}

// =============================================================================
// STATUS COLORS - For semantic status indicators
// =============================================================================

/**
 * Semantic status colors for success, warning, error, and info states.
 *
 * @example
 * <Badge className={`${STATUS_COLORS.success.bgClass} ${STATUS_COLORS.success.textClass}`}>
 *   Aktivní
 * </Badge>
 */
export const STATUS_COLORS = {
  success: {
    bgClass: 'bg-green-100 dark:bg-green-900/30',
    textClass: 'text-green-700 dark:text-green-400',
    borderClass: 'border-green-200 dark:border-green-800',
    dotClass: 'bg-green-500',
  },
  warning: {
    bgClass: 'bg-amber-100 dark:bg-amber-900/30',
    textClass: 'text-amber-700 dark:text-amber-400',
    borderClass: 'border-amber-200 dark:border-amber-800',
    dotClass: 'bg-amber-500',
  },
  error: {
    bgClass: 'bg-red-100 dark:bg-red-900/30',
    textClass: 'text-red-700 dark:text-red-400',
    borderClass: 'border-red-200 dark:border-red-800',
    dotClass: 'bg-red-500',
  },
  info: {
    bgClass: 'bg-blue-100 dark:bg-blue-900/30',
    textClass: 'text-blue-700 dark:text-blue-400',
    borderClass: 'border-blue-200 dark:border-blue-800',
    dotClass: 'bg-blue-500',
  },
  neutral: {
    bgClass: 'bg-gray-100 dark:bg-gray-800',
    textClass: 'text-gray-700 dark:text-gray-400',
    borderClass: 'border-gray-200 dark:border-gray-700',
    dotClass: 'bg-gray-500',
  },
} as const satisfies Record<string, ColorConfig>

export type StatusColorKey = keyof typeof STATUS_COLORS

// =============================================================================
// SCORE COLORS - For trigger score visualization
// =============================================================================

/**
 * Score-based colors for analysis/trigger scores.
 *
 * - excellent: score >= 0.8 (green)
 * - good: score >= 0.6 (blue)
 * - average: score >= 0.4 (amber)
 * - poor: score < 0.4 (red)
 *
 * @example
 * const color = getScoreColor(0.75) // returns SCORE_COLORS.good
 */
export const SCORE_COLORS = {
  excellent: {
    bgClass: 'bg-green-100 dark:bg-green-900/30',
    textClass: 'text-green-700 dark:text-green-400',
    borderClass: 'border-green-200 dark:border-green-800',
  },
  good: {
    bgClass: 'bg-blue-100 dark:bg-blue-900/30',
    textClass: 'text-blue-700 dark:text-blue-400',
    borderClass: 'border-blue-200 dark:border-blue-800',
  },
  average: {
    bgClass: 'bg-amber-100 dark:bg-amber-900/30',
    textClass: 'text-amber-700 dark:text-amber-400',
    borderClass: 'border-amber-200 dark:border-amber-800',
  },
  poor: {
    bgClass: 'bg-red-100 dark:bg-red-900/30',
    textClass: 'text-red-700 dark:text-red-400',
    borderClass: 'border-red-200 dark:border-red-800',
  },
} as const satisfies Record<string, ColorConfig>

export type ScoreColorKey = keyof typeof SCORE_COLORS

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Get color config based on a score value (0-1).
 *
 * Thresholds:
 * - >= 0.8: excellent (green)
 * - >= 0.6: good (blue)
 * - >= 0.4: average (amber)
 * - < 0.4: poor (red)
 *
 * @example
 * const { textClass, bgClass } = getScoreColor(analysis.score)
 * <span className={textClass}>{score}</span>
 */
export function getScoreColor(score: number | null | undefined): ColorConfig {
  if (score === null || score === undefined) {
    return SCORE_COLORS.average
  }

  if (score >= 0.8) return SCORE_COLORS.excellent
  if (score >= 0.6) return SCORE_COLORS.good
  if (score >= 0.4) return SCORE_COLORS.average
  return SCORE_COLORS.poor
}

/**
 * Get status color by key, with fallback to neutral.
 */
export function getStatusColor(status: string | null | undefined): ColorConfig {
  if (!status || !(status in STATUS_COLORS)) {
    return STATUS_COLORS.neutral
  }
  return STATUS_COLORS[status as StatusColorKey]
}
