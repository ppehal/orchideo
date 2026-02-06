/**
 * Analysis Collector Tests
 *
 * Tests the data collection orchestration logic including page metadata,
 * feed fetching, insights, post enrichment, and error handling.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { collectAnalysisData } from '@/lib/services/analysis/collector'
import {
  createMockFacebookPost,
  createMockPageMetadata,
  createMockFetchFeedResult,
  createMockPageInsights,
} from '../../../utils/test-helpers'
import type { InsightsFetchResult } from '@/lib/integrations/facebook/insights'

// Mock functions - declared outside to avoid hoisting issues
const mockGetPageMetadata = vi.fn()
const mockFetchPageFeed = vi.fn()
const mockFetchPostInsightsBatch = vi.fn()
const mockFetchPageInsights = vi.fn()

vi.mock('@/lib/integrations/facebook/client', () => ({
  getPageMetadata: (pageId: string, token: string) =>
    mockGetPageMetadata(pageId, token),
}))

vi.mock('@/lib/integrations/facebook/feed', () => ({
  fetchPageFeed: (pageId: string, token: string, options?: unknown) =>
    mockFetchPageFeed(pageId, token, options),
  fetchPostInsightsBatch: (postIds: string[], token: string) =>
    mockFetchPostInsightsBatch(postIds, token),
}))

vi.mock('@/lib/integrations/facebook/insights', () => ({
  fetchPageInsights: (pageId: string, token: string, options?: unknown) =>
    mockFetchPageInsights(pageId, token, options),
}))

vi.mock('@/lib/logging', () => ({
  createLogger: () => ({
    info: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }),
}))

const PAGE_ID = '123456789'
const ACCESS_TOKEN = 'test-token'

beforeEach(() => {
  vi.resetAllMocks()
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('collectAnalysisData', () => {
  // Default successful mocks for most tests
  function setupDefaultMocks() {
    const posts = [
      createMockFacebookPost({ id: 'post_1', created_time: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString() }),
      createMockFacebookPost({ id: 'post_2', created_time: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString() }),
    ]

    mockGetPageMetadata.mockResolvedValue(createMockPageMetadata())
    mockFetchPageFeed.mockResolvedValue(createMockFetchFeedResult(posts))
    mockFetchPageInsights.mockResolvedValue({
      data: createMockPageInsights(),
      error: null,
    } satisfies InsightsFetchResult)
    mockFetchPostInsightsBatch.mockResolvedValue(
      new Map([
        ['post_1', { post_impressions: 100, post_engaged_users: 10 }],
        ['post_2', { post_impressions: 200, post_engaged_users: 20 }],
      ])
    )

    return { posts }
  }

  describe('happy path', () => {
    it('collects all data successfully', async () => {
      setupDefaultMocks()

      const result = await collectAnalysisData(PAGE_ID, ACCESS_TOKEN)

      expect(result.success).toBe(true)
      expect(result.data).not.toBeNull()
      expect(result.errors).toHaveLength(0)
      expect(result.partialSuccess).toBe(false)

      // Verify data structure
      expect(result.data!.pageData.fb_page_id).toBe('123456789')
      expect(result.data!.posts).toHaveLength(2)
      expect(result.data!.insights).not.toBeNull()
      expect(result.data!.collectedAt).toBeInstanceOf(Date)
      expect(result.data!.metadata.postsCollected).toBe(2)
      expect(result.data!.metadata.insightsAvailable).toBe(true)
    })

    it('enriches posts with insights by default', async () => {
      setupDefaultMocks()

      await collectAnalysisData(PAGE_ID, ACCESS_TOKEN)

      // fetchPostInsightsBatch should be called with post IDs
      expect(mockFetchPostInsightsBatch).toHaveBeenCalledWith(
        ['post_1', 'post_2'],
        ACCESS_TOKEN
      )
    })

    it('calculates daysOfData from oldest post correctly', async () => {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      const posts = [
        createMockFacebookPost({ id: 'post_1', created_time: new Date().toISOString() }),
        createMockFacebookPost({ id: 'post_2', created_time: thirtyDaysAgo.toISOString() }),
      ]

      mockGetPageMetadata.mockResolvedValue(createMockPageMetadata())
      mockFetchPageFeed.mockResolvedValue(
        createMockFetchFeedResult(posts, { oldestPostDate: thirtyDaysAgo })
      )
      mockFetchPageInsights.mockResolvedValue({ data: null, error: null })
      mockFetchPostInsightsBatch.mockResolvedValue(new Map())

      const result = await collectAnalysisData(PAGE_ID, ACCESS_TOKEN)

      expect(result.data!.metadata.daysOfData).toBeGreaterThanOrEqual(29)
      expect(result.data!.metadata.daysOfData).toBeLessThanOrEqual(31)
    })
  })

  describe('error handling', () => {
    it('fails immediately if page metadata fails (non-recoverable)', async () => {
      mockGetPageMetadata.mockRejectedValue(new Error('Token expired'))

      const result = await collectAnalysisData(PAGE_ID, ACCESS_TOKEN)

      expect(result.success).toBe(false)
      expect(result.data).toBeNull()
      expect(result.partialSuccess).toBe(false)
      expect(result.errors).toHaveLength(1)
      expect(result.errors[0]!.component).toBe('pageData')
      expect(result.errors[0]!.recoverable).toBe(false)

      // Feed and insights should not be called
      expect(mockFetchPageFeed).not.toHaveBeenCalled()
      expect(mockFetchPageInsights).not.toHaveBeenCalled()
    })

    it('succeeds with feed if insights fail (partial success)', async () => {
      const posts = [createMockFacebookPost({ id: 'post_1' })]

      mockGetPageMetadata.mockResolvedValue(createMockPageMetadata())
      mockFetchPageFeed.mockResolvedValue(createMockFetchFeedResult(posts))
      mockFetchPageInsights.mockResolvedValue({
        data: null,
        error: {
          code: 'PERMISSION_DENIED',
          fbErrorCode: 200,
          message: 'Permission denied',
          userMessageCz: 'Chybí oprávnění',
        },
      } satisfies InsightsFetchResult)
      mockFetchPostInsightsBatch.mockResolvedValue(new Map([['post_1', { post_impressions: 100 }]]))

      const result = await collectAnalysisData(PAGE_ID, ACCESS_TOKEN)

      expect(result.data).not.toBeNull()
      expect(result.data!.posts).toHaveLength(1)
      expect(result.data!.insights).toBeNull()
      expect(result.partialSuccess).toBe(true)
      expect(result.errors).toHaveLength(1)
      expect(result.errors[0]!.component).toBe('insights')
    })

    it('sets partialSuccess: true when insights fail', async () => {
      const posts = [createMockFacebookPost({ id: 'post_1' })]

      mockGetPageMetadata.mockResolvedValue(createMockPageMetadata())
      mockFetchPageFeed.mockResolvedValue(createMockFetchFeedResult(posts))
      mockFetchPageInsights.mockResolvedValue({
        data: null,
        error: {
          code: 'RATE_LIMITED',
          fbErrorCode: 4,
          message: 'Rate limited',
          userMessageCz: 'Limit překročen',
        },
      } satisfies InsightsFetchResult)
      mockFetchPostInsightsBatch.mockResolvedValue(new Map([['post_1', null]]))

      const result = await collectAnalysisData(PAGE_ID, ACCESS_TOKEN)

      expect(result.partialSuccess).toBe(true)
      expect(result.success).toBe(false) // success is false because there are errors
    })

    it('fails if feed returns 0 posts (no data to analyze)', async () => {
      mockGetPageMetadata.mockResolvedValue(createMockPageMetadata())
      mockFetchPageFeed.mockResolvedValue(
        createMockFetchFeedResult([], { totalFetched: 0 })
      )
      mockFetchPageInsights.mockResolvedValue({
        data: createMockPageInsights(),
        error: null,
      })

      const result = await collectAnalysisData(PAGE_ID, ACCESS_TOKEN)

      expect(result.success).toBe(false)
      expect(result.data).toBeNull()
      expect(result.errors.some((e) => e.component === 'feed')).toBe(true)
    })

    it('handles feed rejection gracefully', async () => {
      mockGetPageMetadata.mockResolvedValue(createMockPageMetadata())
      mockFetchPageFeed.mockRejectedValue(new Error('Feed fetch failed'))
      mockFetchPageInsights.mockResolvedValue({
        data: createMockPageInsights(),
        error: null,
      })

      const result = await collectAnalysisData(PAGE_ID, ACCESS_TOKEN)

      expect(result.success).toBe(false)
      expect(result.data).toBeNull()
      expect(result.errors.some((e) => e.component === 'feed')).toBe(true)
    })

    it('fetches feed and insights in parallel', async () => {
      const callOrder: string[] = []

      mockGetPageMetadata.mockResolvedValue(createMockPageMetadata())
      mockFetchPageFeed.mockImplementation(async () => {
        callOrder.push('feed-start')
        await new Promise((r) => setTimeout(r, 10))
        callOrder.push('feed-end')
        return createMockFetchFeedResult([createMockFacebookPost({ id: 'post_1' })])
      })
      mockFetchPageInsights.mockImplementation(async () => {
        callOrder.push('insights-start')
        await new Promise((r) => setTimeout(r, 10))
        callOrder.push('insights-end')
        return { data: null, error: null }
      })
      mockFetchPostInsightsBatch.mockResolvedValue(new Map([['post_1', null]]))

      await collectAnalysisData(PAGE_ID, ACCESS_TOKEN)

      // Both should start before either finishes (parallel execution via Promise.allSettled)
      const feedStartIdx = callOrder.indexOf('feed-start')
      const insightsStartIdx = callOrder.indexOf('insights-start')
      const feedEndIdx = callOrder.indexOf('feed-end')

      expect(feedStartIdx).toBeLessThan(feedEndIdx)
      expect(insightsStartIdx).toBeLessThan(feedEndIdx)
    })

    it('includes correct error codes for each component', async () => {
      mockGetPageMetadata.mockResolvedValue(createMockPageMetadata())
      mockFetchPageFeed.mockResolvedValue(
        createMockFetchFeedResult([createMockFacebookPost({ id: 'post_1' })])
      )
      mockFetchPageInsights.mockResolvedValue({
        data: null,
        error: {
          code: 'PERMISSION_DENIED',
          fbErrorCode: 200,
          message: 'No read_insights permission',
          userMessageCz: 'Chybí oprávnění',
        },
      } satisfies InsightsFetchResult)
      mockFetchPostInsightsBatch.mockResolvedValue(new Map([['post_1', null]]))

      const result = await collectAnalysisData(PAGE_ID, ACCESS_TOKEN)

      const insightsError = result.errors.find((e) => e.component === 'insights')
      expect(insightsError).toBeDefined()
      expect(insightsError!.message).toContain('permission')
      expect(insightsError!.recoverable).toBe(true)
    })

    it('sets insightsError and insightsErrorMessage correctly', async () => {
      const posts = [createMockFacebookPost({ id: 'post_1' })]

      mockGetPageMetadata.mockResolvedValue(createMockPageMetadata())
      mockFetchPageFeed.mockResolvedValue(createMockFetchFeedResult(posts))
      mockFetchPageInsights.mockResolvedValue({
        data: null,
        error: {
          code: 'PERMISSION_DENIED',
          fbErrorCode: 200,
          message: 'Permission denied to access page insights',
          userMessageCz: 'Chybí oprávnění read_insights.',
        },
      } satisfies InsightsFetchResult)
      mockFetchPostInsightsBatch.mockResolvedValue(new Map([['post_1', null]]))

      const result = await collectAnalysisData(PAGE_ID, ACCESS_TOKEN)

      expect(result.data!.metadata.insightsError).toBe('PERMISSION_DENIED')
      expect(result.data!.metadata.insightsErrorMessage).toBe('Chybí oprávnění read_insights.')
    })

    it('does not add NOT_SUPPORTED insights to errors array', async () => {
      const posts = [createMockFacebookPost({ id: 'post_1' })]

      mockGetPageMetadata.mockResolvedValue(createMockPageMetadata())
      mockFetchPageFeed.mockResolvedValue(createMockFetchFeedResult(posts))
      mockFetchPageInsights.mockResolvedValue({
        data: null,
        error: {
          code: 'NOT_SUPPORTED',
          fbErrorCode: 100,
          message: 'Page does not support insights API',
          userMessageCz: 'Stránka nepodporuje insights.',
        },
      } satisfies InsightsFetchResult)
      mockFetchPostInsightsBatch.mockResolvedValue(new Map([['post_1', null]]))

      const result = await collectAnalysisData(PAGE_ID, ACCESS_TOKEN)

      // NOT_SUPPORTED should not be in errors (it's expected for small pages)
      expect(result.errors).toHaveLength(0)
      expect(result.success).toBe(true) // No errors means success
      expect(result.data!.metadata.insightsError).toBe('NOT_SUPPORTED')
    })
  })
})

describe('enrichPostsWithInsights', () => {
  // enrichPostsWithInsights is tested indirectly through collectAnalysisData

  it('enriches all posts via batch API', async () => {
    const posts = [
      createMockFacebookPost({ id: 'post_1' }),
      createMockFacebookPost({ id: 'post_2' }),
      createMockFacebookPost({ id: 'post_3' }),
    ]

    mockGetPageMetadata.mockResolvedValue(createMockPageMetadata())
    mockFetchPageFeed.mockResolvedValue(createMockFetchFeedResult(posts))
    mockFetchPageInsights.mockResolvedValue({ data: null, error: null })
    mockFetchPostInsightsBatch.mockResolvedValue(
      new Map([
        ['post_1', { post_impressions: 100 }],
        ['post_2', { post_impressions: 200 }],
        ['post_3', { post_impressions: 300 }],
      ])
    )

    const result = await collectAnalysisData(PAGE_ID, ACCESS_TOKEN)

    expect(mockFetchPostInsightsBatch).toHaveBeenCalledWith(
      ['post_1', 'post_2', 'post_3'],
      ACCESS_TOKEN
    )
    // Posts should have insights attached
    expect(result.data!.posts[0]!.insights).toEqual({ post_impressions: 100 })
    expect(result.data!.posts[1]!.insights).toEqual({ post_impressions: 200 })
    expect(result.data!.posts[2]!.insights).toEqual({ post_impressions: 300 })
  })

  it('skips enrichment when fetchPostInsights is false', async () => {
    const posts = [createMockFacebookPost({ id: 'post_1' })]

    mockGetPageMetadata.mockResolvedValue(createMockPageMetadata())
    mockFetchPageFeed.mockResolvedValue(createMockFetchFeedResult(posts))
    mockFetchPageInsights.mockResolvedValue({ data: null, error: null })

    await collectAnalysisData(PAGE_ID, ACCESS_TOKEN, { fetchPostInsights: false })

    expect(mockFetchPostInsightsBatch).not.toHaveBeenCalled()
  })

  it('handles partial batch failures (some posts enriched)', async () => {
    const posts = [
      createMockFacebookPost({ id: 'post_1' }),
      createMockFacebookPost({ id: 'post_2' }),
    ]

    mockGetPageMetadata.mockResolvedValue(createMockPageMetadata())
    mockFetchPageFeed.mockResolvedValue(createMockFetchFeedResult(posts))
    mockFetchPageInsights.mockResolvedValue({ data: null, error: null })
    mockFetchPostInsightsBatch.mockResolvedValue(
      new Map<string, Record<string, number> | null>([
        ['post_1', { post_impressions: 100 }],
        ['post_2', null], // Failed
      ])
    )

    const result = await collectAnalysisData(PAGE_ID, ACCESS_TOKEN)

    expect(result.data).not.toBeNull()
    // post_1 should have insights, post_2 should not
    expect(result.data!.posts[0]!.insights).toEqual({ post_impressions: 100 })
    expect(result.data!.posts[1]!.insights).toBeUndefined()
  })
})

describe('convertToRawPost', () => {
  // convertToRawPost is tested indirectly through collectAnalysisData

  it('maps all required fields correctly', async () => {
    const post = createMockFacebookPost({
      id: 'post_abc',
      created_time: '2025-01-15T10:00:00Z',
      message: 'Hello world',
      story: 'User shared a post',
      permalink_url: 'https://facebook.com/post/abc',
      full_picture: 'https://example.com/pic.jpg',
      attachments: { data: [{ media_type: 'photo' }] },
      reactions: { summary: { total_count: 42 } },
      comments: { summary: { total_count: 7 } },
      shares: { count: 3 },
    })

    mockGetPageMetadata.mockResolvedValue(createMockPageMetadata())
    mockFetchPageFeed.mockResolvedValue(createMockFetchFeedResult([post]))
    mockFetchPageInsights.mockResolvedValue({ data: null, error: null })
    mockFetchPostInsightsBatch.mockResolvedValue(new Map([['post_abc', null]]))

    const result = await collectAnalysisData(PAGE_ID, ACCESS_TOKEN)

    const rawPost = result.data!.posts[0]!
    expect(rawPost.id).toBe('post_abc')
    expect(rawPost.created_time).toBe('2025-01-15T10:00:00Z')
    expect(rawPost.message).toBe('Hello world')
    expect(rawPost.story).toBe('User shared a post')
    expect(rawPost.permalink_url).toBe('https://facebook.com/post/abc')
    expect(rawPost.full_picture).toBe('https://example.com/pic.jpg')
    expect(rawPost.attachments).toEqual({ data: [{ media_type: 'photo' }] })
    expect(rawPost.reactions).toEqual({ summary: { total_count: 42 } })
    expect(rawPost.comments).toEqual({ summary: { total_count: 7 } })
    expect(rawPost.shares).toEqual({ count: 3 })
  })
})
