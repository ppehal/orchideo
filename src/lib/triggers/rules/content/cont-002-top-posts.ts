import type { TriggerRule, TriggerInput, TriggerEvaluation } from '../../types'
import { getStatus, createFallbackEvaluation } from '../../utils'
import { registerTrigger } from '../../registry'
import { getCategoryKey } from '@/lib/constants/trigger-categories/cont-002'

const TRIGGER_ID = 'CONT_002'
const TRIGGER_NAME = 'Nejsilnější posty'
const TRIGGER_DESCRIPTION = 'Analýza top 10% nejúspěšnějších příspěvků'
const TRIGGER_CATEGORY = 'CONTENT' as const

function evaluate(input: TriggerInput): TriggerEvaluation {
  const { posts90d } = input

  if (posts90d.length < 10) {
    return createFallbackEvaluation(
      TRIGGER_ID,
      TRIGGER_NAME,
      TRIGGER_DESCRIPTION,
      TRIGGER_CATEGORY,
      'INSUFFICIENT_DATA',
      'Nedostatek příspěvků pro analýzu top postů'
    )
  }

  // Sort posts by engagement
  const sortedPosts = [...posts90d].sort((a, b) => b.total_engagement - a.total_engagement)

  // Get top 10%
  const topCount = Math.max(1, Math.ceil(posts90d.length * 0.1))
  const topPosts = sortedPosts.slice(0, topCount)

  // Get top 3 post IDs for display
  const topPostIds = topPosts.slice(0, 3).map((p) => p.id)

  // Calculate average engagement of top posts
  const avgTopEngagement =
    topPosts.reduce((sum, p) => sum + p.total_engagement, 0) / topPosts.length

  // Calculate overall average engagement
  const overallAvg = posts90d.reduce((sum, p) => sum + p.total_engagement, 0) / posts90d.length

  // Top posts should be significantly better than average
  const topToAvgRatio = avgTopEngagement / (overallAvg || 1)

  // Analyze common traits of top posts
  const topTypes = topPosts.reduce(
    (acc, p) => {
      acc[p.type] = (acc[p.type] || 0) + 1
      return acc
    },
    {} as Record<string, number>
  )

  const dominantType = Object.entries(topTypes).sort((a, b) => b[1] - a[1])[0]
  const hasMedia = topPosts.filter((p) => p.has_media).length
  const avgMessageLength = topPosts.reduce((sum, p) => sum + p.message_length, 0) / topPosts.length

  // Score based on ratio and consistency
  let score: number
  if (topToAvgRatio >= 3) {
    score = 95 // Top posts are 3x+ better - great content strategy
  } else if (topToAvgRatio >= 2) {
    score = 85
  } else if (topToAvgRatio >= 1.5) {
    score = 70
  } else {
    score = 55 // Low variance - either all good or all mediocre
  }

  // Format top type for display
  const typeNames: Record<string, string> = {
    photo: 'fotky',
    video: 'videa',
    link: 'odkazy',
    status: 'statusy',
    reel: 'reels',
    shared: 'sdílené',
    other: 'ostatní',
  }

  const bestType = dominantType ? typeNames[dominantType[0]] || dominantType[0] : 'různé'
  const bestTypeCount = dominantType ? dominantType[1] : 0
  const bestTypePct = topCount > 0 ? (bestTypeCount / topCount) * 100 : 0

  // Calculate category key for detail page
  const categoryKey = getCategoryKey(posts90d.length, topToAvgRatio)

  // Extended data for detail page
  const inputParams = [
    { key: 'totalPosts', label: 'Celkem příspěvků', value: posts90d.length.toString() },
    { key: 'topCount', label: 'Top příspěvků (10%)', value: topCount.toString() },
    {
      key: 'avgTopEngagement',
      label: 'Průměrný engagement top',
      value: avgTopEngagement.toFixed(1),
    },
    { key: 'overallAvg', label: 'Celkový průměr', value: overallAvg.toFixed(1) },
    { key: 'topToAvgRatio', label: 'Poměr top/průměr', value: `${topToAvgRatio.toFixed(1)}×` },
    { key: 'bestType', label: 'Nejčastější formát', value: bestType },
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
        ? `Zaměřte se na tvorbu více obsahu typu "${bestType}" - je ve vašich top postech`
        : undefined,
    details: {
      currentValue: `Top posty mají ${topToAvgRatio.toFixed(1)}× více engagementu`,
      targetValue: '≥2× více než průměr',
      context: `Analyzováno ${topCount} top postů z ${posts90d.length}. Nejčastější formát: ${bestType} (${bestTypePct.toFixed(0)}%)`,
      metrics: {
        topCount,
        avgTopEngagement: Number(avgTopEngagement.toFixed(1)),
        overallAvg: Number(overallAvg.toFixed(1)),
        topToAvgRatio: Number(topToAvgRatio.toFixed(2)),
        bestType: dominantType?.[0] || 'mixed',
        hasMediaPct: (hasMedia / topCount) * 100,
        avgMessageLength: Number(avgMessageLength.toFixed(0)),
        // Extended for detail page
        _topPostIds: JSON.stringify(topPostIds),
        _inputParams: JSON.stringify(inputParams),
        _formula: `topToAvgRatio = avgTopEngagement / overallAvg
Kategorie: ≥3× → EXCELLENT, 2-3× → HIGH, 1.5-2× → MEDIUM, <1.5× → LOW`,
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
