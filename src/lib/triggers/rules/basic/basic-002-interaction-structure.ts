import type { TriggerRule, TriggerInput, TriggerEvaluation } from '../../types'
import { getStatus, createFallbackEvaluation, formatPercent } from '../../utils'
import { registerTrigger } from '../../registry'
import { getCategoryKey } from '@/lib/constants/trigger-categories/basic-002'

const TRIGGER_ID = 'BASIC_002'
const TRIGGER_NAME = 'Struktura interakcí'
const TRIGGER_DESCRIPTION = 'Poměr reakcí, komentářů a sdílení vs. oborový benchmark'
const TRIGGER_CATEGORY = 'BASIC' as const

// Tolerance for deviation from benchmark
const TOLERANCE_EXCELLENT = 10 // ±10%
const TOLERANCE_GOOD = 20 // ±20%

function evaluate(input: TriggerInput): TriggerEvaluation {
  const { posts90d, industryBenchmark } = input

  if (posts90d.length < 5) {
    return createFallbackEvaluation(
      TRIGGER_ID,
      TRIGGER_NAME,
      TRIGGER_DESCRIPTION,
      TRIGGER_CATEGORY,
      'INSUFFICIENT_DATA',
      'Nedostatek příspěvků pro analýzu struktury interakcí'
    )
  }

  // Calculate total engagement breakdown
  const totalReactions = posts90d.reduce((sum, p) => sum + p.reactions_count, 0)
  const totalComments = posts90d.reduce((sum, p) => sum + p.comments_count, 0)
  const totalShares = posts90d.reduce((sum, p) => sum + p.shares_count, 0)
  const totalEngagement = totalReactions + totalComments + totalShares

  if (totalEngagement === 0) {
    return createFallbackEvaluation(
      TRIGGER_ID,
      TRIGGER_NAME,
      TRIGGER_DESCRIPTION,
      TRIGGER_CATEGORY,
      'INSUFFICIENT_DATA',
      'Žádné interakce pro analýzu'
    )
  }

  // Calculate percentages
  const reactionsPct = (totalReactions / totalEngagement) * 100
  const commentsPct = (totalComments / totalEngagement) * 100
  const sharesPct = (totalShares / totalEngagement) * 100

  // Compare with benchmark
  const reactionsDeviation = Math.abs(reactionsPct - industryBenchmark.reactions_pct)
  const commentsDeviation = Math.abs(commentsPct - industryBenchmark.comments_pct)
  const sharesDeviation = Math.abs(sharesPct - industryBenchmark.shares_pct)
  const avgDeviation = (reactionsDeviation + commentsDeviation + sharesDeviation) / 3

  // Calculate score based on deviation
  let score: number
  if (avgDeviation <= TOLERANCE_EXCELLENT) {
    score = 95
  } else if (avgDeviation <= TOLERANCE_GOOD) {
    score = 75
  } else if (avgDeviation <= 30) {
    score = 55
  } else {
    score = 35
  }

  // Check for specific issues
  let recommendation: string | undefined
  if (commentsPct < industryBenchmark.comments_pct - 15) {
    recommendation = 'Podíl komentářů je nízký. Pokládejte otázky a povzbuzujte diskuzi'
  } else if (sharesPct < industryBenchmark.shares_pct - 10) {
    recommendation = 'Podíl sdílení je nízký. Vytvářejte více sdíleníhodného obsahu'
  } else if (score < 85) {
    recommendation = 'Struktura interakcí se liší od oborového benchmarku'
  }

  // Calculate category key for detail page
  const categoryKey = getCategoryKey(
    totalEngagement,
    reactionsPct,
    commentsPct,
    sharesPct,
    industryBenchmark.reactions_pct,
    industryBenchmark.comments_pct,
    industryBenchmark.shares_pct
  )

  // Extended data for detail page
  const inputParams = [
    {
      key: 'totalReactions',
      label: 'Celkem reakcí',
      value: totalReactions.toLocaleString('cs-CZ'),
    },
    {
      key: 'totalComments',
      label: 'Celkem komentářů',
      value: totalComments.toLocaleString('cs-CZ'),
    },
    { key: 'totalShares', label: 'Celkem sdílení', value: totalShares.toLocaleString('cs-CZ') },
    {
      key: 'totalEngagement',
      label: 'Celkem interakcí',
      value: totalEngagement.toLocaleString('cs-CZ'),
    },
    { key: 'reactionsPct', label: 'Podíl reakcí', value: formatPercent(reactionsPct, 1) },
    { key: 'commentsPct', label: 'Podíl komentářů', value: formatPercent(commentsPct, 1) },
    { key: 'sharesPct', label: 'Podíl sdílení', value: formatPercent(sharesPct, 1) },
    {
      key: 'benchmarkReactions',
      label: 'Benchmark reakcí',
      value: formatPercent(industryBenchmark.reactions_pct, 1),
    },
    {
      key: 'benchmarkComments',
      label: 'Benchmark komentářů',
      value: formatPercent(industryBenchmark.comments_pct, 1),
    },
    {
      key: 'benchmarkShares',
      label: 'Benchmark sdílení',
      value: formatPercent(industryBenchmark.shares_pct, 1),
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
      currentValue: `${formatPercent(reactionsPct, 0)} reakce / ${formatPercent(commentsPct, 0)} komentáře / ${formatPercent(sharesPct, 0)} sdílení`,
      targetValue: `${formatPercent(industryBenchmark.reactions_pct, 0)} / ${formatPercent(industryBenchmark.comments_pct, 0)} / ${formatPercent(industryBenchmark.shares_pct, 0)}`,
      context: `Benchmark pro obor: ${industryBenchmark.industry_name}`,
      metrics: {
        reactionsPct: Number(reactionsPct.toFixed(1)),
        commentsPct: Number(commentsPct.toFixed(1)),
        sharesPct: Number(sharesPct.toFixed(1)),
        avgDeviation: Number(avgDeviation.toFixed(1)),
        // Extended for detail page
        _inputParams: JSON.stringify(inputParams),
        _formula: `reactionsPct = totalReactions / totalEngagement * 100
commentsPct = totalComments / totalEngagement * 100
sharesPct = totalShares / totalEngagement * 100
Porovnání: hodnota >= benchmark → ABOVE, jinak BELOW`,
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
