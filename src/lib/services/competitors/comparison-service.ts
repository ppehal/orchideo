import { prisma } from '@/lib/prisma'
import { createLogger } from '@/lib/logging'
import { SCORING_VERSION, BENCHMARK_VERSION } from '@/lib/constants/versions'
import { COMPARISON_METRICS, type ComparisonMetricDef } from '@/lib/constants/comparison-metrics'

const log = createLogger('comparison-service')

/**
 * Reliability level for comparison data
 */
export type ComparisonReliability = 'high' | 'medium' | 'low' | 'insufficient'

/**
 * Metrics for a single page in comparison
 */
export interface PageMetrics {
  pageId: string
  pageName: string
  isPrimary: boolean
  snapshotDate: string | null
  metrics: Record<string, number | null>
}

/**
 * Rank data for a single metric
 */
export interface MetricRank {
  metricKey: string
  ranks: Array<{
    pageId: string
    value: number | null
    rank: number // 1-based, ties get same rank (dense ranking)
    percentile: number // 0-100
  }>
}

/**
 * Reliability information for comparison
 */
export interface ComparisonReliabilityInfo {
  level: ComparisonReliability
  pageCount: number
  pagesWithSnapshots: number
  scoringVersionConsistent: boolean
  message: string
}

/**
 * Full comparison result
 */
export interface ComparisonResult {
  groupId: string
  groupName: string
  reliability: ComparisonReliabilityInfo
  pages: PageMetrics[]
  rankings: MetricRank[]
  meta: {
    scoringVersion: string
    benchmarkVersion: string
    calculatedAt: string
  }
}

/**
 * Compute dense rank - handles ties by giving same rank.
 * E.g., [100, 90, 90, 80] becomes ranks [1, 2, 2, 3]
 */
function computeDenseRank(
  values: Array<{ pageId: string; value: number | null }>,
  direction: 'higher_better' | 'lower_better' | 'neutral'
): Array<{ pageId: string; value: number | null; rank: number; percentile: number }> {
  // Filter out null values for ranking
  const withValues = values.filter((v) => v.value !== null) as Array<{
    pageId: string
    value: number
  }>
  const nullValues = values.filter((v) => v.value === null)

  // Sort by value
  const sorted = [...withValues].sort((a, b) => {
    if (direction === 'lower_better') {
      return a.value - b.value // Lower is better
    }
    return b.value - a.value // Higher is better (default for neutral too)
  })

  // Assign dense ranks
  const ranked: Array<{ pageId: string; value: number | null; rank: number; percentile: number }> =
    []
  let currentRank = 1
  let previousValue: number | null = null

  for (let i = 0; i < sorted.length; i++) {
    const item = sorted[i]
    if (!item) continue

    if (previousValue !== null && item.value !== previousValue) {
      currentRank = ranked.length + 1 // Dense rank: next rank is count + 1
    }

    const percentile =
      sorted.length > 1 ? ((sorted.length - currentRank) / (sorted.length - 1)) * 100 : 100

    ranked.push({
      pageId: item.pageId,
      value: item.value,
      rank: currentRank,
      percentile,
    })

    previousValue = item.value
  }

  // Add null values with rank 0 (unranked)
  for (const item of nullValues) {
    ranked.push({
      pageId: item.pageId,
      value: null,
      rank: 0,
      percentile: 0,
    })
  }

  return ranked
}

/**
 * Assess reliability of comparison data
 */
function assessReliability(
  pageMetrics: PageMetrics[],
  snapshots: Array<{ scoring_version: string }>
): ComparisonReliabilityInfo {
  const pageCount = pageMetrics.length
  const pagesWithSnapshots = pageMetrics.filter((p) => p.snapshotDate !== null).length
  const scoringVersionConsistent = snapshots.every((s) => s.scoring_version === SCORING_VERSION)

  if (pagesWithSnapshots < 2) {
    return {
      level: 'insufficient',
      pageCount,
      pagesWithSnapshots,
      scoringVersionConsistent,
      message: 'Nedostatek stránek s daty pro porovnání',
    }
  }

  const coverageRatio = pagesWithSnapshots / pageCount

  let level: ComparisonReliability
  let message: string

  if (coverageRatio >= 0.9 && scoringVersionConsistent) {
    level = 'high'
    message = 'Spolehlivé porovnání'
  } else if (coverageRatio >= 0.6) {
    level = 'medium'
    message = 'Částečné porovnání - některé stránky nemají data'
  } else {
    level = 'low'
    message = 'Omezené porovnání - většina stránek nemá data'
  }

  if (!scoringVersionConsistent) {
    message += ' (varování: různé verze algoritmu)'
  }

  return {
    level,
    pageCount,
    pagesWithSnapshots,
    scoringVersionConsistent,
    message,
  }
}

/**
 * Compute comparison for a competitor group.
 * This is a read-only operation with no side effects.
 */
export async function computeComparison(groupId: string): Promise<ComparisonResult | null> {
  try {
    // Get the group with all pages
    const group = await prisma.competitorGroup.findUnique({
      where: { id: groupId },
      include: {
        primaryPage: {
          include: {
            snapshots: {
              orderBy: { created_at: 'desc' },
              take: 1,
            },
          },
        },
        competitorPages: {
          include: {
            facebookPage: {
              include: {
                snapshots: {
                  orderBy: { created_at: 'desc' },
                  take: 1,
                },
              },
            },
          },
        },
      },
    })

    if (!group) {
      return null
    }

    // Build page metrics array
    const pageMetrics: PageMetrics[] = []
    const allSnapshots: Array<{ scoring_version: string }> = []

    // Add primary page
    const primarySnapshot = group.primaryPage.snapshots[0]
    if (primarySnapshot) {
      allSnapshots.push(primarySnapshot)
    }

    pageMetrics.push({
      pageId: group.primaryPage.id,
      pageName: group.primaryPage.name,
      isPrimary: true,
      snapshotDate: primarySnapshot?.created_at.toISOString() ?? null,
      metrics: {
        overall_score: primarySnapshot?.overall_score ?? null,
        engagement_rate: primarySnapshot?.engagement_rate ?? null,
        avg_reactions: primarySnapshot?.avg_reactions ?? null,
        avg_comments: primarySnapshot?.avg_comments ?? null,
        avg_shares: primarySnapshot?.avg_shares ?? null,
        posts_per_week: primarySnapshot?.posts_per_week ?? null,
        fan_count: primarySnapshot?.fan_count ?? null,
      },
    })

    // Add competitor pages
    for (const cp of group.competitorPages) {
      const snapshot = cp.facebookPage.snapshots[0]
      if (snapshot) {
        allSnapshots.push(snapshot)
      }

      pageMetrics.push({
        pageId: cp.facebookPage.id,
        pageName: cp.facebookPage.name,
        isPrimary: false,
        snapshotDate: snapshot?.created_at.toISOString() ?? null,
        metrics: {
          overall_score: snapshot?.overall_score ?? null,
          engagement_rate: snapshot?.engagement_rate ?? null,
          avg_reactions: snapshot?.avg_reactions ?? null,
          avg_comments: snapshot?.avg_comments ?? null,
          avg_shares: snapshot?.avg_shares ?? null,
          posts_per_week: snapshot?.posts_per_week ?? null,
          fan_count: snapshot?.fan_count ?? null,
        },
      })
    }

    // Compute rankings for each metric
    const rankings: MetricRank[] = COMPARISON_METRICS.map((metricDef: ComparisonMetricDef) => {
      const values = pageMetrics.map((p) => ({
        pageId: p.pageId,
        value: p.metrics[metricDef.key] ?? null,
      }))

      const ranks = computeDenseRank(values, metricDef.direction)

      return {
        metricKey: metricDef.key,
        ranks,
      }
    })

    const reliability = assessReliability(pageMetrics, allSnapshots)

    log.debug(
      {
        groupId,
        pageCount: pageMetrics.length,
        reliability: reliability.level,
      },
      'Comparison computed'
    )

    return {
      groupId: group.id,
      groupName: group.name,
      reliability,
      pages: pageMetrics,
      rankings,
      meta: {
        scoringVersion: SCORING_VERSION,
        benchmarkVersion: BENCHMARK_VERSION,
        calculatedAt: new Date().toISOString(),
      },
    }
  } catch (error) {
    log.error({ error, groupId }, 'Failed to compute comparison')
    throw error
  }
}

/**
 * Save a comparison snapshot for historical tracking.
 */
export async function saveComparisonSnapshot(
  groupId: string,
  comparisonData: ComparisonResult
): Promise<string> {
  const comparison = await prisma.competitorComparison.create({
    data: {
      group_id: groupId,
      comparison_data: comparisonData as unknown as object,
      scoring_version: SCORING_VERSION,
      benchmark_version: BENCHMARK_VERSION,
    },
  })

  log.info({ groupId, comparisonId: comparison.id }, 'Comparison snapshot saved')

  return comparison.id
}

/**
 * Get historical comparisons for a group.
 */
export async function getComparisonHistory(
  groupId: string,
  limit: number = 10
): Promise<
  Array<{
    id: string
    createdAt: string
    data: ComparisonResult
  }>
> {
  const comparisons = await prisma.competitorComparison.findMany({
    where: { group_id: groupId },
    orderBy: { created_at: 'desc' },
    take: limit,
  })

  return comparisons.map((c) => ({
    id: c.id,
    createdAt: c.created_at.toISOString(),
    data: c.comparison_data as unknown as ComparisonResult,
  }))
}
