import { createLogger } from '@/lib/logging'
import { getPageMetadata } from '@/lib/integrations/facebook/client'
import { fetchPageFeed } from '@/lib/integrations/facebook/feed'
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
  return {
    id: post.id,
    created_time: post.created_time,
    message: post.message,
    story: post.story,
    type: post.type,
    status_type: post.status_type,
    permalink_url: post.permalink_url,
    full_picture: post.full_picture,
    attachments: post.attachments,
    reactions: post.reactions,
    comments: post.comments,
    shares: post.shares,
  }
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
    posts = feedResult.value.posts.map(convertToRawPost)
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

  // Process insights result
  let insights = null
  if (insightsResult.status === 'fulfilled') {
    insights = insightsResult.value
    if (insights) {
      log.info(
        { pageId, impressions: insights.page_impressions, fans: insights.page_fans },
        'Insights collected'
      )
    } else {
      log.info({ pageId }, 'Insights not available for this page')
    }
  } else {
    const message =
      insightsResult.reason instanceof Error ? insightsResult.reason.message : 'Unknown error'
    log.warn({ pageId, error: insightsResult.reason }, 'Failed to fetch insights')
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
          },
        }
      : null,
    errors,
    partialSuccess,
  }
}
