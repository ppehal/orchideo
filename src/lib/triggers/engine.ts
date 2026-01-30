import { createLogger } from '@/lib/logging'
import type { TriggerInput, TriggerEvaluation, TriggerCategory } from './types'
import { getAllTriggers, getTriggersByCategory } from './registry'
import { calculateOverallScore as calcOverall, getStatus, createFallbackEvaluation } from './utils'

const log = createLogger('trigger-engine')

export interface EvaluationResult {
  evaluations: TriggerEvaluation[]
  overallScore: number
  categoryScores: Record<TriggerCategory, number>
  evaluatedAt: Date
  errors: Array<{ triggerId: string; error: string }>
}

/**
 * Evaluate all registered triggers against the input data
 */
export function evaluateAll(input: TriggerInput): EvaluationResult {
  const triggers = getAllTriggers()
  const evaluations: TriggerEvaluation[] = []
  const errors: Array<{ triggerId: string; error: string }> = []

  log.info({ triggerCount: triggers.length }, 'Starting trigger evaluation')

  for (const trigger of triggers) {
    try {
      const evaluation = trigger.evaluate(input)
      evaluations.push(evaluation)

      log.debug(
        { triggerId: trigger.id, score: evaluation.score, status: evaluation.status },
        'Trigger evaluated'
      )
    } catch (error) {
      // Triggers should never throw, but handle it gracefully if they do
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      log.error({ triggerId: trigger.id, error: errorMessage }, 'Trigger evaluation failed')

      errors.push({ triggerId: trigger.id, error: errorMessage })

      // Create a fallback evaluation
      const fallback = createFallbackEvaluation(
        trigger.id,
        trigger.name,
        trigger.description,
        trigger.category,
        'METRIC_UNAVAILABLE',
        `Chyba při vyhodnocení: ${errorMessage}`
      )
      evaluations.push(fallback)
    }
  }

  // Calculate category scores
  const categoryScores = calculateCategoryScores(evaluations)

  // Calculate overall score
  const overallScore = calcOverall(evaluations)

  log.info(
    {
      evaluatedCount: evaluations.length,
      errorCount: errors.length,
      overallScore,
    },
    'Trigger evaluation completed'
  )

  return {
    evaluations,
    overallScore,
    categoryScores,
    evaluatedAt: new Date(),
    errors,
  }
}

/**
 * Evaluate triggers for a specific category only
 */
export function evaluateCategory(
  input: TriggerInput,
  category: TriggerCategory
): TriggerEvaluation[] {
  const triggers = getTriggersByCategory(category)
  const evaluations: TriggerEvaluation[] = []

  for (const trigger of triggers) {
    try {
      const evaluation = trigger.evaluate(input)
      evaluations.push(evaluation)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      log.error({ triggerId: trigger.id, error: errorMessage }, 'Trigger evaluation failed')

      const fallback = createFallbackEvaluation(
        trigger.id,
        trigger.name,
        trigger.description,
        trigger.category,
        'METRIC_UNAVAILABLE',
        `Chyba při vyhodnocení: ${errorMessage}`
      )
      evaluations.push(fallback)
    }
  }

  return evaluations
}

/**
 * Calculate scores for each category
 */
function calculateCategoryScores(
  evaluations: TriggerEvaluation[]
): Record<TriggerCategory, number> {
  const categories: TriggerCategory[] = [
    'BASIC',
    'CONTENT',
    'TECHNICAL',
    'TIMING',
    'SHARING',
    'PAGE_SETTINGS',
  ]

  const scores: Record<TriggerCategory, number> = {
    BASIC: 0,
    CONTENT: 0,
    TECHNICAL: 0,
    TIMING: 0,
    SHARING: 0,
    PAGE_SETTINGS: 0,
  }

  for (const category of categories) {
    const categoryEvaluations = evaluations.filter((e) => e.category === category)
    if (categoryEvaluations.length > 0) {
      const sum = categoryEvaluations.reduce((acc, e) => acc + e.score, 0)
      scores[category] = Math.round(sum / categoryEvaluations.length)
    }
  }

  return scores
}

/**
 * Re-export calculateOverallScore for convenience
 */
export const calculateOverallScore = calcOverall

/**
 * Re-export getStatus for convenience
 */
export { getStatus }
