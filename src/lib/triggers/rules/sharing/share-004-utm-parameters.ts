import type { TriggerRule, TriggerInput, TriggerEvaluation } from '../../types'
import { getStatus, formatPercent } from '../../utils'
import { registerTrigger } from '../../registry'

const TRIGGER_ID = 'SHARE_004'
const TRIGGER_NAME = 'UTM parametry'
const TRIGGER_DESCRIPTION = 'Používání UTM parametrů pro měření odkazů'
const TRIGGER_CATEGORY = 'SHARING' as const

// UTM parameters help track marketing effectiveness
// Should be used on link posts that lead to own website

function evaluate(input: TriggerInput): TriggerEvaluation {
  const { posts90d } = input

  // Filter only link posts (not YouTube, not shared)
  const linkPosts = posts90d.filter(
    (p) => p.type === 'link' && !p.is_youtube_link && !p.is_shared_post && p.has_inline_links
  )

  if (linkPosts.length < 3) {
    // Not enough link posts to evaluate
    return {
      id: TRIGGER_ID,
      name: TRIGGER_NAME,
      description: TRIGGER_DESCRIPTION,
      category: TRIGGER_CATEGORY,
      score: 70, // Neutral score
      status: getStatus(70),
      recommendation: undefined,
      details: {
        reason: 'INSUFFICIENT_DATA',
        context: 'Nedostatek příspěvků s odkazy pro analýzu UTM parametrů',
        metrics: {
          linkPostsCount: linkPosts.length,
          totalPosts: posts90d.length,
        },
      },
    }
  }

  // Count posts with UTM parameters
  const postsWithUtm = linkPosts.filter((p) => p.has_utm_params)
  const utmCount = postsWithUtm.length
  const utmPct = (utmCount / linkPosts.length) * 100

  // Score based on UTM usage
  let score: number
  if (utmPct >= 80) {
    score = 95 // Excellent - almost all links tracked
  } else if (utmPct >= 60) {
    score = 85 // Good tracking
  } else if (utmPct >= 40) {
    score = 70 // Moderate tracking
  } else if (utmPct >= 20) {
    score = 55 // Low tracking
  } else {
    score = 40 // No or minimal tracking
  }

  let recommendation: string | undefined
  if (utmPct < 80) {
    recommendation = `Přidejte UTM parametry k ${formatPercent(100 - utmPct, 0)} odkazů bez trackingu. Pomůže to měřit efektivitu FB kampaní.`
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
      currentValue: `${formatPercent(utmPct, 0)} odkazů s UTM`,
      targetValue: '≥80%',
      context: `${utmCount} z ${linkPosts.length} link postů má UTM parametry`,
      metrics: {
        utmPct: Number(utmPct.toFixed(1)),
        utmCount,
        linkPostsCount: linkPosts.length,
        linkPostsPct: Number(((linkPosts.length / posts90d.length) * 100).toFixed(1)),
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
