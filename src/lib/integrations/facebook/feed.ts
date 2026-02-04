import { createLogger } from '@/lib/logging'
import { FB_API_TIMEOUT_MS } from '@/lib/config/timeouts'
import { makeRequest, GRAPH_API_BASE_URL, getAppSecretProof } from './client'
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

/**
 * Batch fetch post insights for multiple posts using Facebook Batch API
 * Reduces N API calls to ceil(N/50) batch requests
 */
export async function fetchPostInsightsBatch(
  postIds: string[],
  accessToken: string
): Promise<Map<string, Record<string, number> | null>> {
  // Edge case: empty array
  if (postIds.length === 0) {
    return new Map()
  }

  const BATCH_SIZE = 50 // Facebook batch API limit
  const results = new Map<string, Record<string, number> | null>()

  const metrics = [
    'post_impressions',
    'post_impressions_unique',
    'post_impressions_organic',
    'post_impressions_paid',
    'post_engaged_users',
    'post_clicks',
    'post_reactions_by_type_total',
  ].join(',')

  // Helper: chunk array into batches
  const chunk = <T,>(array: T[], size: number): T[][] => {
    return Array.from({ length: Math.ceil(array.length / size) }, (_, i) =>
      array.slice(i * size, i * size + size)
    )
  }

  const batches = chunk(postIds, BATCH_SIZE)

  log.info(
    { totalPosts: postIds.length, batches: batches.length, batchSize: BATCH_SIZE },
    'Starting batch insights fetch'
  )

  for (const [batchIndex, batch] of batches.entries()) {
    try {
      // Build batch requests
      const batchRequests = batch.map((postId, index) => ({
        method: 'GET',
        relative_url: `${postId}/insights?metric=${metrics}`,
        name: `post-${index}`,
      }))

      // Make batch request via POST with secure authentication
      // Use URL params + appsecret_proof for security (same pattern as client.ts)
      const batchUrl = new URL(`${GRAPH_API_BASE_URL}/`)
      batchUrl.searchParams.set('access_token', accessToken)
      batchUrl.searchParams.set('appsecret_proof', getAppSecretProof(accessToken))
      batchUrl.searchParams.set('batch', JSON.stringify(batchRequests))

      const response = await fetch(batchUrl.toString(), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        signal: AbortSignal.timeout(FEED_TIMEOUT_MS),
      })

      if (!response.ok) {
        log.warn(
          { status: response.status, statusText: response.statusText, batchIndex: batchIndex + 1 },
          'Batch request failed with HTTP error'
        )
        // Mark all posts in batch as failed
        for (const postId of batch) {
          results.set(postId, null)
        }
        continue
      }

      const batchResults = await response.json()

      if (!Array.isArray(batchResults)) {
        log.warn({ batchIndex: batchIndex + 1 }, 'Invalid batch response format')
        for (const postId of batch) {
          results.set(postId, null)
        }
        continue
      }

      // Verify batch results count matches request count
      if (batchResults.length !== batch.length) {
        log.warn(
          {
            batchIndex: batchIndex + 1,
            expected: batch.length,
            received: batchResults.length,
          },
          'Batch results count mismatch - potential data loss'
        )
      }

      // Process batch results
      let successCount = 0
      let failCount = 0

      for (let i = 0; i < batchResults.length; i++) {
        const result = batchResults[i]
        const postId = batch[i]

        if (!postId) continue

        if (result.code === 200 && result.body) {
          try {
            const body = JSON.parse(result.body)
            const insightResult: Record<string, number> = {}

            if (body.data && Array.isArray(body.data)) {
              for (const insight of body.data) {
                const value = insight.values?.[0]?.value
                if (typeof value === 'number') {
                  insightResult[insight.name] = value
                } else if (typeof value === 'object' && value !== null) {
                  // Handle reaction types
                  for (const [key, val] of Object.entries(value)) {
                    if (typeof val === 'number') {
                      insightResult[`${insight.name}_${key}`] = val
                    }
                  }
                }
              }
            }

            results.set(postId, Object.keys(insightResult).length > 0 ? insightResult : null)
            if (Object.keys(insightResult).length > 0) {
              successCount++
            } else {
              failCount++
            }
          } catch (parseError) {
            log.debug({ postId, parseError }, 'Failed to parse batch result body')
            results.set(postId, null)
            failCount++
          }
        } else {
          // Non-200 response or no body
          results.set(postId, null)
          failCount++
        }
      }

      log.debug(
        {
          batchIndex: batchIndex + 1,
          batchSize: batch.length,
          successCount,
          failCount,
        },
        'Batch insights processed'
      )
    } catch (error) {
      log.warn({ batchIndex: batchIndex + 1, error }, 'Batch request error')
      // Mark all posts in batch as failed
      for (const postId of batch) {
        results.set(postId, null)
      }
    }
  }

  const totalSuccess = Array.from(results.values()).filter((v) => v !== null).length
  const totalFail = results.size - totalSuccess

  log.info(
    {
      totalPosts: postIds.length,
      successCount: totalSuccess,
      failCount: totalFail,
      successRate: ((totalSuccess / postIds.length) * 100).toFixed(1) + '%',
    },
    'Batch insights fetch completed'
  )

  return results
}
