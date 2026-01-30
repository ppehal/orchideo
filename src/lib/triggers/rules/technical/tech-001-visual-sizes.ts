import type { TriggerRule, TriggerInput, TriggerEvaluation } from '../../types'
import { getStatus, createFallbackEvaluation, formatPercent } from '../../utils'
import { registerTrigger } from '../../registry'

const TRIGGER_ID = 'TECH_001'
const TRIGGER_NAME = 'Velikosti vizuálů'
const TRIGGER_DESCRIPTION = 'Použití ideálních rozměrů obrázků pro FB feed'
const TRIGGER_CATEGORY = 'TECHNICAL' as const

// Ideal dimensions for FB feed images
const IDEAL_WIDTH = 1080
const IDEAL_HEIGHT = 1350
const TOLERANCE = 0.1 // 10% tolerance

function isWithinTolerance(actual: number, ideal: number, tolerance: number): boolean {
  const lower = ideal * (1 - tolerance)
  const upper = ideal * (1 + tolerance)
  return actual >= lower && actual <= upper
}

function evaluate(input: TriggerInput): TriggerEvaluation {
  const { posts90d } = input

  // Filter posts with image dimensions
  const postsWithDimensions = posts90d.filter(
    (p) => p.has_media && p.media_type === 'image' && p.image_width && p.image_height
  )

  if (postsWithDimensions.length < 3) {
    return createFallbackEvaluation(
      TRIGGER_ID,
      TRIGGER_NAME,
      TRIGGER_DESCRIPTION,
      TRIGGER_CATEGORY,
      'INSUFFICIENT_DATA',
      'Nedostatek obrázků s dostupnými rozměry'
    )
  }

  // Count posts with ideal dimensions
  let idealCount = 0
  let goodCount = 0

  for (const post of postsWithDimensions) {
    const widthOk = isWithinTolerance(post.image_width!, IDEAL_WIDTH, TOLERANCE)
    const heightOk = isWithinTolerance(post.image_height!, IDEAL_HEIGHT, TOLERANCE)
    const aspectRatio = post.image_height! / post.image_width!
    const idealAspectRatio = IDEAL_HEIGHT / IDEAL_WIDTH // 1.25 (4:5)
    const aspectOk = Math.abs(aspectRatio - idealAspectRatio) < 0.15

    if (widthOk && heightOk) {
      idealCount++
    } else if (aspectOk) {
      goodCount++
    }
  }

  const idealPercentage = (idealCount / postsWithDimensions.length) * 100
  const goodPercentage = ((idealCount + goodCount) / postsWithDimensions.length) * 100

  // Calculate score
  let score: number
  if (idealPercentage >= 80) {
    score = 95
  } else if (idealPercentage >= 50) {
    score = 85
  } else if (goodPercentage >= 70) {
    score = 75
  } else if (goodPercentage >= 40) {
    score = 55
  } else {
    score = 35
  }

  return {
    id: TRIGGER_ID,
    name: TRIGGER_NAME,
    description: TRIGGER_DESCRIPTION,
    category: TRIGGER_CATEGORY,
    score,
    status: getStatus(score),
    recommendation:
      score < 85
        ? `Používejte rozměr ${IDEAL_WIDTH}x${IDEAL_HEIGHT} px pro optimální zobrazení v newsfeedu`
        : undefined,
    details: {
      currentValue: formatPercent(idealPercentage, 0) + ' ideálních',
      targetValue: '≥80%',
      context: `Analyzováno ${postsWithDimensions.length} obrázků`,
      metrics: {
        idealCount,
        goodCount,
        totalAnalyzed: postsWithDimensions.length,
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
