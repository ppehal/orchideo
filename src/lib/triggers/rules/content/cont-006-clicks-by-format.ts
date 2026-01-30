import type { TriggerRule, TriggerInput, TriggerEvaluation } from '../../types'
import { getStatus, createFallbackEvaluation } from '../../utils'
import { registerTrigger } from '../../registry'

const TRIGGER_ID = 'CONT_006'
const TRIGGER_NAME = 'Prokliky dle formátu'
const TRIGGER_DESCRIPTION = 'Analýza prokliků podle typu příspěvku'
const TRIGGER_CATEGORY = 'CONTENT' as const

interface FormatClickStats {
  type: string
  count: number
  totalClicks: number
  avgClicks: number
}

function evaluate(input: TriggerInput): TriggerEvaluation {
  const { posts90d } = input

  // Filter posts with click data
  const postsWithClicks = posts90d.filter((p) => p.clicks !== null)

  if (postsWithClicks.length < 5) {
    // Fallback: analyze based on engagement as proxy for clicks
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

    // Use engagement as click proxy
    return evaluateWithEngagementProxy(posts90d)
  }

  // Group by format and calculate click stats
  const formatStats = new Map<string, FormatClickStats>()

  for (const post of postsWithClicks) {
    const type = post.type
    const existing = formatStats.get(type) || { type, count: 0, totalClicks: 0, avgClicks: 0 }
    existing.count++
    existing.totalClicks += post.clicks ?? 0
    formatStats.set(type, existing)
  }

  // Calculate averages
  for (const stats of formatStats.values()) {
    stats.avgClicks = stats.count > 0 ? stats.totalClicks / stats.count : 0
  }

  // Sort by average clicks
  const sortedStats = Array.from(formatStats.values())
    .filter((s) => s.count >= 2) // Only formats with enough samples
    .sort((a, b) => b.avgClicks - a.avgClicks)

  if (sortedStats.length === 0) {
    return createFallbackEvaluation(
      TRIGGER_ID,
      TRIGGER_NAME,
      TRIGGER_DESCRIPTION,
      TRIGGER_CATEGORY,
      'INSUFFICIENT_DATA',
      'Nedostatek dat o formátech s prokliky'
    )
  }

  // Safe access - we checked length > 0 above
  const bestFormat = sortedStats[0]!
  const worstFormat = sortedStats[sortedStats.length - 1]!

  // Calculate overall average clicks
  const overallAvgClicks =
    postsWithClicks.reduce((sum, p) => sum + (p.clicks ?? 0), 0) / postsWithClicks.length

  // Score based on click performance spread
  const spreadRatio = bestFormat.avgClicks / (worstFormat.avgClicks || 1)

  let score: number
  if (spreadRatio <= 2 && overallAvgClicks > 10) {
    score = 90 // Good clicks across formats
  } else if (spreadRatio <= 3) {
    score = 75
  } else if (spreadRatio <= 5) {
    score = 60
  } else {
    score = 45 // High variance - some formats performing poorly
  }

  // Type name mapping
  const typeNames: Record<string, string> = {
    photo: 'Fotky',
    video: 'Videa',
    link: 'Odkazy',
    status: 'Statusy',
    reel: 'Reels',
    shared: 'Sdílené',
    other: 'Ostatní',
  }

  const bestTypeName = typeNames[bestFormat.type] || bestFormat.type

  return {
    id: TRIGGER_ID,
    name: TRIGGER_NAME,
    description: TRIGGER_DESCRIPTION,
    category: TRIGGER_CATEGORY,
    score,
    status: getStatus(score),
    recommendation:
      score < 85
        ? `Více využívejte formát "${bestTypeName}" (průměrně ${bestFormat.avgClicks.toFixed(0)} prokliků)`
        : undefined,
    details: {
      currentValue: `${bestTypeName}: ${bestFormat.avgClicks.toFixed(0)} kliků/post`,
      targetValue: 'Rovnoměrné prokliky napříč formáty',
      context: `Analyzováno ${postsWithClicks.length} postů s daty o proklikách`,
      metrics: {
        bestFormat: bestFormat.type,
        bestAvgClicks: Number(bestFormat.avgClicks.toFixed(1)),
        worstFormat: worstFormat.type,
        worstAvgClicks: Number(worstFormat.avgClicks.toFixed(1)),
        overallAvgClicks: Number(overallAvgClicks.toFixed(1)),
        formatsAnalyzed: sortedStats.length,
      },
    },
  }
}

// Fallback evaluation using engagement as click proxy
function evaluateWithEngagementProxy(posts: TriggerInput['posts90d']): TriggerEvaluation {
  // Group by format
  const formatStats = new Map<string, { type: string; count: number; totalEngagement: number }>()

  for (const post of posts) {
    const type = post.type
    const existing = formatStats.get(type) || { type, count: 0, totalEngagement: 0 }
    existing.count++
    existing.totalEngagement += post.total_engagement
    formatStats.set(type, existing)
  }

  // Calculate averages
  const sortedStats = Array.from(formatStats.values())
    .filter((s) => s.count >= 3)
    .map((s) => ({ ...s, avgEngagement: s.totalEngagement / s.count }))
    .sort((a, b) => b.avgEngagement - a.avgEngagement)

  if (sortedStats.length === 0) {
    return createFallbackEvaluation(
      TRIGGER_ID,
      TRIGGER_NAME,
      TRIGGER_DESCRIPTION,
      TRIGGER_CATEGORY,
      'INSUFFICIENT_DATA',
      'Nedostatek dat pro analýzu'
    )
  }

  // Safe access - we checked length > 0 above
  const bestFormat = sortedStats[0]!
  const typeNames: Record<string, string> = {
    photo: 'Fotky',
    video: 'Videa',
    link: 'Odkazy',
    status: 'Statusy',
    reel: 'Reels',
    shared: 'Sdílené',
    other: 'Ostatní',
  }

  const bestTypeName = typeNames[bestFormat.type] || bestFormat.type

  return {
    id: TRIGGER_ID,
    name: TRIGGER_NAME,
    description: TRIGGER_DESCRIPTION,
    category: TRIGGER_CATEGORY,
    score: 70, // Neutral score for proxy data
    status: getStatus(70),
    recommendation: `Nejlepší engagement má formát "${bestTypeName}"`,
    details: {
      currentValue: `${bestTypeName}: ${bestFormat.avgEngagement.toFixed(0)} engagement/post`,
      targetValue: 'Data o proklikách nejsou dostupná',
      reason: 'METRIC_UNAVAILABLE',
      context: 'Engagement použit jako proxy pro prokliky (vyžaduje read_insights)',
      metrics: {
        bestFormat: bestFormat.type,
        bestAvgEngagement: Number(bestFormat.avgEngagement.toFixed(1)),
        formatsAnalyzed: sortedStats.length,
        dataSource: 'engagement_proxy',
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
