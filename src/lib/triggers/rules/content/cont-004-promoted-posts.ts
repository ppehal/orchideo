import type { TriggerRule, TriggerInput, TriggerEvaluation } from '../../types'
import { getStatus, createFallbackEvaluation, formatPercent } from '../../utils'
import { registerTrigger } from '../../registry'

const TRIGGER_ID = 'CONT_004'
const TRIGGER_NAME = 'Promované posty'
const TRIGGER_DESCRIPTION = 'Detekce a analýza placených příspěvků'
const TRIGGER_CATEGORY = 'CONTENT' as const

function evaluate(input: TriggerInput): TriggerEvaluation {
  const { posts90d, insights28d } = input

  if (posts90d.length < 5) {
    return createFallbackEvaluation(
      TRIGGER_ID,
      TRIGGER_NAME,
      TRIGGER_DESCRIPTION,
      TRIGGER_CATEGORY,
      'INSUFFICIENT_DATA',
      'Nedostatek příspěvků pro analýzu'
    )
  }

  // Check if we have paid impressions data from page insights
  const hasPaidImpressions =
    insights28d?.page_impressions_paid !== null &&
    insights28d?.page_impressions_paid !== undefined &&
    insights28d.page_impressions_paid > 0

  // Check post-level paid impressions if available
  const postsWithPaidData = posts90d.filter((p) => p.impressions_paid !== null)
  const promotedPosts = postsWithPaidData.filter((p) => (p.impressions_paid ?? 0) > 0)

  // If we don't have any paid data, we can't properly evaluate
  if (!hasPaidImpressions && postsWithPaidData.length === 0) {
    return {
      id: TRIGGER_ID,
      name: TRIGGER_NAME,
      description: TRIGGER_DESCRIPTION,
      category: TRIGGER_CATEGORY,
      score: 70, // Neutral score
      status: getStatus(70),
      recommendation: undefined,
      details: {
        reason: 'METRIC_UNAVAILABLE',
        context: 'Data o placených impressích nejsou dostupná. Vyžadují oprávnění read_insights.',
        metrics: {
          hasPaidImpressions: 0,
          postsWithPaidData: 0,
        },
      },
    }
  }

  // Calculate promotion metrics
  let promotedPct = 0
  let avgPaidReach = 0

  if (postsWithPaidData.length > 0) {
    promotedPct = (promotedPosts.length / posts90d.length) * 100
    if (promotedPosts.length > 0) {
      avgPaidReach =
        promotedPosts.reduce((sum, p) => sum + (p.impressions_paid ?? 0), 0) / promotedPosts.length
    }
  } else if (hasPaidImpressions && insights28d) {
    // Estimate from page-level data
    const totalImpressions = insights28d.page_impressions ?? 0
    const paidImpressions = insights28d.page_impressions_paid ?? 0
    promotedPct = totalImpressions > 0 ? (paidImpressions / totalImpressions) * 100 : 0
  }

  // Score evaluation
  // Having some promoted posts is good (10-30% is healthy mix)
  // Too many (>50%) might indicate organic content problems
  // None might mean missing opportunities
  let score: number
  if (promotedPct >= 10 && promotedPct <= 30) {
    score = 90 // Healthy promotion mix
  } else if (promotedPct > 0 && promotedPct < 10) {
    score = 75 // Could promote more
  } else if (promotedPct > 30 && promotedPct <= 50) {
    score = 70 // A bit heavy on promotion
  } else if (promotedPct > 50) {
    score = 50 // Too reliant on paid reach
  } else {
    score = 60 // No promotion detected
  }

  let recommendation: string | undefined
  if (promotedPct === 0) {
    recommendation = 'Zvažte promování nejlepších příspěvků pro větší dosah'
  } else if (promotedPct > 50) {
    recommendation = 'Příliš mnoho placeného obsahu. Zaměřte se na zlepšení organického dosahu'
  } else if (promotedPct < 10) {
    recommendation = 'Promujte více top příspěvků pro lepší výsledky'
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
      currentValue: formatPercent(promotedPct, 0) + ' promovaných',
      targetValue: '10-30%',
      context:
        promotedPosts.length > 0
          ? `${promotedPosts.length} promovaných postů z ${posts90d.length}`
          : 'Odhad z page-level impressích',
      metrics: {
        promotedPct: Number(promotedPct.toFixed(1)),
        promotedCount: promotedPosts.length,
        totalPosts: posts90d.length,
        avgPaidReach: Number(avgPaidReach.toFixed(0)),
        dataSource: postsWithPaidData.length > 0 ? 'post_insights' : 'page_insights',
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
