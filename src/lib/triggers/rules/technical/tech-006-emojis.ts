import type { TriggerRule, TriggerInput, TriggerEvaluation } from '../../types'
import { getStatus, createFallbackEvaluation } from '../../utils'
import { registerTrigger } from '../../registry'
import { getCategoryKey } from '@/lib/constants/trigger-categories/tech-006'

const TRIGGER_ID = 'TECH_006'
const TRIGGER_NAME = 'Emotikony'
const TRIGGER_DESCRIPTION = 'Využití emotikonů v textech příspěvků'
const TRIGGER_CATEGORY = 'TECHNICAL' as const

// Ideal emoji count per post
const IDEAL_MIN = 2
const IDEAL_MAX = 4
const MAX_ACCEPTABLE = 6

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

  // Calculate average emoji count
  const totalEmojis = postsWithText.reduce((sum, p) => sum + p.emoji_count, 0)
  const avgEmojis = totalEmojis / postsWithText.length

  // Count posts in each category
  let noEmojiCount = 0
  let idealCount = 0
  let tooManyCount = 0

  for (const post of postsWithText) {
    if (post.emoji_count === 0) {
      noEmojiCount++
    } else if (post.emoji_count >= IDEAL_MIN && post.emoji_count <= IDEAL_MAX) {
      idealCount++
    } else if (post.emoji_count > MAX_ACCEPTABLE) {
      tooManyCount++
    }
  }

  const idealPercentage = (idealCount / postsWithText.length) * 100
  const noEmojiPercentage = (noEmojiCount / postsWithText.length) * 100
  const tooManyPercentage = (tooManyCount / postsWithText.length) * 100

  // Calculate score
  let score: number
  if (avgEmojis >= IDEAL_MIN && avgEmojis <= IDEAL_MAX && idealPercentage >= 50) {
    score = 95
  } else if (avgEmojis >= 1 && avgEmojis <= 5) {
    score = 80
  } else if (noEmojiPercentage > 50) {
    // Too few emojis
    score = 55
  } else if (tooManyPercentage > 30) {
    // Too many emojis
    score = 50
  } else {
    score = 65
  }

  let recommendation: string | undefined
  if (noEmojiPercentage > 50) {
    recommendation = 'Přidejte 2-4 emotikony do příspěvků pro větší engagement'
  } else if (tooManyPercentage > 30) {
    recommendation = 'Omezte počet emotikonů na 2-4 na příspěvek, více působí neprofesionálně'
  } else if (avgEmojis < IDEAL_MIN) {
    recommendation = 'Zvyšte používání emotikonů na průměrně 2-4 na příspěvek'
  }

  // Calculate category key for detail page
  const categoryKey = getCategoryKey(
    postsWithText.length,
    avgEmojis,
    noEmojiPercentage,
    tooManyPercentage
  )

  // Extended data for detail page
  const inputParams = [
    { key: 'totalPosts', label: 'Příspěvků s textem', value: postsWithText.length.toString() },
    { key: 'avgEmojis', label: 'Průměrný počet emoji', value: avgEmojis.toFixed(1) },
    { key: 'noEmojiCount', label: 'Bez emoji', value: noEmojiCount.toString() },
    { key: 'idealCount', label: 'Ideální počet (2-4)', value: idealCount.toString() },
    { key: 'tooManyCount', label: 'Příliš emoji (7+)', value: tooManyCount.toString() },
  ]

  return {
    id: TRIGGER_ID,
    name: TRIGGER_NAME,
    description: TRIGGER_DESCRIPTION,
    category: TRIGGER_CATEGORY,
    score,
    status: getStatus(score),
    recommendation: score < 85 ? recommendation : undefined,
    details: {
      currentValue: `${avgEmojis.toFixed(1)} průměrně`,
      targetValue: `${IDEAL_MIN}-${IDEAL_MAX} na příspěvek`,
      context: `${idealPercentage.toFixed(0)}% příspěvků má ideální počet emotikonů`,
      metrics: {
        avgEmojis: Number(avgEmojis.toFixed(2)),
        noEmojiCount,
        idealCount,
        tooManyCount,
        // Extended for detail page
        _inputParams: JSON.stringify(inputParams),
        _formula: `Ideální: 2-4 emoji na příspěvek
Kategorie: noEmoji >50% → TOO_FEW, tooMany >30% → TOO_MANY, jinak IDEAL`,
        _categoryKey: categoryKey,
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
