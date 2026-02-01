import type { TriggerRule, TriggerInput, TriggerEvaluation } from '../../types'
import { getStatus, createFallbackEvaluation, formatPercent } from '../../utils'
import { registerTrigger } from '../../registry'
import { getCategoryKey } from '@/lib/constants/trigger-categories/tech-002'

const TRIGGER_ID = 'TECH_002'
const TRIGGER_NAME = 'Typ souboru'
const TRIGGER_DESCRIPTION = 'Využití optimálních formátů obrázků (PNG/JPEG)'
const TRIGGER_CATEGORY = 'TECHNICAL' as const

function evaluate(input: TriggerInput): TriggerEvaluation {
  const { posts90d } = input

  // Filter posts with image format info
  const postsWithFormat = posts90d.filter(
    (p) => p.has_media && p.media_type === 'image' && p.image_format
  )

  if (postsWithFormat.length < 3) {
    return createFallbackEvaluation(
      TRIGGER_ID,
      TRIGGER_NAME,
      TRIGGER_DESCRIPTION,
      TRIGGER_CATEGORY,
      'INSUFFICIENT_DATA',
      'Nedostatek obrázků s dostupným formátem'
    )
  }

  // Count formats
  const formatCounts: Record<string, number> = {}
  for (const post of postsWithFormat) {
    const format = post.image_format!.toLowerCase()
    formatCounts[format] = (formatCounts[format] || 0) + 1
  }

  // PNG is preferred for graphics/text, JPEG for photos
  // Both are good - we mainly want to avoid uncommon formats
  const pngCount = formatCounts['png'] || 0
  const jpegCount = formatCounts['jpeg'] || formatCounts['jpg'] || 0
  const goodFormatsCount = pngCount + jpegCount
  const goodPercentage = (goodFormatsCount / postsWithFormat.length) * 100

  // Calculate score
  let score: number
  if (goodPercentage >= 90) {
    score = 95
  } else if (goodPercentage >= 80) {
    score = 85
  } else if (goodPercentage >= 60) {
    score = 70
  } else if (goodPercentage >= 40) {
    score = 55
  } else {
    score = 35
  }

  const pngPercentage = (pngCount / postsWithFormat.length) * 100

  // Calculate category key for detail page
  const categoryKey = getCategoryKey(postsWithFormat.length, goodPercentage)

  // Extended data for detail page
  const inputParams = [
    {
      key: 'totalAnalyzed',
      label: 'Analyzovaných obrázků',
      value: postsWithFormat.length.toString(),
    },
    { key: 'pngCount', label: 'PNG formát', value: pngCount.toString() },
    { key: 'jpegCount', label: 'JPEG formát', value: jpegCount.toString() },
    {
      key: 'otherCount',
      label: 'Ostatní formáty',
      value: (postsWithFormat.length - goodFormatsCount).toString(),
    },
    { key: 'goodPct', label: 'Podíl PNG/JPEG', value: formatPercent(goodPercentage, 1) },
  ]

  return {
    id: TRIGGER_ID,
    name: TRIGGER_NAME,
    description: TRIGGER_DESCRIPTION,
    category: TRIGGER_CATEGORY,
    score,
    status: getStatus(score),
    recommendation:
      score < 85 ? 'Používejte PNG pro grafiky s textem a JPEG pro fotografie' : undefined,
    details: {
      currentValue: `${formatPercent(pngPercentage, 0)} PNG, ${formatPercent(100 - pngPercentage, 0)} ostatní`,
      targetValue: '≥80% PNG/JPEG',
      context: `Analyzováno ${postsWithFormat.length} obrázků`,
      metrics: {
        pngCount,
        jpegCount,
        otherCount: postsWithFormat.length - goodFormatsCount,
        // Extended for detail page
        _inputParams: JSON.stringify(inputParams),
        _formula: `goodPercentage = (pngCount + jpegCount) / total * 100
Kategorie: ≥90% → EXCELLENT, ≥80% → GOOD, ≥60% → FAIR`,
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
