import { createLogger } from '@/lib/logging'
import { getPageMetadata } from '@/lib/integrations/facebook/client'
import { fetchPageFeed, fetchPostInsightsBatch } from '@/lib/integrations/facebook/feed'
import { fetchPageInsights } from '@/lib/integrations/facebook/insights'
import type { CollectedData, RawPost } from './types'
import type { FacebookPost } from '@/lib/integrations/facebook/types'

const log = createLogger('analysis-collector')

export interface CollectorOptions {
  maxPosts?: number
  maxFeedPages?: number
  feedDaysBack?: number
  insightsDaysBack?: number
  fetchPostInsights?: boolean
}

export interface CollectorResult {
  success: boolean
  data: CollectedData | null
  errors: CollectorError[]
  partialSuccess: boolean
}

export interface CollectorError {
  component: 'pageData' | 'feed' | 'insights' | 'postInsights'
  message: string
  code?: string
  recoverable: boolean
}

function convertToRawPost(post: FacebookPost): RawPost {
  // Note: type and status_type are not mapped as they're deprecated in Graph API v3.3+
  // Post type is derived from attachments.media_type in the normalizer
  return {
    id: post.id,
    created_time: post.created_time,
    message: post.message,
    story: post.story,
    permalink_url: post.permalink_url,
    full_picture: post.full_picture,
    attachments: post.attachments,
    reactions: post.reactions,
    comments: post.comments,
    shares: post.shares,
    insights: post.processedInsights,
  }
}

async function enrichPostsWithInsights(
  posts: FacebookPost[],
  accessToken: string,
  pageId: string
): Promise<{
  posts: FacebookPost[]
  stats: { total: number; enriched: number; failed: number }
}> {
  // Edge case: empty posts
  if (posts.length === 0) {
    return { posts: [], stats: { total: 0, enriched: 0, failed: 0 } }
  }

  const stats = { total: posts.length, enriched: 0, failed: 0 }

  log.info({ pageId, totalPosts: posts.length }, 'Starting post insights enrichment (batch mode)')

  try {
    // Extract all post IDs
    const postIds = posts.map((post) => post.id)

    // Fetch insights for all posts in batches (Facebook Batch API - 50 posts per request)
    const insightsMap = await fetchPostInsightsBatch(postIds, accessToken)

    // Map insights back to posts
    posts.forEach((post) => {
      const insights = insightsMap.get(post.id)
      if (insights !== undefined) {
        if (insights !== null) {
          post.processedInsights = insights
          stats.enriched++
        } else {
          stats.failed++
        }
      } else {
        // Post not in results map (shouldn't happen)
        stats.failed++
      }
    })

    log.info(
      {
        pageId,
        enriched: stats.enriched,
        failed: stats.failed,
        successRate: ((stats.enriched / stats.total) * 100).toFixed(1) + '%',
      },
      'Post insights enrichment completed (batch mode)'
    )
  } catch (error) {
    log.error({ pageId, error }, 'Batch post insights enrichment failed')

    // Count partial results (some batches may have succeeded before exception)
    posts.forEach((post) => {
      if (post.processedInsights) {
        stats.enriched++
      } else {
        stats.failed++
      }
    })

    log.warn(
      {
        pageId,
        partialEnriched: stats.enriched,
        partialFailed: stats.failed,
      },
      'Partial enrichment results after exception'
    )
  }

  return { posts, stats }
}

export async function collectAnalysisData(
  pageId: string,
  accessToken: string,
  options: CollectorOptions = {}
): Promise<CollectorResult> {
  const errors: CollectorError[] = []
  const startTime = Date.now()

  log.info({ pageId, options }, 'Starting data collection')

  // Fetch page metadata (required)
  let pageData
  try {
    pageData = await getPageMetadata(pageId, accessToken)
    log.info({ pageId, pageName: pageData.name }, 'Page metadata collected')
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    log.error({ pageId, error }, 'Failed to fetch page metadata')
    errors.push({
      component: 'pageData',
      message: `Failed to fetch page metadata: ${message}`,
      recoverable: false,
    })
    return {
      success: false,
      data: null,
      errors,
      partialSuccess: false,
    }
  }

  // Fetch feed and insights in parallel
  const [feedResult, insightsResult] = await Promise.allSettled([
    fetchPageFeed(pageId, accessToken, {
      maxPosts: options.maxPosts,
      maxPages: options.maxFeedPages,
      daysBack: options.feedDaysBack,
    }),
    fetchPageInsights(pageId, accessToken, {
      daysBack: options.insightsDaysBack,
    }),
  ])

  // Process feed result
  let posts: RawPost[] = []
  let feedMetadata = {
    postsCollected: 0,
    oldestPostDate: null as Date | null,
    newestPostDate: null as Date | null,
    daysOfData: 0,
  }

  if (feedResult.status === 'fulfilled') {
    // Enrich posts with post-level insights (if enabled)
    let postsToConvert = feedResult.value.posts

    if (options.fetchPostInsights !== false && postsToConvert.length > 0) {
      try {
        // Add timeout protection for enrichment
        const ENRICHMENT_TIMEOUT_MS = 120_000 // 2 minutes

        const enrichResult = await Promise.race([
          enrichPostsWithInsights(feedResult.value.posts, accessToken, pageId),
          new Promise<never>((_, reject) =>
            setTimeout(
              () => reject(new Error('Post insights enrichment timeout')),
              ENRICHMENT_TIMEOUT_MS
            )
          ),
        ])

        postsToConvert = enrichResult.posts

        log.info(
          {
            pageId,
            enriched: enrichResult.stats.enriched,
            failed: enrichResult.stats.failed,
          },
          'Post insights enrichment completed'
        )
      } catch (error) {
        log.warn(
          { pageId, error },
          'Post insights enrichment failed, continuing with unenriched posts'
        )
        errors.push({
          component: 'postInsights',
          message: error instanceof Error ? error.message : 'Failed to enrich posts with insights',
          recoverable: true,
        })
        // Continue with unenriched posts
      }
    }

    posts = postsToConvert.map(convertToRawPost)
    feedMetadata = {
      postsCollected: feedResult.value.totalFetched,
      oldestPostDate: feedResult.value.oldestPostDate,
      newestPostDate: feedResult.value.newestPostDate,
      daysOfData: feedResult.value.oldestPostDate
        ? Math.ceil(
            (Date.now() - feedResult.value.oldestPostDate.getTime()) / (1000 * 60 * 60 * 24)
          )
        : 0,
    }
    log.info({ pageId, postsCollected: posts.length }, 'Feed collected')
  } else {
    const message = feedResult.reason instanceof Error ? feedResult.reason.message : 'Unknown error'
    log.error({ pageId, error: feedResult.reason }, 'Failed to fetch feed')
    errors.push({
      component: 'feed',
      message: `Failed to fetch feed: ${message}`,
      recoverable: true,
    })
  }

  // Process insights result - extract data and error context
  let insights = null
  let insightsError: string | null = null
  let insightsErrorMessage: string | null = null

  if (insightsResult.status === 'fulfilled') {
    const result = insightsResult.value // InsightsFetchResult
    insights = result.data

    if (insights) {
      log.info(
        { pageId, impressions: insights.page_impressions, fans: insights.page_fans },
        'Insights collected successfully'
      )
    } else if (result.error) {
      // Insights failed with known error
      insightsError = result.error.code
      insightsErrorMessage = result.error.userMessageCz

      log.info(
        { pageId, errorCode: result.error.code, fbErrorCode: result.error.fbErrorCode },
        result.error.message
      )

      // Only add to errors array if it's a real problem (not NOT_SUPPORTED)
      if (result.error.code !== 'NOT_SUPPORTED') {
        errors.push({
          component: 'insights',
          message: result.error.message,
          recoverable: true,
        })
      }
    }
  } else {
    // Promise rejected (shouldn't happen with new implementation)
    const message =
      insightsResult.reason instanceof Error ? insightsResult.reason.message : 'Unknown error'
    log.error({ pageId, error: insightsResult.reason }, 'Failed to fetch insights')
    insightsError = 'UNKNOWN'
    insightsErrorMessage = 'Nepodařilo se načíst insights'
    errors.push({
      component: 'insights',
      message: `Failed to fetch insights: ${message}`,
      recoverable: true,
    })
  }

  const collectedAt = new Date()
  const elapsedMs = Date.now() - startTime

  log.info(
    {
      pageId,
      postsCollected: posts.length,
      insightsAvailable: !!insights,
      errorsCount: errors.length,
      elapsedMs,
    },
    'Data collection completed'
  )

  // Determine success status
  const hasRequiredData = posts.length > 0
  const success = hasRequiredData && errors.length === 0
  const partialSuccess = hasRequiredData && errors.length > 0

  if (!hasRequiredData) {
    errors.push({
      component: 'feed',
      message: 'No posts collected - cannot perform analysis',
      recoverable: false,
    })
  }

  return {
    success,
    data: hasRequiredData
      ? {
          pageData,
          posts,
          insights,
          collectedAt,
          metadata: {
            ...feedMetadata,
            insightsAvailable: !!insights,
            insightsError,
            insightsErrorMessage,
          },
        }
      : null,
    errors,
    partialSuccess,
  }
}
