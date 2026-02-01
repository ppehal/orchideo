import type { TriggerRule, TriggerInput, TriggerEvaluation } from '../../types'
import { getStatus, createFallbackEvaluation, formatPercent } from '../../utils'
import { registerTrigger } from '../../registry'
import { getCategoryKey } from '@/lib/constants/trigger-categories/share-001'

const TRIGGER_ID = 'SHARE_001'
const TRIGGER_NAME = 'Sdílené příspěvky'
const TRIGGER_DESCRIPTION = 'Podíl sdíleného vs. originálního obsahu'
const TRIGGER_CATEGORY = 'SHARING' as const

// Ideal: max 20% shared content, majority should be original

function evaluate(input: TriggerInput): TriggerEvaluation {
  const { posts90d } = input

  if (posts90d.length < 10) {
    return createFallbackEvaluation(
      TRIGGER_ID,
      TRIGGER_NAME,
      TRIGGER_DESCRIPTION,
      TRIGGER_CATEGORY,
      'INSUFFICIENT_DATA',
      'Nedostatek příspěvků pro analýzu'
    )
  }

  // Count shared posts
  const sharedPosts = posts90d.filter((p) => p.is_shared_post)
  const sharedCount = sharedPosts.length
  const sharedPct = (sharedCount / posts90d.length) * 100

  // Calculate engagement comparison
  const originalPosts = posts90d.filter((p) => !p.is_shared_post)
  const avgSharedEngagement =
    sharedPosts.length > 0
      ? sharedPosts.reduce((sum, p) => sum + p.total_engagement, 0) / sharedPosts.length
      : 0
  const avgOriginalEngagement =
    originalPosts.length > 0
      ? originalPosts.reduce((sum, p) => sum + p.total_engagement, 0) / originalPosts.length
      : 0

  // Score based on shared content ratio
  let score: number
  if (sharedPct <= 10) {
    score = 95 // Excellent - mostly original content
  } else if (sharedPct <= 20) {
    score = 85 // Good balance
  } else if (sharedPct <= 30) {
    score = 70 // Acceptable
  } else if (sharedPct <= 50) {
    score = 55 // Too much shared content
  } else {
    score = 40 // Majority is shared - not good
  }

  // Bonus if original content performs better
  if (originalPosts.length > 0 && avgOriginalEngagement > avgSharedEngagement * 1.2) {
    score = Math.min(95, score + 5)
  }

  let recommendation: string | undefined
  if (sharedPct > 20) {
    recommendation = `Snižte podíl sdíleného obsahu z ${formatPercent(sharedPct, 0)} na max 20%. Originální obsah má lepší dosah.`
  } else if (score < 85 && avgSharedEngagement > avgOriginalEngagement) {
    recommendation =
      'Sdílený obsah má vyšší engagement - analyzujte, co funguje a inspirujte se pro vlastní tvorbu'
  }

  // Calculate category key for detail page
  const categoryKey = getCategoryKey(posts90d.length, sharedPct)

  // Extended data for detail page
  const inputParams = [
    { key: 'totalPosts', label: 'Celkem příspěvků', value: posts90d.length.toString() },
    { key: 'sharedCount', label: 'Sdílených příspěvků', value: sharedCount.toString() },
    {
      key: 'originalCount',
      label: 'Originálních příspěvků',
      value: originalPosts.length.toString(),
    },
    { key: 'sharedPct', label: 'Podíl sdíleného obsahu', value: formatPercent(sharedPct, 1) },
    {
      key: 'avgSharedEngagement',
      label: 'Avg engagement (sdílené)',
      value: avgSharedEngagement.toFixed(1),
    },
    {
      key: 'avgOriginalEngagement',
      label: 'Avg engagement (originální)',
      value: avgOriginalEngagement.toFixed(1),
    },
  ]

  return {
    id: TRIGGER_ID,
    name: TRIGGER_NAME,
    description: TRIGGER_DESCRIPTION,
    category: TRIGGER_CATEGORY,
    score,
    status: getStatus(score),
    recommendation,
    details: {
      currentValue: `${formatPercent(sharedPct, 0)} sdíleného obsahu`,
      targetValue: '≤20%',
      context: `${sharedCount} sdílených z ${posts90d.length} příspěvků`,
      metrics: {
        sharedPct: Number(sharedPct.toFixed(1)),
        sharedCount,
        originalCount: originalPosts.length,
        avgSharedEngagement: Number(avgSharedEngagement.toFixed(1)),
        avgOriginalEngagement: Number(avgOriginalEngagement.toFixed(1)),
        // Extended for detail page
        _inputParams: JSON.stringify(inputParams),
        _formula: `sharedPct = sharedCount / totalPosts * 100
Kategorie: ≤10% → EXCELLENT, ≤20% → GOOD, ≤30% → ACCEPTABLE`,
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
