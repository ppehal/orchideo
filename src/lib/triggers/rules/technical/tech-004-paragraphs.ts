import type { TriggerRule, TriggerInput, TriggerEvaluation } from '../../types'
import { getStatus, createFallbackEvaluation, formatPercent } from '../../utils'
import { registerTrigger } from '../../registry'

const TRIGGER_ID = 'TECH_004'
const TRIGGER_NAME = 'Práce s odstavci'
const TRIGGER_DESCRIPTION = 'Využití odstavců pro čitelnost delších textů'
const TRIGGER_CATEGORY = 'TECHNICAL' as const

// Minimum text length where paragraphs make sense
const MIN_LENGTH_FOR_PARAGRAPHS = 100

function evaluate(input: TriggerInput): TriggerEvaluation {
  const { posts90d } = input

  // Filter posts with text long enough to benefit from paragraphs
  const longPosts = posts90d.filter(
    (p) => p.message && p.message_length >= MIN_LENGTH_FOR_PARAGRAPHS
  )

  if (longPosts.length < 3) {
    return createFallbackEvaluation(
      TRIGGER_ID,
      TRIGGER_NAME,
      TRIGGER_DESCRIPTION,
      TRIGGER_CATEGORY,
      'INSUFFICIENT_DATA',
      'Nedostatek delších textů pro analýzu odstavců'
    )
  }

  // Count posts with double line breaks (paragraphs)
  const postsWithParagraphs = longPosts.filter((p) => p.has_double_line_breaks)
  const paragraphPercentage = (postsWithParagraphs.length / longPosts.length) * 100

  // Calculate score
  let score: number
  if (paragraphPercentage >= 80) {
    score = 95
  } else if (paragraphPercentage >= 60) {
    score = 80
  } else if (paragraphPercentage >= 40) {
    score = 65
  } else if (paragraphPercentage >= 20) {
    score = 50
  } else {
    score = 35
  }

  return {
    id: TRIGGER_ID,
    name: TRIGGER_NAME,
    description: TRIGGER_DESCRIPTION,
    category: TRIGGER_CATEGORY,
    score,
    status: getStatus(score),
    recommendation:
      score < 85
        ? 'U delších textů (100+ znaků) používejte odstavce pro lepší čitelnost'
        : undefined,
    details: {
      currentValue: formatPercent(paragraphPercentage, 0),
      targetValue: '≥80%',
      context: `Analyzováno ${longPosts.length} delších příspěvků (100+ znaků)`,
      metrics: {
        postsWithParagraphs: postsWithParagraphs.length,
        totalLongPosts: longPosts.length,
      },
    },
  }
}

const rule: TriggerRule = {
  id: TRIGGER_ID,
  name: TRIGGER_NAME,
  description: TRIGGER_DESCRIPTION,
  category: TRIGGER_CATEGORY,
  evaluate,
}

registerTrigger(rule)

export default rule
