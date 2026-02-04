import type { NormalizedPost, IndustryBenchmarkData } from '@/lib/services/analysis/types'
import type { PageInsights } from '@/lib/integrations/facebook/insights'
import type { NormalizedFacebookPage } from '@/lib/integrations/facebook/types'

// Trigger categories
export type TriggerCategory =
  | 'BASIC'
  | 'CONTENT'
  | 'TECHNICAL'
  | 'TIMING'
  | 'SHARING'
  | 'PAGE_SETTINGS'

// Trigger status based on score thresholds
// 85-100 = EXCELLENT
// 70-84  = GOOD
// 40-69  = NEEDS_IMPROVEMENT
// 0-39   = CRITICAL
export type TriggerStatus = 'EXCELLENT' | 'GOOD' | 'NEEDS_IMPROVEMENT' | 'CRITICAL'

// Reason for fallback scores
export type FallbackReason = 'INSUFFICIENT_DATA' | 'METRIC_UNAVAILABLE' | 'NOT_APPLICABLE'

// Input data for trigger evaluation
export interface TriggerInput {
  pageData: NormalizedFacebookPage
  posts90d: NormalizedPost[]
  insights28d: PageInsights | null
  industryBenchmark: IndustryBenchmarkData
  collectionMetadata?: {
    insightsError?: string | null
    insightsErrorMessage?: string | null
  }
}

// Details returned by a trigger evaluation
export interface TriggerDetails {
  // Fallback reason if data was insufficient
  reason?: FallbackReason
  // Current measured value
  currentValue?: string | number
  // Target/ideal value
  targetValue?: string | number
  // Additional context
  context?: string
  // Raw metrics used in calculation
  metrics?: Record<string, number | string | null>
}

// Result of evaluating a single trigger
export interface TriggerEvaluation {
  id: string
  name: string
  description: string
  category: TriggerCategory
  score: number // 0-100
  status: TriggerStatus
  recommendation?: string
  details?: TriggerDetails
}

// Trigger rule definition
export interface TriggerRule {
  id: string
  name: string
  description: string
  category: TriggerCategory
  // Evaluation function - must always return a result, never throw
  evaluate: (input: TriggerInput) => TriggerEvaluation
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

// Score thresholds for status
export const SCORE_THRESHOLDS = {
  EXCELLENT: 85,
  GOOD: 70,
  NEEDS_IMPROVEMENT: 40,
  // Below 40 is CRITICAL
} as const
