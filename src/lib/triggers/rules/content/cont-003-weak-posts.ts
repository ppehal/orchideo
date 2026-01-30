import type { TriggerRule, TriggerInput, TriggerEvaluation } from '../../types'
import { getStatus, createFallbackEvaluation } from '../../utils'
import { registerTrigger } from '../../registry'

const TRIGGER_ID = 'CONT_003'
const TRIGGER_NAME = 'Nejslabší posty'
const TRIGGER_DESCRIPTION = 'Analýza bottom 10% nejméně úspěšných příspěvků'
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
      'Nedostatek příspěvků pro analýzu slabých postů'
    )
  }

  // Sort posts by engagement (ascending for bottom)
  const sortedPosts = [...posts90d].sort((a, b) => a.total_engagement - b.total_engagement)

  // Get bottom 10%
  const bottomCount = Math.max(1, Math.ceil(posts90d.length * 0.1))
  const bottomPosts = sortedPosts.slice(0, bottomCount)

  // Calculate average engagement of bottom posts
  const avgBottomEngagement =
    bottomPosts.reduce((sum, p) => sum + p.total_engagement, 0) / bottomPosts.length

  // Calculate overall average engagement
  const overallAvg = posts90d.reduce((sum, p) => sum + p.total_engagement, 0) / posts90d.length

  // Bottom posts ratio (lower is better - means they're not too far below average)
  const bottomToAvgRatio = avgBottomEngagement / (overallAvg || 1)

  // Analyze common traits of bottom posts
  const bottomTypes = bottomPosts.reduce(
    (acc, p) => {
      acc[p.type] = (acc[p.type] || 0) + 1
      return acc
    },
    {} as Record<string, number>
  )

  const worstType = Object.entries(bottomTypes).sort((a, b) => b[1] - a[1])[0]
  const hasMedia = bottomPosts.filter((p) => p.has_media).length
  const hasInlineLinks = bottomPosts.filter((p) => p.has_inline_links).length
  const isSharedPost = bottomPosts.filter((p) => p.is_shared_post).length

  // Score based on ratio (higher ratio = bottom posts aren't too bad)
  let score: number
  if (bottomToAvgRatio >= 0.5) {
    score = 95 // Bottom posts are still decent
  } else if (bottomToAvgRatio >= 0.3) {
    score = 80
  } else if (bottomToAvgRatio >= 0.15) {
    score = 65
  } else {
    score = 45 // Very weak bottom posts
  }

  // Format type for display
  const typeNames: Record<string, string> = {
    photo: 'fotky',
    video: 'videa',
    link: 'odkazy',
    status: 'statusy',
    reel: 'reels',
    shared: 'sdílené příspěvky',
    other: 'ostatní',
  }

  const weakestType = worstType ? typeNames[worstType[0]] || worstType[0] : 'různé'
  const weakestTypeCount = worstType ? worstType[1] : 0
  const weakestTypePct = bottomCount > 0 ? (weakestTypeCount / bottomCount) * 100 : 0

  // Identify potential issues
  const issues: string[] = []
  if (isSharedPost > bottomCount * 0.5) {
    issues.push('příliš mnoho sdílených příspěvků')
  }
  if (hasInlineLinks > bottomCount * 0.5) {
    issues.push('odkazy v textu')
  }
  if (!hasMedia && bottomCount > 2) {
    issues.push('chybějící vizuál')
  }

  let recommendation: string | undefined
  if (issues.length > 0) {
    recommendation = `Slabé posty mají společné: ${issues.join(', ')}. Vyhněte se těmto vzorcům.`
  } else if (score < 85) {
    recommendation = `Omezte publikování formátu "${weakestType}" - často končí ve slabých postech`
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
      currentValue: `Slabé posty mají ${(bottomToAvgRatio * 100).toFixed(0)}% průměrného engagementu`,
      targetValue: '≥50% průměru',
      context: `Analyzováno ${bottomCount} slabých postů. Nejčastější formát: ${weakestType} (${weakestTypePct.toFixed(0)}%)`,
      metrics: {
        bottomCount,
        avgBottomEngagement: Number(avgBottomEngagement.toFixed(1)),
        overallAvg: Number(overallAvg.toFixed(1)),
        bottomToAvgRatio: Number(bottomToAvgRatio.toFixed(2)),
        weakestType: worstType?.[0] || 'mixed',
        sharedPostPct: (isSharedPost / bottomCount) * 100,
        inlineLinksPct: (hasInlineLinks / bottomCount) * 100,
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
