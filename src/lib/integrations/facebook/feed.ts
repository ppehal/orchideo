import { createLogger } from '@/lib/logging'
import { FB_API_TIMEOUT_MS } from '@/lib/config/timeouts'
import { makeRequest, GRAPH_API_BASE_URL } from './client'
import type { FacebookFeedResponse, FacebookPost } from './types'

const log = createLogger('facebook-feed')

const MAX_FEED_POSTS = parseInt(process.env.MAX_FEED_POSTS || '300', 10)
const MAX_FEED_PAGES = parseInt(process.env.MAX_FEED_PAGES || '5', 10)
const FEED_TIMEOUT_MS = FB_API_TIMEOUT_MS
const FEED_DAYS = 90

// Fields to request for each post
// Note: 'type' and 'status_type' were deprecated in Graph API v3.3
// Post type is now derived from attachments.media_type in the normalizer
const POST_FIELDS = [
  'id',
  'created_time',
  'message',
  'story',
  'permalink_url',
  'full_picture',
  'attachments{media,media_type,type,url,title,description,target,subattachments}',
  'reactions.summary(total_count)',
  'comments.summary(total_count)',
  'shares',
  'is_published',
  'is_hidden',
].join(',')

export interface FetchFeedOptions {
  maxPosts?: number
  maxPages?: number
  daysBack?: number
  includeInsights?: boolean
}

export interface FetchFeedResult {
  posts: FacebookPost[]
  totalFetched: number
  pagesProcessed: number
  oldestPostDate: Date | null
  newestPostDate: Date | null
  reachedMaxPosts: boolean
  reachedMaxPages: boolean
  reachedDateLimit: boolean
}

export async function fetchPageFeed(
  pageId: string,
  accessToken: string,
  options: FetchFeedOptions = {}
): Promise<FetchFeedResult> {
  const maxPosts = options.maxPosts ?? MAX_FEED_POSTS
  const maxPages = options.maxPages ?? MAX_FEED_PAGES
  const daysBack = options.daysBack ?? FEED_DAYS

  const posts: FacebookPost[] = []
  const cutoffDate = new Date()
  cutoffDate.setDate(cutoffDate.getDate() - daysBack)

  let pagesProcessed = 0
  let reachedMaxPosts = false
  let reachedMaxPages = false
  let reachedDateLimit = false
  let nextUrl: string | null = null

  log.info(
    { pageId, maxPosts, maxPages, daysBack, cutoffDate: cutoffDate.toISOString() },
    'Starting feed fetch'
  )

  // Build initial URL with since parameter for optimization
  const sinceTimestamp = Math.floor(cutoffDate.getTime() / 1000)
  const initialUrl = `${GRAPH_API_BASE_URL}/${pageId}/feed?fields=${POST_FIELDS}&limit=100&since=${sinceTimestamp}`

  nextUrl = initialUrl

  while (nextUrl && pagesProcessed < maxPages && posts.length < maxPosts) {
    try {
      const response: FacebookFeedResponse = await makeRequest<FacebookFeedResponse>(
        nextUrl,
        accessToken,
        {
          timeoutMs: FEED_TIMEOUT_MS,
        }
      )

      pagesProcessed++

      if (!response.data || response.data.length === 0) {
        log.debug({ pageId, pagesProcessed }, 'No more posts in feed')
        break
      }

      for (const post of response.data) {
        // Check if we've reached max posts
        if (posts.length >= maxPosts) {
          reachedMaxPosts = true
          break
        }

        // Check if post is older than cutoff
        const postDate = new Date(post.created_time)
        if (postDate < cutoffDate) {
          reachedDateLimit = true
          break
        }

        // Skip hidden or unpublished posts
        if (post.is_hidden || post.is_published === false) {
          continue
        }

        posts.push(post)
      }

      // Check if we should stop
      if (reachedMaxPosts || reachedDateLimit) {
        break
      }

      // Get next page URL
      nextUrl = response.paging?.next ?? null

      if (pagesProcessed >= maxPages) {
        reachedMaxPages = true
      }

      log.debug(
        { pageId, pagesProcessed, postsCollected: posts.length, hasNextPage: !!nextUrl },
        'Feed page processed'
      )
    } catch (error) {
      log.error({ pageId, pagesProcessed, error }, 'Error fetching feed page')
      throw error
    }
  }

  // Calculate date range
  let oldestPostDate: Date | null = null
  let newestPostDate: Date | null = null

  if (posts.length > 0) {
    const sortedByDate = posts
      .map((p) => new Date(p.created_time))
      .sort((a, b) => a.getTime() - b.getTime())

    oldestPostDate = sortedByDate[0] ?? null
    newestPostDate = sortedByDate[sortedByDate.length - 1] ?? null
  }

  log.info(
    {
      pageId,
      totalPosts: posts.length,
      pagesProcessed,
      oldestPost: oldestPostDate?.toISOString(),
      newestPost: newestPostDate?.toISOString(),
      reachedMaxPosts,
      reachedMaxPages,
      reachedDateLimit,
    },
    'Feed fetch completed'
  )

  return {
    posts,
    totalFetched: posts.length,
    pagesProcessed,
    oldestPostDate,
    newestPostDate,
    reachedMaxPosts,
    reachedMaxPages,
    reachedDateLimit,
  }
}

export async function fetchPostInsights(
  postId: string,
  accessToken: string
): Promise<Record<string, number> | null> {
  const metrics = [
    'post_impressions',
    'post_impressions_unique',
    'post_impressions_organic',
    'post_impressions_paid',
    'post_engaged_users',
    'post_clicks',
    'post_reactions_by_type_total',
  ].join(',')

  const url = `${GRAPH_API_BASE_URL}/${postId}/insights?metric=${metrics}`

  try {
    const response = await makeRequest<{
      data: Array<{
        name: string
        values: Array<{ value: number | Record<string, number> }>
      }>
    }>(url, accessToken, { timeoutMs: FEED_TIMEOUT_MS })

    const result: Record<string, number> = {}

    for (const insight of response.data) {
      const value = insight.values[0]?.value
      if (typeof value === 'number') {
        result[insight.name] = value
      } else if (typeof value === 'object') {
        // Handle reaction types
        for (const [key, val] of Object.entries(value)) {
          result[`${insight.name}_${key}`] = val
        }
      }
    }

    return Object.keys(result).length > 0 ? result : null
  } catch (error) {
    // Post insights might not be available for all posts
    log.debug({ postId, error }, 'Could not fetch post insights')
    return null
  }
}
