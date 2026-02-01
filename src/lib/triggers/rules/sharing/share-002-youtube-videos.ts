import type { TriggerRule, TriggerInput, TriggerEvaluation } from '../../types'
import { getStatus, createFallbackEvaluation, formatPercent } from '../../utils'
import { registerTrigger } from '../../registry'
import { getCategoryKey } from '@/lib/constants/trigger-categories/share-002'

const TRIGGER_ID = 'SHARE_002'
const TRIGGER_NAME = 'YouTube videa'
const TRIGGER_DESCRIPTION = 'Používání YouTube odkazů místo nativního videa'
const TRIGGER_CATEGORY = 'SHARING' as const

// YouTube links typically have lower engagement than native FB videos
// Ideal: minimize YouTube links, prefer native video upload

function evaluate(input: TriggerInput): TriggerEvaluation {
  const { posts90d } = input

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

  // Count YouTube posts
  const youtubePosts = posts90d.filter((p) => p.is_youtube_link)
  const youtubeCount = youtubePosts.length
  const youtubePct = (youtubeCount / posts90d.length) * 100

  // Count native video posts
  const nativeVideoPosts = posts90d.filter(
    (p) => (p.type === 'video' || p.type === 'reel') && !p.is_youtube_link
  )

  // Calculate engagement comparison
  const avgYoutubeEngagement =
    youtubePosts.length > 0
      ? youtubePosts.reduce((sum, p) => sum + p.total_engagement, 0) / youtubePosts.length
      : 0
  const avgNativeVideoEngagement =
    nativeVideoPosts.length > 0
      ? nativeVideoPosts.reduce((sum, p) => sum + p.total_engagement, 0) / nativeVideoPosts.length
      : 0

  // Score based on YouTube usage
  let score: number
  if (youtubeCount === 0) {
    score = 95 // No YouTube links - great
  } else if (youtubePct <= 5) {
    score = 85 // Minimal use
  } else if (youtubePct <= 15) {
    score = 70 // Some use
  } else if (youtubePct <= 30) {
    score = 55 // Heavy use
  } else {
    score = 40 // Too much YouTube
  }

  // If no native videos at all and user has YouTube, neutral score
  if (nativeVideoPosts.length === 0 && youtubeCount > 0) {
    score = Math.max(score, 60) // At least they have video content
  }

  let recommendation: string | undefined
  if (youtubePct > 10) {
    recommendation =
      'Nahrajte videa přímo na Facebook místo sdílení z YouTube. Nativní videa mají vyšší dosah.'
  } else if (
    youtubeCount > 0 &&
    nativeVideoPosts.length > 0 &&
    avgNativeVideoEngagement > avgYoutubeEngagement * 1.5
  ) {
    recommendation = `Vaše nativní videa mají ${((avgNativeVideoEngagement / avgYoutubeEngagement - 1) * 100).toFixed(0)}% vyšší engagement než YouTube. Preferujte přímé nahrávání.`
  }

  // Calculate category key for detail page
  const categoryKey = getCategoryKey(posts90d.length, youtubePct)

  // Extended data for detail page
  const inputParams = [
    { key: 'totalPosts', label: 'Celkem příspěvků', value: posts90d.length.toString() },
    { key: 'youtubeCount', label: 'YouTube odkazů', value: youtubeCount.toString() },
    {
      key: 'nativeVideoCount',
      label: 'Nativních videí',
      value: nativeVideoPosts.length.toString(),
    },
    { key: 'youtubePct', label: 'Podíl YouTube', value: formatPercent(youtubePct, 1) },
    {
      key: 'avgYoutubeEngagement',
      label: 'Avg engagement (YouTube)',
      value: avgYoutubeEngagement.toFixed(1),
    },
    {
      key: 'avgNativeVideoEngagement',
      label: 'Avg engagement (nativní)',
      value: avgNativeVideoEngagement.toFixed(1),
    },
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
      currentValue:
        youtubeCount > 0 ? `${formatPercent(youtubePct, 0)} YouTube odkazů` : 'Bez YouTube odkazů',
      targetValue: '≤5% nebo žádné',
      context:
        nativeVideoPosts.length > 0
          ? `${nativeVideoPosts.length} nativních videí vs. ${youtubeCount} YouTube`
          : youtubeCount > 0
            ? `${youtubeCount} YouTube videí, žádná nativní`
            : 'Žádný video obsah',
      metrics: {
        youtubePct: Number(youtubePct.toFixed(1)),
        youtubeCount,
        nativeVideoCount: nativeVideoPosts.length,
        avgYoutubeEngagement: Number(avgYoutubeEngagement.toFixed(1)),
        avgNativeVideoEngagement: Number(avgNativeVideoEngagement.toFixed(1)),
        // Extended for detail page
        _inputParams: JSON.stringify(inputParams),
        _formula: `youtubePct = youtubeCount / totalPosts * 100
Kategorie: 0% → NONE, ≤5% → MINIMAL, ≤15% → MODERATE (nižší = lepší)`,
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
