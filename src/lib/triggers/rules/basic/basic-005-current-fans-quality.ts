import type { TriggerRule, TriggerInput, TriggerEvaluation } from '../../types'
import { getStatus, createFallbackEvaluation, formatPercent } from '../../utils'
import { registerTrigger } from '../../registry'
import {
  getCategoryKey,
  getFanCountCategory,
  BASIC_005_REACH_THRESHOLDS,
} from '@/lib/constants/trigger-categories/basic-005'

const TRIGGER_ID = 'BASIC_005'
const TRIGGER_NAME = 'Kvalita současných fanoušků'
const TRIGGER_DESCRIPTION = 'Organický reach jako procento z počtu fanoušků'
const TRIGGER_CATEGORY = 'BASIC' as const

// Organic reach rate thresholds based on fan count
// Larger pages have lower organic reach due to FB algorithm
const THRESHOLDS = {
  SMALL: {
    // < 2000 fans
    excellent: 0.25, // 25%
    good: 0.15, // 15%
    needsImprovement: 0.08, // 8%
  },
  MEDIUM: {
    // 2000 - 10000 fans
    excellent: 0.15, // 15%
    good: 0.08, // 8%
    needsImprovement: 0.04, // 4%
  },
  LARGE: {
    // > 10000 fans
    excellent: 0.08, // 8%
    good: 0.04, // 4%
    needsImprovement: 0.02, // 2%
  },
}

function getThresholds(fanCount: number) {
  if (fanCount < 2000) return THRESHOLDS.SMALL
  if (fanCount <= 10000) return THRESHOLDS.MEDIUM
  return THRESHOLDS.LARGE
}

function evaluate(input: TriggerInput): TriggerEvaluation {
  const { insights28d, pageData, posts90d } = input

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

  // Try to get organic reach from insights
  let organicReach: number | null = null
  let reachSource = 'insights'

  if (insights28d && insights28d.page_impressions_organic !== null) {
    organicReach = insights28d.page_impressions_organic
  } else if (insights28d && insights28d.page_impressions_unique !== null) {
    // Fallback to unique impressions if organic not available
    organicReach = insights28d.page_impressions_unique
    reachSource = 'unique impressions'
  }

  // If no insights, try to estimate from post reach data
  if (organicReach === null) {
    const postsWithReach = posts90d.filter((p) => p.reach !== null)
    if (postsWithReach.length >= 5) {
      const avgPostReach =
        postsWithReach.reduce((sum, p) => sum + (p.reach ?? 0), 0) / postsWithReach.length
      // Estimate monthly organic reach (roughly 30 posts worth)
      organicReach = avgPostReach * 30
      reachSource = 'estimated from posts'
    }
  }

  if (organicReach === null) {
    return createFallbackEvaluation(
      TRIGGER_ID,
      TRIGGER_NAME,
      TRIGGER_DESCRIPTION,
      TRIGGER_CATEGORY,
      'METRIC_UNAVAILABLE',
      input.collectionMetadata?.insightsErrorMessage ||
        'Data o organickém dosahu nejsou dostupná (vyžadují oprávnění read_insights)'
    )
  }

  // Calculate organic reach rate
  const organicReachRate = organicReach / fanCount

  // Get appropriate thresholds
  const thresholds = getThresholds(fanCount)

  // Calculate score
  let score: number
  if (organicReachRate >= thresholds.excellent) {
    score = 95
  } else if (organicReachRate >= thresholds.good) {
    score = 80
  } else if (organicReachRate >= thresholds.needsImprovement) {
    score = 60
  } else {
    score = 35
  }

  const reachPct = organicReachRate * 100

  // Calculate average reach per post for category determination
  const postsWithReach = posts90d.filter((p) => p.reach !== null)
  const avgReachPerPost =
    postsWithReach.length > 0
      ? postsWithReach.reduce((sum, p) => sum + (p.reach ?? 0), 0) / postsWithReach.length
      : organicReach / 30 // Fallback estimate

  // Get category key for detail page
  const categoryKey = getCategoryKey(fanCount, avgReachPerPost)
  const fanCategory = getFanCountCategory(fanCount)
  const reachThreshold = BASIC_005_REACH_THRESHOLDS[fanCategory] ?? 0

  // Build input parameters for detail page
  const inputParams = [
    { key: 'fanCount', label: 'Počet fanoušků', value: fanCount.toLocaleString('cs-CZ') },
    {
      key: 'avgReachPerPost',
      label: 'Průměrný organický dosah/post',
      value: Math.round(avgReachPerPost).toLocaleString('cs-CZ'),
    },
    {
      key: 'reachThreshold',
      label: 'Threshold pro kvalitní dosah',
      value: reachThreshold > 0 ? reachThreshold.toLocaleString('cs-CZ') : 'N/A',
    },
    {
      key: 'organicReach',
      label: 'Celkový organický dosah (30d)',
      value: organicReach.toLocaleString('cs-CZ'),
    },
    { key: 'reachSource', label: 'Zdroj dat', value: reachSource },
  ]

  return {
    id: TRIGGER_ID,
    name: TRIGGER_NAME,
    description: TRIGGER_DESCRIPTION,
    category: TRIGGER_CATEGORY,
    score,
    status: getStatus(score),
    recommendation:
      score < 85
        ? 'Zlepšete organický dosah tvorbou obsahu, který FB algoritmus upřednostňuje (video, engagement)'
        : undefined,
    details: {
      currentValue: formatPercent(reachPct, 1),
      targetValue: `≥${formatPercent(thresholds.good * 100, 0)}`,
      context: `${organicReach.toLocaleString('cs-CZ')} organický reach při ${fanCount.toLocaleString('cs-CZ')} fanoušcích (${reachSource})`,
      metrics: {
        organicReach,
        fanCount,
        organicReachRate: Number(organicReachRate.toFixed(4)),
        reachSource,
        avgReachPerPost: Math.round(avgReachPerPost),
        // Extended data for detail page
        _inputParams: JSON.stringify(inputParams),
        _formula:
          'avgReachPerPost = sum(post.reach) / posts.count\nfanCategory = categorize(fanCount)\nreachQuality = avgReachPerPost >= threshold ? HIGH : LOW',
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
