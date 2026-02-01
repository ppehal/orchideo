import { prisma } from '@/lib/prisma'
import { createLogger, logError, LogFields } from '@/lib/logging'
import { SCORING_VERSION, BENCHMARK_VERSION, TREND_THRESHOLDS } from '@/lib/constants/versions'
import type {
  TrendDirection,
  TrendReliability,
  TrendData,
  TrendDataPoint,
  TrendReliabilityInfo,
  TrendResponse,
} from '@/types/trends'

const log = createLogger('trend-service')

/**
 * Determine the direction of a trend based on change.
 */
function getTrendDirection(change: number | null, threshold: number): TrendDirection {
  if (change === null) return 'stable'
  if (Math.abs(change) < threshold) return 'stable'
  return change > 0 ? 'up' : 'down'
}

/**
 * Assess the reliability of trend data based on available snapshots.
 */
function assessReliability(
  snapshots: Array<{ created_at: Date; scoring_version: string }>,
  windowDays: number
): TrendReliabilityInfo {
  const count = snapshots.length
  const minRequired = TREND_THRESHOLDS.MIN_SNAPSHOTS_FOR_TREND

  if (count === 0) {
    return {
      level: 'insufficient',
      snapshotCount: 0,
      oldestSnapshotDate: null,
      newestSnapshotDate: null,
      scoringVersionConsistent: true,
      message: 'Žádná historická data k dispozici',
    }
  }

  const oldestSnapshot = snapshots[snapshots.length - 1]
  const newestSnapshot = snapshots[0]

  if (!oldestSnapshot || !newestSnapshot) {
    return {
      level: 'insufficient',
      snapshotCount: count,
      oldestSnapshotDate: null,
      newestSnapshotDate: null,
      scoringVersionConsistent: true,
      message: 'Žádná historická data k dispozici',
    }
  }

  const oldestDate = oldestSnapshot.created_at
  const newestDate = newestSnapshot.created_at
  const scoringVersionConsistent = snapshots.every((s) => s.scoring_version === SCORING_VERSION)

  if (count < minRequired) {
    return {
      level: 'insufficient',
      snapshotCount: count,
      oldestSnapshotDate: oldestDate.toISOString(),
      newestSnapshotDate: newestDate.toISOString(),
      scoringVersionConsistent,
      message: `Nedostatek dat pro spolehlivý trend (${count}/${minRequired} analýz)`,
    }
  }

  // Calculate actual time span
  const timeSpanDays = (newestDate.getTime() - oldestDate.getTime()) / (1000 * 60 * 60 * 24)

  let level: TrendReliability
  let message: string

  if (count >= 5 && timeSpanDays >= windowDays * 0.7) {
    level = 'high'
    message = 'Spolehlivá data pro analýzu trendu'
  } else if (count >= 3 && timeSpanDays >= windowDays * 0.4) {
    level = 'medium'
    message = 'Dostatečná data, trend je orientační'
  } else {
    level = 'low'
    message = 'Omezená data, trend může být nepřesný'
  }

  if (!scoringVersionConsistent) {
    message += ' (varování: různé verze algoritmu)'
  }

  return {
    level,
    snapshotCount: count,
    oldestSnapshotDate: oldestDate.toISOString(),
    newestSnapshotDate: newestDate.toISOString(),
    scoringVersionConsistent,
    message,
  }
}

/**
 * Build trend data for a single metric.
 */
function buildTrendData(
  metricName: string,
  dataPoints: TrendDataPoint[],
  changeThreshold: number
): TrendData {
  if (dataPoints.length === 0) {
    return {
      metricName,
      currentValue: null,
      previousValue: null,
      changeAbsolute: null,
      changePercent: null,
      direction: 'stable',
      isSignificant: false,
      dataPoints: [],
    }
  }

  const currentValue = dataPoints[0]?.value ?? null
  const previousValue = dataPoints.length > 1 ? (dataPoints[1]?.value ?? null) : null

  let changeAbsolute: number | null = null
  let changePercent: number | null = null

  if (currentValue !== null && previousValue !== null) {
    changeAbsolute = currentValue - previousValue
    changePercent = previousValue !== 0 ? (changeAbsolute / previousValue) * 100 : null
  }

  const direction = getTrendDirection(changePercent, changeThreshold)
  const isSignificant = changePercent !== null && Math.abs(changePercent) >= changeThreshold

  return {
    metricName,
    currentValue,
    previousValue,
    changeAbsolute,
    changePercent,
    direction,
    isSignificant,
    dataPoints,
  }
}

/**
 * Get trend data for a Facebook page.
 */
export async function getTrendsForPage(pageId: string): Promise<TrendResponse | null> {
  try {
    const page = await prisma.facebookPage.findUnique({
      where: { id: pageId },
      select: {
        id: true,
        name: true,
      },
    })

    if (!page) {
      return null
    }

    // Get snapshots for the page, ordered by creation date (newest first)
    const windowDate = new Date()
    windowDate.setDate(windowDate.getDate() - TREND_THRESHOLDS.TREND_WINDOW_DAYS)

    const snapshots = await prisma.analysisSnapshot.findMany({
      where: {
        fb_page_id: pageId,
        created_at: { gte: windowDate },
      },
      orderBy: { created_at: 'desc' },
      select: {
        analysisId: true,
        overall_score: true,
        engagement_rate: true,
        avg_reactions: true,
        avg_comments: true,
        avg_shares: true,
        posts_per_week: true,
        scoring_version: true,
        benchmark_version: true,
        created_at: true,
      },
    })

    const reliability = assessReliability(snapshots, TREND_THRESHOLDS.TREND_WINDOW_DAYS)

    // Build data points for each metric
    const buildDataPoints = (
      getValue: (s: (typeof snapshots)[0]) => number | null
    ): TrendDataPoint[] => {
      return snapshots
        .filter((s) => getValue(s) !== null)
        .map((s) => ({
          date: s.created_at.toISOString(),
          value: getValue(s)!,
          analysisId: s.analysisId,
        }))
    }

    const overallScorePoints = buildDataPoints((s) => s.overall_score)
    const engagementRatePoints = buildDataPoints((s) => s.engagement_rate)
    const postsPerWeekPoints = buildDataPoints((s) => s.posts_per_week)
    const avgReactionsPoints = buildDataPoints((s) => s.avg_reactions)
    const avgCommentsPoints = buildDataPoints((s) => s.avg_comments)
    const avgSharesPoints = buildDataPoints((s) => s.avg_shares)

    const response: TrendResponse = {
      pageId: page.id,
      pageName: page.name,
      reliability,
      trends: {
        overallScore: buildTrendData(
          'Overall Score',
          overallScorePoints,
          TREND_THRESHOLDS.SCORE_CHANGE_MIN
        ),
        engagementRate: buildTrendData(
          'Engagement Rate',
          engagementRatePoints,
          TREND_THRESHOLDS.ENGAGEMENT_CHANGE_MIN
        ),
        postsPerWeek: buildTrendData(
          'Posts per Week',
          postsPerWeekPoints,
          TREND_THRESHOLDS.POSTING_CHANGE_MIN
        ),
        avgReactions: buildTrendData(
          'Average Reactions',
          avgReactionsPoints,
          TREND_THRESHOLDS.ENGAGEMENT_CHANGE_MIN
        ),
        avgComments: buildTrendData(
          'Average Comments',
          avgCommentsPoints,
          TREND_THRESHOLDS.ENGAGEMENT_CHANGE_MIN
        ),
        avgShares: buildTrendData(
          'Average Shares',
          avgSharesPoints,
          TREND_THRESHOLDS.ENGAGEMENT_CHANGE_MIN
        ),
      },
      meta: {
        scoringVersion: SCORING_VERSION,
        benchmarkVersion: BENCHMARK_VERSION,
        calculatedAt: new Date().toISOString(),
      },
    }

    log.debug(
      {
        pageId,
        snapshotCount: snapshots.length,
        reliability: reliability.level,
      },
      'Trends calculated'
    )

    return response
  } catch (error) {
    logError(log, error, 'Failed to get trends for page', {
      [LogFields.fbPageId]: pageId,
    })
    throw error
  }
}
