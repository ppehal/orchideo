import type { TriggerRule, TriggerInput, TriggerEvaluation } from '../../types'
import { getStatus, createFallbackEvaluation, formatPercent } from '../../utils'
import { registerTrigger } from '../../registry'
import { analyzeContentMix } from '@/lib/utils/text-analysis'

const TRIGGER_ID = 'CONT_001'
const TRIGGER_NAME = 'Obsahový mix'
const TRIGGER_DESCRIPTION = 'Rozložení typů obsahu (engagement, sales, brand)'
const TRIGGER_CATEGORY = 'CONTENT' as const

// Ideal content mix:
// - Engagement: >= 60%
// - Sales: <= 15%
// - Brand: ~20-25%

function evaluate(input: TriggerInput): TriggerEvaluation {
  const { posts90d, industryBenchmark } = input

  if (posts90d.length < 10) {
    return createFallbackEvaluation(
      TRIGGER_ID,
      TRIGGER_NAME,
      TRIGGER_DESCRIPTION,
      TRIGGER_CATEGORY,
      'INSUFFICIENT_DATA',
      'Nedostatek příspěvků pro analýzu obsahového mixu'
    )
  }

  const analysis = analyzeContentMix(posts90d)

  // Use industry benchmark if available, otherwise use defaults
  const idealEngagement = industryBenchmark.ideal_engagement_pct || 60
  const idealSales = industryBenchmark.ideal_sales_pct || 15
  // Note: idealBrand could be used for future expansion of scoring

  // Calculate score based on how close to ideal mix
  let score = 70 // Start at baseline

  // Engagement score (should be high)
  if (analysis.engagementPct >= idealEngagement) {
    score += 15
  } else if (analysis.engagementPct >= idealEngagement - 15) {
    score += 5
  } else {
    score -= 10
  }

  // Sales score (should be low)
  if (analysis.salesPct <= idealSales) {
    score += 10
  } else if (analysis.salesPct <= idealSales + 10) {
    score -= 5
  } else {
    score -= 20 // Too much sales content
  }

  // Cap score
  score = Math.max(20, Math.min(95, score))

  // Determine recommendation
  let recommendation: string | undefined
  if (analysis.salesPct > idealSales + 10) {
    recommendation = `Snižte podíl prodejního obsahu z ${formatPercent(analysis.salesPct, 0)} na max ${formatPercent(idealSales, 0)}`
  } else if (analysis.engagementPct < idealEngagement - 20) {
    recommendation = 'Přidejte více interaktivního obsahu (otázky, ankety, diskuze)'
  } else if (score < 85) {
    recommendation = 'Optimalizujte obsahový mix: více engagement obsahu, méně prodejního'
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
      currentValue: `${formatPercent(analysis.engagementPct, 0)} eng / ${formatPercent(analysis.salesPct, 0)} sales / ${formatPercent(analysis.brandPct, 0)} brand`,
      targetValue: `≥${formatPercent(idealEngagement, 0)} eng / ≤${formatPercent(idealSales, 0)} sales`,
      context: `Analyzováno ${analysis.total} příspěvků`,
      metrics: {
        engagementPct: Number(analysis.engagementPct.toFixed(1)),
        salesPct: Number(analysis.salesPct.toFixed(1)),
        brandPct: Number(analysis.brandPct.toFixed(1)),
        engagementCount: analysis.engagementCount,
        salesCount: analysis.salesCount,
        brandCount: analysis.brandCount,
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
