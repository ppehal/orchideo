import type { TriggerRule, TriggerInput, TriggerEvaluation } from '../../types'
import { getStatus, createFallbackEvaluation, formatPercent } from '../../utils'
import { registerTrigger } from '../../registry'

const TRIGGER_ID = 'TECH_007'
const TRIGGER_NAME = 'Odrážkování'
const TRIGGER_DESCRIPTION = 'Využití emoji odrážek pro strukturování textu'
const TRIGGER_CATEGORY = 'TECHNICAL' as const

// Minimum text length where bullet points make sense
const MIN_LENGTH_FOR_BULLETS = 100

function evaluate(input: TriggerInput): TriggerEvaluation {
  const { posts90d } = input

  // Filter posts with text long enough to benefit from bullet points
  const longPosts = posts90d.filter((p) => p.message && p.message_length >= MIN_LENGTH_FOR_BULLETS)

  if (longPosts.length < 3) {
    return createFallbackEvaluation(
      TRIGGER_ID,
      TRIGGER_NAME,
      TRIGGER_DESCRIPTION,
      TRIGGER_CATEGORY,
      'INSUFFICIENT_DATA',
      'Nedostatek delších textů pro analýzu odrážek'
    )
  }

  // Count posts with emoji bullets
  const postsWithBullets = longPosts.filter((p) => p.has_emoji_bullets)
  const bulletPercentage = (postsWithBullets.length / longPosts.length) * 100

  // Calculate score
  let score: number
  if (bulletPercentage >= 30) {
    score = 95
  } else if (bulletPercentage >= 20) {
    score = 85
  } else if (bulletPercentage >= 10) {
    score = 70
  } else if (bulletPercentage >= 5) {
    score = 55
  } else {
    score = 40
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
        ? 'U delších textů používejte emoji odrážky pro lepší čitelnost a engagement'
        : undefined,
    details: {
      currentValue: formatPercent(bulletPercentage, 0),
      targetValue: '≥30%',
      context: `Analyzováno ${longPosts.length} delších příspěvků (100+ znaků)`,
      metrics: {
        postsWithBullets: postsWithBullets.length,
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
