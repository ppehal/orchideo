import type { TriggerRule, TriggerInput, TriggerEvaluation } from '../../types'
import { getStatus, createFallbackEvaluation } from '../../utils'
import { registerTrigger } from '../../registry'

const TRIGGER_ID = 'TIME_003'
const TRIGGER_NAME = 'Nejlepší dny'
const TRIGGER_DESCRIPTION = 'Analýza nejvýkonnějších dnů v týdnu'
const TRIGGER_CATEGORY = 'TIMING' as const

const DAY_NAMES: Record<number, string> = {
  0: 'Neděle',
  1: 'Pondělí',
  2: 'Úterý',
  3: 'Středa',
  4: 'Čtvrtek',
  5: 'Pátek',
  6: 'Sobota',
}

const DAY_NAMES_SHORT: Record<number, string> = {
  0: 'Ne',
  1: 'Po',
  2: 'Út',
  3: 'St',
  4: 'Čt',
  5: 'Pá',
  6: 'So',
}

interface DayStats {
  day: number
  name: string
  count: number
  totalEngagement: number
  avgEngagement: number
}

function evaluate(input: TriggerInput): TriggerEvaluation {
  const { posts90d } = input

  if (posts90d.length < 14) {
    return createFallbackEvaluation(
      TRIGGER_ID,
      TRIGGER_NAME,
      TRIGGER_DESCRIPTION,
      TRIGGER_CATEGORY,
      'INSUFFICIENT_DATA',
      'Nedostatek příspěvků pro analýzu dnů (min. 14)'
    )
  }

  // Group posts by day of week
  const dayStats = new Map<number, DayStats>()

  // Initialize all days
  for (let i = 0; i < 7; i++) {
    dayStats.set(i, {
      day: i,
      name: DAY_NAMES[i]!,
      count: 0,
      totalEngagement: 0,
      avgEngagement: 0,
    })
  }

  for (const post of posts90d) {
    const day = new Date(post.created_time).getDay()
    const existing = dayStats.get(day)!
    existing.count++
    existing.totalEngagement += post.total_engagement
  }

  // Calculate averages
  for (const stats of dayStats.values()) {
    stats.avgEngagement = stats.count > 0 ? stats.totalEngagement / stats.count : 0
  }

  // Get days with posts, sorted by engagement
  const daysWithPosts = Array.from(dayStats.values())
    .filter((d) => d.count >= 1)
    .sort((a, b) => b.avgEngagement - a.avgEngagement)

  if (daysWithPosts.length < 3) {
    return createFallbackEvaluation(
      TRIGGER_ID,
      TRIGGER_NAME,
      TRIGGER_DESCRIPTION,
      TRIGGER_CATEGORY,
      'INSUFFICIENT_DATA',
      'Příspěvky pouze v několika dnech týdne'
    )
  }

  // Best and worst days
  const bestDays = daysWithPosts.slice(0, 3)
  const worstDays = daysWithPosts.slice(-2).reverse()

  // Calculate overall average
  const overallAvg = posts90d.reduce((sum, p) => sum + p.total_engagement, 0) / posts90d.length

  // Check posting distribution
  const bestDaySet = new Set(bestDays.map((d) => d.day))
  const postsInBestDays = posts90d.filter((p) =>
    bestDaySet.has(new Date(p.created_time).getDay())
  ).length
  const bestDaysPct = (postsInBestDays / posts90d.length) * 100

  // Check if user is avoiding worst days
  const worstDaySet = new Set(worstDays.map((d) => d.day))
  const postsInWorstDays = posts90d.filter((p) =>
    worstDaySet.has(new Date(p.created_time).getDay())
  ).length
  const worstDaysPct = (postsInWorstDays / posts90d.length) * 100

  // Score based on day optimization
  let score: number
  if (bestDaysPct >= 50 && worstDaysPct <= 20) {
    score = 90
  } else if (bestDaysPct >= 40) {
    score = 75
  } else if (bestDaysPct >= 25) {
    score = 60
  } else {
    score = 50
  }

  // Format days for display
  const bestDaysDisplay = bestDays.map((d) => DAY_NAMES_SHORT[d.day]).join(', ')
  const worstDaysDisplay = worstDays.map((d) => DAY_NAMES_SHORT[d.day]).join(', ')

  let recommendation: string | undefined
  if (score < 85) {
    recommendation = `Preferujte publikování v ${bestDaysDisplay} - mají vyšší engagement`
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
      currentValue: `${bestDaysPct.toFixed(0)}% postů v nejlepších dnech`,
      targetValue: '≥50% v optimálních dnech',
      context: `Nejlepší dny: ${bestDaysDisplay}, nejslabší: ${worstDaysDisplay}`,
      metrics: {
        bestDay1: bestDays[0]?.name ?? null,
        bestDay2: bestDays[1]?.name ?? null,
        bestDay3: bestDays[2]?.name ?? null,
        bestDayEngagement: Number(bestDays[0]?.avgEngagement.toFixed(1) ?? 0),
        postsInBestDaysPct: Number(bestDaysPct.toFixed(1)),
        postsInWorstDaysPct: Number(worstDaysPct.toFixed(1)),
        overallAvgEngagement: Number(overallAvg.toFixed(1)),
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
