/**
 * Debug visualization types for trigger calculations
 *
 * These types provide structured data for showing users exactly how
 * trigger scores are calculated, including step-by-step breakdowns,
 * benchmark sources, keyword matching, and threshold visualizations.
 */

import type { TriggerStatus } from '@prisma/client'

export interface TriggerDebugData {
  /**
   * Step-by-step calculation breakdown
   * Shows the exact formula, inputs, and results for each calculation step
   */
  calculationSteps?: CalculationStep[]

  /**
   * Benchmark context (for triggers using industry benchmarks)
   * Shows where the benchmark values come from and what they are
   */
  benchmarkContext?: BenchmarkContext

  /**
   * Post classification details (for content analysis triggers)
   * Shows which keywords were matched in each post
   */
  postClassifications?: PostClassification[]

  /**
   * Threshold visualization data
   * Shows where the score falls on the quality scale
   */
  thresholdPosition?: ThresholdPosition
}

export interface CalculationStep {
  /** Step number in sequence */
  step: number

  /** Human-readable description in Czech */
  description: string

  /** Optional formula used in this step */
  formula?: string

  /** Input values used in calculation */
  inputs: Record<string, number | string>

  /** Result of this calculation step */
  result: number | string
}

export interface BenchmarkContext {
  /** Industry name (e.g., "Retail", "Healthcare") */
  industryName: string

  /** Industry code (e.g., "RETAIL", "HEALTHCARE") */
  industryCode: string

  /** Where the benchmark came from */
  source: 'database' | 'default'

  /** Benchmark values used in calculation */
  values: Record<string, number>
}

export interface PostClassification {
  /** Post ID */
  postId: string

  /** Determined content type */
  classification: 'SALES' | 'BRAND' | 'ENGAGEMENT'

  /** Keywords matched in this post */
  matchedKeywords: {
    /** Sales keywords found */
    sales: string[]

    /** Brand keywords found */
    brand: string[]
  }

  /** Human-readable explanation of why this classification was chosen */
  reasoning: string
}

export interface ThresholdPosition {
  /** Actual score value */
  value: number

  /** Resulting status */
  status: TriggerStatus

  /** All threshold ranges for visualization */
  ranges: ThresholdRange[]
}

export interface ThresholdRange {
  /** Status for this range */
  status: TriggerStatus

  /** Minimum value (inclusive) */
  min: number

  /** Maximum value (inclusive) */
  max: number

  /** Czech label for this range */
  label: string
}
