import type { TriggerRule, TriggerInput, TriggerEvaluation } from '../../types'
import { getStatus, createFallbackEvaluation, formatPercent } from '../../utils'
import { registerTrigger } from '../../registry'
import { getCategoryKey } from '@/lib/constants/trigger-categories/basic-001'

const TRIGGER_ID = 'BASIC_001'
const TRIGGER_NAME = 'Interakce na příspěvek'
const TRIGGER_DESCRIPTION = 'Průměrný engagement rate vzhledem k počtu fanoušků'
const TRIGGER_CATEGORY = 'BASIC' as const

// Engagement rate thresholds based on fan count clusters
// Smaller pages typically have higher engagement rates
const THRESHOLDS = {
  SMALL: {
    // < 2000 fans
    excellent: 0.05, // 5%
    good: 0.03, // 3%
    needsImprovement: 0.015, // 1.5%
  },
  MEDIUM: {
    // 2000 - 10000 fans
    excellent: 0.03, // 3%
    good: 0.02, // 2%
    needsImprovement: 0.01, // 1%
  },
  LARGE: {
    // > 10000 fans
    excellent: 0.02, // 2%
    good: 0.012, // 1.2%
    needsImprovement: 0.006, // 0.6%
  },
}

function getThresholds(fanCount: number) {
  if (fanCount < 2000) return THRESHOLDS.SMALL
  if (fanCount <= 10000) return THRESHOLDS.MEDIUM
  return THRESHOLDS.LARGE
}

function evaluate(input: TriggerInput): TriggerEvaluation {
  const { posts90d, pageData } = input

  const fanCount = pageData.fan_count

  if (!fanCount || fanCount === 0) {
    return createFallbackEvaluation(
      TRIGGER_ID,
      TRIGGER_NAME,
      TRIGGER_DESCRIPTION,
      TRIGGER_CATEGORY,
      'METRIC_UNAVAILABLE',
      'Počet fanoušků není dostupný'
    )
  }

  if (posts90d.length < 5) {
    return createFallbackEvaluation(
      TRIGGER_ID,
      TRIGGER_NAME,
      TRIGGER_DESCRIPTION,
      TRIGGER_CATEGORY,
      'INSUFFICIENT_DATA',
      'Nedostatek příspěvků pro výpočet engagement rate'
    )
  }

  // Calculate average engagement per post
  const totalEngagement = posts90d.reduce((sum, p) => sum + p.total_engagement, 0)
  const avgEngagement = totalEngagement / posts90d.length

  // Calculate engagement rate
  const engagementRate = avgEngagement / fanCount

  // Get appropriate thresholds
  const thresholds = getThresholds(fanCount)

  // Calculate score
  let score: number
  if (engagementRate >= thresholds.excellent) {
    score = 95
  } else if (engagementRate >= thresholds.good) {
    score = 80
  } else if (engagementRate >= thresholds.needsImprovement) {
    score = 60
  } else {
    score = 35
  }

  const engagementPct = engagementRate * 100

  // Calculate posts per month (90 days = 3 months)
  const postsPerMonth = posts90d.length / 3

  // Get category key for detail page
  const categoryKey = getCategoryKey(fanCount, postsPerMonth, avgEngagement)

  // Build input parameters for detail page
  const inputParams = [
    { key: 'fanCount', label: 'Počet fanoušků', value: fanCount.toLocaleString('cs-CZ') },
    { key: 'posts90d', label: 'Postů za 90 dní', value: posts90d.length },
    {
      key: 'postsPerMonth',
      label: 'Postů/měsíc (průměr)',
      value: Math.round(postsPerMonth),
    },
    { key: 'totalInteractions', label: 'Interakcí celkem', value: totalEngagement },
    {
      key: 'avgInteractions',
      label: 'Interakcí/post',
      value: Number(avgEngagement.toFixed(1)),
    },
    { key: 'engagementRate', label: 'Engagement rate', value: formatPercent(engagementPct, 2) },
  ]

  return {
    id: TRIGGER_ID,
    name: TRIGGER_NAME,
    description: TRIGGER_DESCRIPTION,
    category: TRIGGER_CATEGORY,
    score,
    status: getStatus(score),
    recommendation:
      score < 85 ? 'Zvyšte interakce pomocí otázek, anket a CTA v příspěvcích' : undefined,
    details: {
      currentValue: formatPercent(engagementPct, 2),
      targetValue: `≥${formatPercent(thresholds.good * 100, 1)}`,
      context: `Průměrně ${avgEngagement.toFixed(1)} interakcí na příspěvek při ${fanCount.toLocaleString('cs-CZ')} fanoušcích`,
      metrics: {
        avgEngagement: Number(avgEngagement.toFixed(2)),
        engagementRate: Number(engagementRate.toFixed(4)),
        fanCount,
        postsAnalyzed: posts90d.length,
        // Extended data for detail page (prefixed with _ to mark as internal)
        _inputParams: JSON.stringify(inputParams),
        _formula:
          'avgEngagement = totalInteractions / posts\nengagementRate = avgEngagement / fans',
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
