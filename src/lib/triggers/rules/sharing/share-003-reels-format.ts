import type { TriggerRule, TriggerInput, TriggerEvaluation } from '../../types'
import { getStatus, createFallbackEvaluation, formatPercent } from '../../utils'
import { registerTrigger } from '../../registry'
import { getCategoryKey } from '@/lib/constants/trigger-categories/share-003'

const TRIGGER_ID = 'SHARE_003'
const TRIGGER_NAME = 'Reels formát'
const TRIGGER_DESCRIPTION = 'Využití Facebook Reels pro vyšší dosah'
const TRIGGER_CATEGORY = 'SHARING' as const

// Reels typically have higher organic reach than regular posts
// Ideal: 10-30% of content should be Reels

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

  // Count Reels
  const reelsPosts = posts90d.filter((p) => p.is_reel || p.type === 'reel')
  const reelsCount = reelsPosts.length
  const reelsPct = (reelsCount / posts90d.length) * 100

  // Compare engagement: Reels vs other content
  const nonReelsPosts = posts90d.filter((p) => !p.is_reel && p.type !== 'reel')
  const avgReelsEngagement =
    reelsPosts.length > 0
      ? reelsPosts.reduce((sum, p) => sum + p.total_engagement, 0) / reelsPosts.length
      : 0
  const avgOtherEngagement =
    nonReelsPosts.length > 0
      ? nonReelsPosts.reduce((sum, p) => sum + p.total_engagement, 0) / nonReelsPosts.length
      : 0

  // Score based on Reels usage
  let score: number
  if (reelsPct >= 15 && reelsPct <= 35) {
    score = 90 // Ideal Reels usage
  } else if (reelsPct >= 10 && reelsPct <= 40) {
    score = 80 // Good usage
  } else if (reelsPct >= 5) {
    score = 70 // Some usage
  } else if (reelsCount > 0) {
    score = 60 // Minimal usage
  } else {
    score = 50 // No Reels at all
  }

  // Bonus if Reels perform better
  if (reelsPosts.length >= 3 && avgReelsEngagement > avgOtherEngagement * 1.3) {
    score = Math.min(95, score + 5)
  }

  let recommendation: string | undefined
  if (reelsCount === 0) {
    recommendation = 'Začněte využívat Reels - mají vyšší organický dosah než běžné příspěvky'
  } else if (reelsPct < 10) {
    recommendation = `Zvyšte podíl Reels z ${formatPercent(reelsPct, 0)} na 15-30% pro lepší dosah`
  } else if (reelsPct > 50) {
    recommendation =
      'Diversifikujte obsah - příliš mnoho Reels může omezit engagement na jiných formátech'
  } else if (reelsPosts.length >= 3 && avgReelsEngagement < avgOtherEngagement * 0.7) {
    recommendation =
      'Vaše Reels mají nižší engagement než ostatní obsah - zkuste jiný styl nebo témata'
  }

  // Calculate category key for detail page
  const categoryKey = getCategoryKey(posts90d.length, reelsPct)

  // Extended data for detail page
  const inputParams = [
    { key: 'totalPosts', label: 'Celkem příspěvků', value: posts90d.length.toString() },
    { key: 'reelsCount', label: 'Počet Reels', value: reelsCount.toString() },
    { key: 'reelsPct', label: 'Podíl Reels', value: formatPercent(reelsPct, 1) },
    {
      key: 'avgReelsEngagement',
      label: 'Avg engagement (Reels)',
      value: avgReelsEngagement.toFixed(1),
    },
    {
      key: 'avgOtherEngagement',
      label: 'Avg engagement (ostatní)',
      value: avgOtherEngagement.toFixed(1),
    },
    {
      key: 'reelsPerformanceRatio',
      label: 'Výkon Reels vs ostatní',
      value:
        avgOtherEngagement > 0
          ? `${((avgReelsEngagement / avgOtherEngagement) * 100).toFixed(0)}%`
          : 'N/A',
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
      currentValue: reelsCount > 0 ? `${formatPercent(reelsPct, 0)} Reels obsahu` : 'Bez Reels',
      targetValue: '15-30%',
      context:
        reelsCount > 0
          ? `${reelsCount} Reels z ${posts90d.length} příspěvků`
          : 'Doporučujeme začít s Reels formátem',
      metrics: {
        reelsPct: Number(reelsPct.toFixed(1)),
        reelsCount,
        totalPosts: posts90d.length,
        avgReelsEngagement: Number(avgReelsEngagement.toFixed(1)),
        avgOtherEngagement: Number(avgOtherEngagement.toFixed(1)),
        reelsPerformanceRatio:
          avgOtherEngagement > 0
            ? Number((avgReelsEngagement / avgOtherEngagement).toFixed(2))
            : null,
        // Extended for detail page
        _inputParams: JSON.stringify(inputParams),
        _formula: `reelsPct = reelsCount / totalPosts * 100
Kategorie: 15-35% → OPTIMAL, 5-15% → LOW, 0% → NONE`,
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
