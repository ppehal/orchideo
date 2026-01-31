import { prisma } from '@/lib/prisma'
import { createLogger } from '@/lib/logging'
import { SCORING_VERSION, BENCHMARK_VERSION } from '@/lib/constants/versions'
import type { AnalysisRawData, NormalizedPost } from '@/lib/services/analysis/types'

const log = createLogger('snapshot-service')

/**
 * Extract metrics from analysis raw data for snapshot creation.
 */
function extractMetricsFromRawData(rawData: AnalysisRawData): {
  engagementRate: number | null
  avgReactions: number | null
  avgComments: number | null
  avgShares: number | null
  postsPerWeek: number | null
} {
  const posts = rawData.posts90d

  if (posts.length === 0) {
    return {
      engagementRate: null,
      avgReactions: null,
      avgComments: null,
      avgShares: null,
      postsPerWeek: null,
    }
  }

  // Calculate averages
  const totalReactions = posts.reduce((sum, p) => sum + p.reactions_count, 0)
  const totalComments = posts.reduce((sum, p) => sum + p.comments_count, 0)
  const totalShares = posts.reduce((sum, p) => sum + p.shares_count, 0)
  const totalEngagement = posts.reduce((sum, p) => sum + p.total_engagement, 0)

  const avgReactions = totalReactions / posts.length
  const avgComments = totalComments / posts.length
  const avgShares = totalShares / posts.length

  // Calculate engagement rate (total engagement / fan count if available)
  const fanCount = rawData.pageData.fan_count
  const engagementRate = fanCount && fanCount > 0 ? totalEngagement / posts.length / fanCount : null

  // Calculate posts per week
  const postsPerWeek = calculatePostsPerWeek(posts, rawData.collectionMetadata.daysOfData)

  return {
    engagementRate,
    avgReactions,
    avgComments,
    avgShares,
    postsPerWeek,
  }
}

/**
 * Calculate average posts per week from post data.
 */
function calculatePostsPerWeek(posts: NormalizedPost[], daysOfData: number): number | null {
  if (posts.length === 0 || daysOfData <= 0) {
    return null
  }

  const weeks = daysOfData / 7
  return posts.length / weeks
}

/**
 * Create or update a snapshot for a completed analysis.
 * Should be called after an analysis is successfully completed.
 */
export async function createOrUpdateSnapshot(analysisId: string): Promise<void> {
  try {
    const analysis = await prisma.analysis.findUnique({
      where: { id: analysisId },
      select: {
        id: true,
        status: true,
        overall_score: true,
        page_fan_count: true,
        rawData: true,
        fb_page_id: true,
        facebookPage: {
          select: {
            id: true,
            fan_count: true,
          },
        },
      },
    })

    if (!analysis) {
      log.warn({ analysisId }, 'Analysis not found for snapshot creation')
      return
    }

    if (analysis.status !== 'COMPLETED') {
      log.debug(
        { analysisId, status: analysis.status },
        'Skipping snapshot for non-completed analysis'
      )
      return
    }

    if (!analysis.fb_page_id || !analysis.facebookPage) {
      log.warn({ analysisId }, 'No Facebook page linked to analysis')
      return
    }

    if (analysis.overall_score === null) {
      log.warn({ analysisId }, 'No overall score for analysis')
      return
    }

    const rawData = analysis.rawData as AnalysisRawData | null

    if (!rawData) {
      log.warn({ analysisId }, 'No raw data for analysis')
      return
    }

    const metrics = extractMetricsFromRawData(rawData)

    // Upsert snapshot (one per analysis)
    await prisma.analysisSnapshot.upsert({
      where: { analysisId },
      create: {
        analysisId,
        fb_page_id: analysis.facebookPage.id,
        overall_score: analysis.overall_score,
        engagement_rate: metrics.engagementRate,
        avg_reactions: metrics.avgReactions,
        avg_comments: metrics.avgComments,
        avg_shares: metrics.avgShares,
        posts_per_week: metrics.postsPerWeek,
        fan_count: analysis.page_fan_count ?? analysis.facebookPage.fan_count,
        scoring_version: SCORING_VERSION,
        benchmark_version: BENCHMARK_VERSION,
      },
      update: {
        overall_score: analysis.overall_score,
        engagement_rate: metrics.engagementRate,
        avg_reactions: metrics.avgReactions,
        avg_comments: metrics.avgComments,
        avg_shares: metrics.avgShares,
        posts_per_week: metrics.postsPerWeek,
        fan_count: analysis.page_fan_count ?? analysis.facebookPage.fan_count,
        scoring_version: SCORING_VERSION,
        benchmark_version: BENCHMARK_VERSION,
      },
    })

    log.info(
      {
        analysisId,
        overallScore: analysis.overall_score,
        engagementRate: metrics.engagementRate,
      },
      'Snapshot created/updated'
    )
  } catch (error) {
    log.error({ error, analysisId }, 'Failed to create snapshot')
    // Don't throw - snapshot creation should not fail the analysis
  }
}
