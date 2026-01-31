/**
 * Versioning constants for scoring algorithms and benchmarks.
 * Used to track data comparability in trend analysis.
 */

// Current scoring algorithm version
// Increment when changing how scores are calculated
export const SCORING_VERSION = '1.0'

// Current benchmark data version
// Increment when updating industry benchmarks
export const BENCHMARK_VERSION = '1.0'

/**
 * Thresholds for determining if a metric change is significant enough to be a trend.
 * Values are percentages (e.g., 10 = 10%).
 */
export const TREND_THRESHOLDS = {
  // Minimum change percentage to consider "significant"
  SCORE_CHANGE_MIN: 5, // 5 point change in overall score
  ENGAGEMENT_CHANGE_MIN: 15, // 15% relative change in engagement rate
  POSTING_CHANGE_MIN: 25, // 25% change in posting frequency

  // Minimum data points needed for reliable trend calculation
  MIN_SNAPSHOTS_FOR_TREND: 2,

  // Time window for trend calculation (days)
  TREND_WINDOW_DAYS: 90,
} as const

/**
 * Thresholds for creating alerts based on metric changes.
 */
export const ALERT_THRESHOLDS = {
  // Score drop thresholds
  SCORE_DROP_WARNING: 10, // 10 points = warning
  SCORE_DROP_CRITICAL: 20, // 20 points = critical

  // Score improvement threshold
  SCORE_IMPROVEMENT: 15, // 15 points = celebration

  // Engagement rate change thresholds (relative %)
  ENGAGEMENT_DROP_WARNING: 25, // 25% drop = warning
  ENGAGEMENT_DROP_CRITICAL: 50, // 50% drop = critical
  ENGAGEMENT_IMPROVEMENT: 30, // 30% improvement = celebration

  // Posting frequency thresholds (relative %)
  POSTING_DROP_WARNING: 40, // 40% drop = warning
  POSTING_INCREASE: 50, // 50% increase = notable
} as const

/**
 * Severity levels for alerts
 */
export const ALERT_SEVERITY = {
  INFO: 1,
  WARNING: 2,
  CRITICAL: 3,
} as const

export type AlertSeverity = (typeof ALERT_SEVERITY)[keyof typeof ALERT_SEVERITY]
