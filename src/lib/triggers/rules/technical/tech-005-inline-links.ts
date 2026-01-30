import type { TriggerRule, TriggerInput, TriggerEvaluation } from '../../types'
import { getStatus, createFallbackEvaluation, formatPercent } from '../../utils'
import { registerTrigger } from '../../registry'

const TRIGGER_ID = 'TECH_005'
const TRIGGER_NAME = 'Odkazy v textu'
const TRIGGER_DESCRIPTION = 'Použití inline odkazů v textu příspěvků'
const TRIGGER_CATEGORY = 'TECHNICAL' as const

// Inline links in FB post text are generally bad practice
// FB truncates long URLs and they break the reading flow
// Better to use link posts or put links in comments

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
      'Nedostatek příspěvků s textem'
    )
  }

  // Count posts with inline links
  const postsWithInlineLinks = postsWithText.filter((p) => p.has_inline_links)
  const inlineLinkPercentage = (postsWithInlineLinks.length / postsWithText.length) * 100

  // Lower is better - inline links are bad
  let score: number
  if (inlineLinkPercentage <= 5) {
    score = 95
  } else if (inlineLinkPercentage <= 15) {
    score = 80
  } else if (inlineLinkPercentage <= 30) {
    score = 65
  } else if (inlineLinkPercentage <= 50) {
    score = 45
  } else {
    score = 30
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
        ? 'Vyhněte se odkazům přímo v textu. Použijte link post nebo odkaz v komentáři'
        : undefined,
    details: {
      currentValue: formatPercent(inlineLinkPercentage, 0) + ' příspěvků s odkazy',
      targetValue: '≤5%',
      context: `Inline odkazy snižují reach a narušují čtení`,
      metrics: {
        postsWithInlineLinks: postsWithInlineLinks.length,
        totalPosts: postsWithText.length,
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
