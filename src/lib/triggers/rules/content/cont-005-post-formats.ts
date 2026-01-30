import type { TriggerRule, TriggerInput, TriggerEvaluation } from '../../types'
import { getStatus, createFallbackEvaluation, formatPercent } from '../../utils'
import { registerTrigger } from '../../registry'

const TRIGGER_ID = 'CONT_005'
const TRIGGER_NAME = 'Formáty příspěvků'
const TRIGGER_DESCRIPTION = 'Využití různých formátů obsahu (foto, video, link, reel)'
const TRIGGER_CATEGORY = 'CONTENT' as const

// Ideal format distribution (flexible)
// - Photos: 40-60%
// - Videos/Reels: 20-40%
// - Links: 10-20%
// - Status (text only): <10%
// - Shared: <10%

function evaluate(input: TriggerInput): TriggerEvaluation {
  const { posts90d } = input

  if (posts90d.length < 10) {
    return createFallbackEvaluation(
      TRIGGER_ID,
      TRIGGER_NAME,
      TRIGGER_DESCRIPTION,
      TRIGGER_CATEGORY,
      'INSUFFICIENT_DATA',
      'Nedostatek příspěvků pro analýzu formátů'
    )
  }

  // Count formats with explicit typing
  const formatCounts = {
    photo: 0,
    video: 0,
    reel: 0,
    link: 0,
    status: 0,
    shared: 0,
    other: 0,
  }

  for (const post of posts90d) {
    const type = post.type as keyof typeof formatCounts
    if (type in formatCounts) {
      formatCounts[type]++
    } else {
      formatCounts.other++
    }
  }

  const total = posts90d.length
  const pct = (count: number) => (count / total) * 100

  const photoPct = pct(formatCounts.photo)
  const videoPct = pct(formatCounts.video)
  const reelPct = pct(formatCounts.reel)
  const linkPct = pct(formatCounts.link)
  const statusPct = pct(formatCounts.status)
  const sharedPct = pct(formatCounts.shared)

  const videoTotalPct = videoPct + reelPct // Combined video content

  // Calculate diversity score
  const activeFormats = Object.values(formatCounts).filter((c) => c > 0).length
  const diversityScore = Math.min(100, activeFormats * 15)

  // Calculate balance score
  let balanceScore = 70

  // Reward good photo usage
  if (photoPct >= 30 && photoPct <= 60) {
    balanceScore += 10
  } else if (photoPct > 70) {
    balanceScore -= 10 // Too many photos
  }

  // Reward video usage
  if (videoTotalPct >= 15 && videoTotalPct <= 45) {
    balanceScore += 10
  } else if (videoTotalPct < 5) {
    balanceScore -= 10 // Should use more video
  }

  // Penalize too much shared content
  if (sharedPct > 20) {
    balanceScore -= 15
  }

  // Penalize too much text-only
  if (statusPct > 20) {
    balanceScore -= 10
  }

  // Final score is weighted average of diversity and balance
  const score = Math.round(Math.max(30, Math.min(95, diversityScore * 0.3 + balanceScore * 0.7)))

  // Determine recommendation
  let recommendation: string | undefined
  if (videoTotalPct < 10) {
    recommendation = 'Přidejte více video obsahu (včetně Reels) pro vyšší engagement'
  } else if (sharedPct > 25) {
    recommendation = 'Omezte sdílený obsah a tvořte více originálního'
  } else if (photoPct > 70) {
    recommendation = 'Diverzifikujte formáty - zkuste více videí nebo Reels'
  } else if (activeFormats < 3) {
    recommendation = 'Využívejte více různých formátů pro pestřejší obsah'
  }

  // Format display string
  const formatDisplay = [
    photoPct > 0 ? `${formatPercent(photoPct, 0)} foto` : '',
    videoTotalPct > 0 ? `${formatPercent(videoTotalPct, 0)} video` : '',
    linkPct > 0 ? `${formatPercent(linkPct, 0)} link` : '',
    statusPct > 0 ? `${formatPercent(statusPct, 0)} text` : '',
  ]
    .filter(Boolean)
    .join(' / ')

  return {
    id: TRIGGER_ID,
    name: TRIGGER_NAME,
    description: TRIGGER_DESCRIPTION,
    category: TRIGGER_CATEGORY,
    score,
    status: getStatus(score),
    recommendation,
    details: {
      currentValue: formatDisplay,
      targetValue: '40-60% foto, 20-40% video, rozmanitost',
      context: `${activeFormats} různých formátů z ${total} příspěvků`,
      metrics: {
        photoPct: Number(photoPct.toFixed(1)),
        videoPct: Number(videoPct.toFixed(1)),
        reelPct: Number(reelPct.toFixed(1)),
        linkPct: Number(linkPct.toFixed(1)),
        statusPct: Number(statusPct.toFixed(1)),
        sharedPct: Number(sharedPct.toFixed(1)),
        activeFormats,
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
