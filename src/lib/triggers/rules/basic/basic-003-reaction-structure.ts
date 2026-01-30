import type { TriggerRule, TriggerInput, TriggerEvaluation } from '../../types'
import { getStatus, createFallbackEvaluation, formatPercent } from '../../utils'
import { registerTrigger } from '../../registry'

const TRIGGER_ID = 'BASIC_003'
const TRIGGER_NAME = 'Struktura reakcí'
const TRIGGER_DESCRIPTION = 'Rozložení typů reakcí (like, love, wow, haha, sad, angry)'
const TRIGGER_CATEGORY = 'BASIC' as const

// Thresholds:
// - Too many likes (>90%) = content is too safe/boring
// - Angry reactions should be low (<15%)
// - Diverse reactions are good (love, wow, haha together > 15%)

function evaluate(input: TriggerInput): TriggerEvaluation {
  const { posts90d } = input

  if (posts90d.length < 5) {
    return createFallbackEvaluation(
      TRIGGER_ID,
      TRIGGER_NAME,
      TRIGGER_DESCRIPTION,
      TRIGGER_CATEGORY,
      'INSUFFICIENT_DATA',
      'Nedostatek příspěvků pro analýzu reakcí'
    )
  }

  // Sum up all reaction types
  let totalLike = 0
  let totalLove = 0
  let totalWow = 0
  let totalHaha = 0
  let totalSad = 0
  let totalAngry = 0

  for (const post of posts90d) {
    totalLike += post.reaction_like
    totalLove += post.reaction_love
    totalWow += post.reaction_wow
    totalHaha += post.reaction_haha
    totalSad += post.reaction_sad
    totalAngry += post.reaction_angry
  }

  const totalReactions = totalLike + totalLove + totalWow + totalHaha + totalSad + totalAngry

  if (totalReactions === 0) {
    return createFallbackEvaluation(
      TRIGGER_ID,
      TRIGGER_NAME,
      TRIGGER_DESCRIPTION,
      TRIGGER_CATEGORY,
      'INSUFFICIENT_DATA',
      'Žádné reakce pro analýzu'
    )
  }

  // Calculate percentages
  const likePct = (totalLike / totalReactions) * 100
  const lovePct = (totalLove / totalReactions) * 100
  const wowPct = (totalWow / totalReactions) * 100
  const hahaPct = (totalHaha / totalReactions) * 100
  const sadPct = (totalSad / totalReactions) * 100
  const angryPct = (totalAngry / totalReactions) * 100

  // Positive emotional reactions (excluding plain likes)
  const emotionalPositivePct = lovePct + wowPct + hahaPct
  // Negative reactions
  const negativePct = sadPct + angryPct

  // Score calculation
  let score: number = 70 // Start at baseline

  // Too many plain likes (boring content)
  if (likePct >= 95) {
    score = 45
  } else if (likePct >= 90) {
    score = 55
  } else if (likePct < 80) {
    // Good diversity
    score = 85
  }

  // Bonus for emotional reactions
  if (emotionalPositivePct >= 20) {
    score = Math.min(95, score + 15)
  } else if (emotionalPositivePct >= 10) {
    score = Math.min(90, score + 5)
  }

  // Penalty for negative reactions
  if (angryPct >= 15) {
    score = Math.max(30, score - 25)
  } else if (angryPct >= 10) {
    score = Math.max(40, score - 15)
  } else if (negativePct >= 20) {
    score = Math.max(45, score - 10)
  }

  // Determine recommendation
  let recommendation: string | undefined
  if (likePct >= 90) {
    recommendation = 'Obsah vyvolává převážně pasivní reakce. Zkuste emotivnější příspěvky'
  } else if (angryPct >= 10) {
    recommendation = 'Vysoký podíl negativních reakcí. Přehodnoťte kontroverzní obsah'
  } else if (emotionalPositivePct < 10 && score < 85) {
    recommendation = 'Zvyšte emotivní engagement tvorbou obsahu, který lidi překvapí nebo pobaví'
  }

  return {
    id: TRIGGER_ID,
    name: TRIGGER_NAME,
    description: TRIGGER_DESCRIPTION,
    category: TRIGGER_CATEGORY,
    score,
    status: getStatus(score),
    recommendation,
    details: {
      currentValue: `${formatPercent(likePct, 0)} like, ${formatPercent(lovePct, 0)} love, ${formatPercent(hahaPct, 0)} haha`,
      targetValue: 'Like <90%, emotivní reakce >15%',
      context: `Analyzováno ${totalReactions.toLocaleString('cs-CZ')} reakcí`,
      metrics: {
        likePct: Number(likePct.toFixed(1)),
        lovePct: Number(lovePct.toFixed(1)),
        wowPct: Number(wowPct.toFixed(1)),
        hahaPct: Number(hahaPct.toFixed(1)),
        sadPct: Number(sadPct.toFixed(1)),
        angryPct: Number(angryPct.toFixed(1)),
        emotionalPositivePct: Number(emotionalPositivePct.toFixed(1)),
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
