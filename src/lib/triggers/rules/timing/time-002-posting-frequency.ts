import type { TriggerRule, TriggerInput, TriggerEvaluation } from '../../types'
import { getStatus, createFallbackEvaluation } from '../../utils'
import { registerTrigger } from '../../registry'
import { getCategoryKey } from '@/lib/constants/trigger-categories/time-002'

const TRIGGER_ID = 'TIME_002'
const TRIGGER_NAME = 'Frekvence postování'
const TRIGGER_DESCRIPTION = 'Pravidelnost a konzistence publikování'
const TRIGGER_CATEGORY = 'TIMING' as const

function evaluate(input: TriggerInput): TriggerEvaluation {
  const { posts90d } = input

  if (posts90d.length < 5) {
    return createFallbackEvaluation(
      TRIGGER_ID,
      TRIGGER_NAME,
      TRIGGER_DESCRIPTION,
      TRIGGER_CATEGORY,
      'INSUFFICIENT_DATA',
      'Nedostatek příspěvků pro analýzu frekvence'
    )
  }

  // Sort posts by date (newest first)
  const sortedPosts = [...posts90d].sort(
    (a, b) => new Date(b.created_time).getTime() - new Date(a.created_time).getTime()
  )

  // Calculate gaps between posts (in days)
  const gaps: number[] = []
  for (let i = 1; i < sortedPosts.length; i++) {
    const current = new Date(sortedPosts[i - 1]!.created_time).getTime()
    const previous = new Date(sortedPosts[i]!.created_time).getTime()
    const gapDays = (current - previous) / (1000 * 60 * 60 * 24)
    gaps.push(gapDays)
  }

  if (gaps.length === 0) {
    return createFallbackEvaluation(
      TRIGGER_ID,
      TRIGGER_NAME,
      TRIGGER_DESCRIPTION,
      TRIGGER_CATEGORY,
      'INSUFFICIENT_DATA',
      'Nedostatek dat pro analýzu rozestupů'
    )
  }

  // Calculate median gap
  const sortedGaps = [...gaps].sort((a, b) => a - b)
  const medianIndex = Math.floor(sortedGaps.length / 2)
  const medianGap =
    sortedGaps.length % 2 === 0
      ? (sortedGaps[medianIndex - 1]! + sortedGaps[medianIndex]!) / 2
      : sortedGaps[medianIndex]!

  // Calculate average gap
  const avgGap = gaps.reduce((sum, g) => sum + g, 0) / gaps.length

  // Calculate standard deviation (for consistency)
  const variance = gaps.reduce((sum, g) => sum + Math.pow(g - avgGap, 2), 0) / gaps.length
  const stdDev = Math.sqrt(variance)

  // Coefficient of variation (lower = more consistent)
  const cv = avgGap > 0 ? stdDev / avgGap : 0

  // Posts per week
  const postsPerWeek = 7 / medianGap

  // Score based on frequency and consistency
  let score = 50

  // Frequency scoring (ideal: 3-7 posts per week)
  if (postsPerWeek >= 3 && postsPerWeek <= 7) {
    score += 25
  } else if (postsPerWeek >= 2 && postsPerWeek <= 10) {
    score += 15
  } else if (postsPerWeek >= 1) {
    score += 5
  }

  // Consistency scoring (CV < 0.5 is good)
  if (cv <= 0.3) {
    score += 25 // Very consistent
  } else if (cv <= 0.5) {
    score += 15
  } else if (cv <= 0.8) {
    score += 5
  }
  // cv > 0.8 = no bonus (inconsistent)

  score = Math.max(30, Math.min(95, score))

  // Determine recommendation
  let recommendation: string | undefined
  if (postsPerWeek < 2) {
    recommendation = 'Zvyšte frekvenci na alespoň 3 posty týdně'
  } else if (postsPerWeek > 14) {
    recommendation = 'Příliš mnoho postů může snižovat dosah. Zkuste 5-7 týdně.'
  } else if (cv > 0.8) {
    recommendation = 'Publikujte pravidelněji - velké výkyvy snižují engagement'
  }

  // Format frequency for display
  const frequencyDisplay =
    postsPerWeek >= 1
      ? `${postsPerWeek.toFixed(1)} postů/týden`
      : `1 post/${(7 / postsPerWeek).toFixed(0)} dní`

  // Calculate category key for detail page
  const categoryKey = getCategoryKey(posts90d.length, postsPerWeek, cv)

  // Extended data for detail page
  const inputParams = [
    { key: 'totalPosts', label: 'Celkem příspěvků (90d)', value: posts90d.length.toString() },
    { key: 'postsPerWeek', label: 'Postů za týden', value: postsPerWeek.toFixed(1) },
    { key: 'medianGap', label: 'Medián rozestupu', value: `${medianGap.toFixed(1)} dní` },
    { key: 'avgGap', label: 'Průměrný rozestup', value: `${avgGap.toFixed(1)} dní` },
    { key: 'longestGap', label: 'Nejdelší pauza', value: `${Math.max(...gaps).toFixed(1)} dní` },
    { key: 'consistencyCV', label: 'Koeficient variace', value: cv.toFixed(2) },
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
      currentValue: frequencyDisplay,
      targetValue: '3-7 postů/týden, pravidelně',
      context: `Medián rozestupu: ${medianGap.toFixed(1)} dní, konzistence: ${cv < 0.5 ? 'dobrá' : 'nízká'}`,
      metrics: {
        postsPerWeek: Number(postsPerWeek.toFixed(2)),
        medianGapDays: Number(medianGap.toFixed(1)),
        avgGapDays: Number(avgGap.toFixed(1)),
        consistencyCV: Number(cv.toFixed(2)),
        totalPosts: posts90d.length,
        longestGapDays: Number(Math.max(...gaps).toFixed(1)),
        // Extended for detail page
        _inputParams: JSON.stringify(inputParams),
        _formula: `postsPerWeek = 7 / medianGapDays
CV = stdDev(gaps) / avgGap (nižší = pravidelnější)
Kategorie: frekvence × konzistence matice`,
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
