import type { TriggerRule, TriggerInput, TriggerEvaluation } from '../../types'
import { getStatus, createFallbackEvaluation, formatPercent } from '../../utils'
import { registerTrigger } from '../../registry'

const TRIGGER_ID = 'TECH_003'
const TRIGGER_NAME = 'Délka textů'
const TRIGGER_DESCRIPTION = 'Rozložení délky textů příspěvků'
const TRIGGER_CATEGORY = 'TECHNICAL' as const

// Text length categories
const SHORT_MAX = 80 // Characters
const MEDIUM_MAX = 200
// Above MEDIUM_MAX is LONG

// Ideal distribution
const IDEAL_SHORT_PCT = 30 // 30% short
const IDEAL_MEDIUM_PCT = 50 // 50% medium
// 20% long

function evaluate(input: TriggerInput): TriggerEvaluation {
  const { posts90d } = input

  // Filter posts with text
  const postsWithText = posts90d.filter((p) => p.message && p.message_length > 0)

  if (postsWithText.length < 5) {
    return createFallbackEvaluation(
      TRIGGER_ID,
      TRIGGER_NAME,
      TRIGGER_DESCRIPTION,
      TRIGGER_CATEGORY,
      'INSUFFICIENT_DATA',
      'Nedostatek příspěvků s textem pro analýzu'
    )
  }

  // Categorize posts
  let shortCount = 0
  let mediumCount = 0
  let longCount = 0

  for (const post of postsWithText) {
    if (post.message_length <= SHORT_MAX) {
      shortCount++
    } else if (post.message_length <= MEDIUM_MAX) {
      mediumCount++
    } else {
      longCount++
    }
  }

  const total = postsWithText.length
  const shortPct = (shortCount / total) * 100
  const mediumPct = (mediumCount / total) * 100
  const longPct = (longCount / total) * 100

  // Calculate how close to ideal distribution
  const shortDev = Math.abs(shortPct - IDEAL_SHORT_PCT)
  const mediumDev = Math.abs(mediumPct - IDEAL_MEDIUM_PCT)
  const longDev = Math.abs(longPct - 20)
  const avgDeviation = (shortDev + mediumDev + longDev) / 3

  // Score based on deviation from ideal
  let score: number
  if (avgDeviation <= 10) {
    score = 95
  } else if (avgDeviation <= 20) {
    score = 80
  } else if (avgDeviation <= 30) {
    score = 65
  } else if (avgDeviation <= 40) {
    score = 50
  } else {
    score = 35
  }

  // Check for extreme imbalance
  if (shortPct > 70 || longPct > 50) {
    score = Math.min(score, 50)
  }

  return {
    id: TRIGGER_ID,
    name: TRIGGER_NAME,
    description: TRIGGER_DESCRIPTION,
    category: TRIGGER_CATEGORY,
    score,
    status: getStatus(score),
    recommendation:
      score < 85 ? 'Střídejte krátké, střední a delší texty pro větší pestrost' : undefined,
    details: {
      currentValue: `${formatPercent(shortPct, 0)} krátké, ${formatPercent(mediumPct, 0)} střední, ${formatPercent(longPct, 0)} dlouhé`,
      targetValue: '~30% krátké, ~50% střední, ~20% dlouhé',
      context: `Analyzováno ${total} příspěvků s textem`,
      metrics: {
        shortCount,
        mediumCount,
        longCount,
        avgLength: Math.round(postsWithText.reduce((sum, p) => sum + p.message_length, 0) / total),
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
