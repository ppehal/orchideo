import type { TriggerRule, TriggerInput, TriggerEvaluation } from '../../types'
import { getStatus, createFallbackEvaluation } from '../../utils'
import { registerTrigger } from '../../registry'
import { getCategoryKey } from '@/lib/constants/trigger-categories/time-001'

const TRIGGER_ID = 'TIME_001'
const TRIGGER_NAME = 'Nejlepší hodiny'
const TRIGGER_DESCRIPTION = 'Analýza nejvýkonnějších hodin pro publikování'
const TRIGGER_CATEGORY = 'TIMING' as const

interface HourStats {
  hour: number
  count: number
  totalEngagement: number
  avgEngagement: number
}

function evaluate(input: TriggerInput): TriggerEvaluation {
  const { posts90d } = input

  if (posts90d.length < 20) {
    return createFallbackEvaluation(
      TRIGGER_ID,
      TRIGGER_NAME,
      TRIGGER_DESCRIPTION,
      TRIGGER_CATEGORY,
      'INSUFFICIENT_DATA',
      'Nedostatek příspěvků pro analýzu časování (min. 20)'
    )
  }

  // Group posts by hour
  const hourStats = new Map<number, HourStats>()

  for (const post of posts90d) {
    const hour = new Date(post.created_time).getHours()
    const existing = hourStats.get(hour) || { hour, count: 0, totalEngagement: 0, avgEngagement: 0 }
    existing.count++
    existing.totalEngagement += post.total_engagement
    hourStats.set(hour, existing)
  }

  // Calculate averages
  for (const stats of hourStats.values()) {
    stats.avgEngagement = stats.count > 0 ? stats.totalEngagement / stats.count : 0
  }

  // Get hours with enough samples (at least 2 posts)
  const validHours = Array.from(hourStats.values())
    .filter((h) => h.count >= 2)
    .sort((a, b) => b.avgEngagement - a.avgEngagement)

  if (validHours.length < 3) {
    return createFallbackEvaluation(
      TRIGGER_ID,
      TRIGGER_NAME,
      TRIGGER_DESCRIPTION,
      TRIGGER_CATEGORY,
      'INSUFFICIENT_DATA',
      'Nedostatek dat pro různé hodiny'
    )
  }

  // Best hours (top 3 by engagement)
  const bestHours = validHours.slice(0, 3)

  // Calculate overall average
  const overallAvg = posts90d.reduce((sum, p) => sum + p.total_engagement, 0) / posts90d.length

  // Check if user is posting during best hours
  const bestHourSet = new Set(bestHours.map((h) => h.hour))
  const postsInBestHours = posts90d.filter((p) =>
    bestHourSet.has(new Date(p.created_time).getHours())
  ).length
  const bestHoursPct = (postsInBestHours / posts90d.length) * 100

  // Score based on posting in optimal times
  let score: number
  if (bestHoursPct >= 50) {
    score = 90 // Majority of posts in best hours
  } else if (bestHoursPct >= 30) {
    score = 75
  } else if (bestHoursPct >= 15) {
    score = 60
  } else {
    score = 45 // Rarely posting in best hours
  }

  // Format hours for display
  const formatHour = (h: number) => `${h}:00`
  const bestHoursDisplay = bestHours.map((h) => formatHour(h.hour)).join(', ')

  let recommendation: string | undefined
  if (score < 85) {
    recommendation = `Publikujte více v časech ${bestHoursDisplay} - mají nejvyšší engagement`
  }

  // Calculate category key for detail page
  const categoryKey = getCategoryKey(posts90d.length, bestHoursPct, true)

  // Extended data for detail page
  const inputParams = [
    { key: 'totalPosts', label: 'Celkem příspěvků', value: posts90d.length.toString() },
    { key: 'hoursAnalyzed', label: 'Analyzovaných hodin', value: validHours.length.toString() },
    { key: 'bestHours', label: 'Nejlepší hodiny', value: bestHoursDisplay },
    {
      key: 'bestHourEngagement',
      label: 'Avg engagement (top)',
      value: bestHours[0]?.avgEngagement.toFixed(1) ?? '0',
    },
    { key: 'postsInBestHours', label: 'Postů v top hodinách', value: postsInBestHours.toString() },
    { key: 'bestHoursPct', label: 'Podíl v top hodinách', value: `${bestHoursPct.toFixed(1)}%` },
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
      currentValue: `${bestHoursPct.toFixed(0)}% postů v nejlepších hodinách`,
      targetValue: '≥50% v optimálních časech',
      context: `Nejlepší hodiny: ${bestHoursDisplay}`,
      metrics: {
        bestHour1: bestHours[0]?.hour ?? null,
        bestHour2: bestHours[1]?.hour ?? null,
        bestHour3: bestHours[2]?.hour ?? null,
        bestHourEngagement: Number(bestHours[0]?.avgEngagement.toFixed(1) ?? 0),
        postsInBestHoursPct: Number(bestHoursPct.toFixed(1)),
        overallAvgEngagement: Number(overallAvg.toFixed(1)),
        hoursAnalyzed: validHours.length,
        // Extended for detail page
        _inputParams: JSON.stringify(inputParams),
        _formula: `bestHoursPct = postsInBestHours / totalPosts * 100
Kategorie: ≥50% → EXCELLENT, ≥30% → GOOD, ≥15% → FAIR`,
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
