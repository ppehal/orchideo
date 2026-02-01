import type { TriggerRule, TriggerInput, TriggerEvaluation } from '../../types'
import { getStatus, createFallbackEvaluation } from '../../utils'
import { registerTrigger } from '../../registry'
import { getCategoryKey } from '@/lib/constants/trigger-categories/basic-004'

const TRIGGER_ID = 'BASIC_004'
const TRIGGER_NAME = 'Kvalita nových fanoušků'
const TRIGGER_DESCRIPTION = 'Poměr růstu engagementu vs. růstu počtu fanoušků'
const TRIGGER_CATEGORY = 'BASIC' as const

// If engagement grows at least 80% as fast as fan count, fans are quality
// ratio = engagementGrowthRate / fanGrowthRate
// ratio >= 0.8 = EXCELLENT (new fans are engaging)
// ratio >= 0.5 = GOOD
// ratio < 0.5 = fans might be low quality or bought

function evaluate(input: TriggerInput): TriggerEvaluation {
  const { insights28d, pageData } = input

  // Check if we have insights data
  if (!insights28d) {
    return createFallbackEvaluation(
      TRIGGER_ID,
      TRIGGER_NAME,
      TRIGGER_DESCRIPTION,
      TRIGGER_CATEGORY,
      'METRIC_UNAVAILABLE',
      'Page Insights nejsou dostupné (vyžadují oprávnění read_insights)'
    )
  }

  const fanAdds = insights28d.page_fan_adds
  const fanRemoves = insights28d.page_fan_removes
  const currentFans = pageData.fan_count

  if (fanAdds === null || currentFans === null || currentFans === 0) {
    return createFallbackEvaluation(
      TRIGGER_ID,
      TRIGGER_NAME,
      TRIGGER_DESCRIPTION,
      TRIGGER_CATEGORY,
      'METRIC_UNAVAILABLE',
      'Data o růstu fanoušků nejsou dostupná'
    )
  }

  // Calculate net fan growth
  const netFanGrowth = fanAdds - (fanRemoves ?? 0)
  const fanGrowthRate = netFanGrowth / currentFans

  // Check if there's meaningful growth to analyze
  if (fanAdds < 10) {
    return {
      id: TRIGGER_ID,
      name: TRIGGER_NAME,
      description: TRIGGER_DESCRIPTION,
      category: TRIGGER_CATEGORY,
      score: 70, // Neutral score for low activity
      status: getStatus(70),
      recommendation: undefined,
      details: {
        currentValue: `${fanAdds} nových fanoušků`,
        targetValue: 'Více dat pro analýzu',
        reason: 'INSUFFICIENT_DATA',
        context: 'Nedostatek nových fanoušků za posledních 28 dní pro kvalitní analýzu',
        metrics: {
          fanAdds,
          fanRemoves: fanRemoves ?? 0,
          netFanGrowth,
        },
      },
    }
  }

  // Get engagement metrics
  const engagedUsers = insights28d.page_engaged_users
  const postEngagements = insights28d.page_post_engagements

  if (engagedUsers === null && postEngagements === null) {
    return createFallbackEvaluation(
      TRIGGER_ID,
      TRIGGER_NAME,
      TRIGGER_DESCRIPTION,
      TRIGGER_CATEGORY,
      'METRIC_UNAVAILABLE',
      'Data o engagementu nejsou dostupná'
    )
  }

  // Use engaged users or post engagements as engagement metric
  const engagementMetric = engagedUsers ?? postEngagements ?? 0
  const engagementRate = engagementMetric / currentFans

  // Calculate quality ratio
  // If fan growth is very small, avoid division issues
  let qualityRatio: number
  if (Math.abs(fanGrowthRate) < 0.001) {
    // No significant fan growth - focus on existing engagement
    qualityRatio = engagementRate > 0.05 ? 1 : engagementRate / 0.05
  } else if (fanGrowthRate > 0) {
    // Positive growth - compare engagement to fan growth
    qualityRatio = engagementRate / fanGrowthRate
  } else {
    // Losing fans - if engagement is still good, that's positive
    qualityRatio = engagementRate > 0.02 ? 0.8 : 0.4
  }

  // Cap ratio at reasonable bounds
  qualityRatio = Math.min(2, Math.max(0, qualityRatio))

  // Calculate score
  let score: number
  if (qualityRatio >= 0.8) {
    score = 90
  } else if (qualityRatio >= 0.5) {
    score = 75
  } else if (qualityRatio >= 0.3) {
    score = 55
  } else {
    score = 35
  }

  // Determine recommendation
  let recommendation: string | undefined
  if (qualityRatio < 0.5) {
    recommendation = 'Noví fanoušci nejsou aktivní. Zaměřte se na kvalitu místo kvantity'
  } else if (netFanGrowth < 0) {
    recommendation = 'Ztrácíte fanoušky. Analyzujte důvody a zlepšete obsah'
  }

  // Calculate category key for detail page
  const categoryKey = getCategoryKey(fanAdds, qualityRatio)

  // Extended data for detail page
  const inputParams = [
    {
      key: 'currentFans',
      label: 'Aktuální počet fanoušků',
      value: currentFans.toLocaleString('cs-CZ'),
    },
    { key: 'fanAdds', label: 'Noví fanoušci (28d)', value: fanAdds.toLocaleString('cs-CZ') },
    {
      key: 'fanRemoves',
      label: 'Ztracení fanoušci (28d)',
      value: (fanRemoves ?? 0).toLocaleString('cs-CZ'),
    },
    { key: 'netFanGrowth', label: 'Čistý růst', value: netFanGrowth.toLocaleString('cs-CZ') },
    {
      key: 'engagementMetric',
      label: 'Engagement metrika (28d)',
      value: engagementMetric.toLocaleString('cs-CZ'),
    },
    { key: 'qualityRatio', label: 'Poměr kvality', value: qualityRatio.toFixed(2) },
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
      currentValue: `Poměr ${qualityRatio.toFixed(2)}`,
      targetValue: '≥0.8',
      context: `${fanAdds} nových fanoušků, ${engagementMetric.toLocaleString('cs-CZ')} engagementů za 28 dní`,
      metrics: {
        fanAdds,
        fanRemoves: fanRemoves ?? 0,
        netFanGrowth,
        engagementMetric,
        qualityRatio: Number(qualityRatio.toFixed(2)),
        // Extended for detail page
        _inputParams: JSON.stringify(inputParams),
        _formula: `fanGrowthRate = netFanGrowth / currentFans
engagementRate = engagementMetric / currentFans
qualityRatio = engagementRate / fanGrowthRate
Kategorie: fanAdds <10 → LOW, ratio ≥0.5 → GOOD, jinak BAD`,
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
