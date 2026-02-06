/**
 * Facebook Feed Integration Tests
 *
 * Tests the Facebook feed fetching logic including pagination, filtering,
 * post insights, and batch API operations.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  fetchPageFeed,
  fetchPostInsights,
  fetchPostInsightsBatch,
} from '@/lib/integrations/facebook/feed'
import { createMockFeedResponse, createMockPostInsightsResponse } from '../../../utils/test-helpers'

// Mock functions - declared outside to avoid hoisting issues
const mockMakeRequest = vi.fn()
const mockGetAppSecretProof = vi.fn()
const mockFetch = vi.fn()

vi.mock('@/lib/integrations/facebook/client', () => ({
  makeRequest: (url: string, token: string, options?: unknown) =>
    mockMakeRequest(url, token, options),
  getAppSecretProof: (token: string) => mockGetAppSecretProof(token),
  GRAPH_API_BASE_URL: 'https://graph.facebook.com/v19.0',
  FacebookApiError: class FacebookApiError extends Error {
    constructor(
      message: string,
      public code: number,
      public type: string,
      public subcode?: number,
      public fbtrace_id?: string
    ) {
      super(message)
      this.name = 'FacebookApiError'
    }

    static fromResponse(error: {
      message: string
      code: number
      type: string
      error_subcode?: number
      fbtrace_id?: string
    }): FacebookApiError {
      return new FacebookApiError(
        error.message,
        error.code,
        error.type,
        error.error_subcode,
        error.fbtrace_id
      )
    }

    isTokenExpired() {
      return this.code === 190
    }
    isPermissionDenied() {
      return [10, 200, 230].includes(this.code)
    }
    isRateLimited() {
      return [4, 17, 32, 613].includes(this.code)
    }
    isRetryable() {
      return this.isRateLimited() || [1, 2].includes(this.code)
    }
  },
}))

vi.mock('@/lib/config/env', () => ({
  env: { MAX_FEED_POSTS: 500, MAX_FEED_PAGES: 10 },
}))

vi.mock('@/lib/logging', () => ({
  createLogger: () => ({
    info: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }),
}))

vi.mock('@/lib/config/timeouts.server', () => ({
  FB_API_TIMEOUT_MS: 30000,
}))

beforeEach(() => {
  // resetAllMocks clears call tracking AND mock implementation/return value queues
  // clearAllMocks only clears tracking, leaving mockResolvedValueOnce queues intact
  vi.resetAllMocks()
  vi.stubEnv('FACEBOOK_APP_SECRET', 'test-secret')
  mockGetAppSecretProof.mockReturnValue('test-proof-hash')
  // Set global fetch mock
  global.fetch = mockFetch as typeof fetch
})

afterEach(() => {
  vi.unstubAllEnvs()
  vi.restoreAllMocks()
  vi.useRealTimers()
})

describe('fetchPageFeed', () => {
  describe('happy path', () => {
    it('fetches posts successfully with default options', async () => {
      mockMakeRequest.mockResolvedValueOnce(
        createMockFeedResponse([{ id: 'post_1' }, { id: 'post_2' }])
      )

      const result = await fetchPageFeed('123456789', 'test-token')

      expect(result.posts).toHaveLength(2)
      expect(result.posts[0]?.id).toBe('post_1')
      expect(result.posts[1]?.id).toBe('post_2')
      expect(result.totalFetched).toBe(2)
      expect(result.pagesProcessed).toBe(1)
      expect(result.reachedMaxPosts).toBe(false)
      expect(result.reachedMaxPages).toBe(false)
      expect(result.reachedDateLimit).toBe(false)
    })

    it('respects maxPosts limit', async () => {
      mockMakeRequest.mockResolvedValueOnce(
        createMockFeedResponse([{ id: 'post_1' }, { id: 'post_2' }, { id: 'post_3' }])
      )

      const result = await fetchPageFeed('123456789', 'test-token', { maxPosts: 2 })

      expect(result.posts).toHaveLength(2)
      expect(result.totalFetched).toBe(2)
      expect(result.reachedMaxPosts).toBe(true)
    })

    it('follows pagination until no next URL', async () => {
      mockMakeRequest
        .mockResolvedValueOnce(
          createMockFeedResponse([{ id: 'post_1' }], 'https://graph.facebook.com/next1')
        )
        .mockResolvedValueOnce(
          createMockFeedResponse([{ id: 'post_2' }], 'https://graph.facebook.com/next2')
        )
        .mockResolvedValueOnce(createMockFeedResponse([{ id: 'post_3' }])) // No next URL

      const result = await fetchPageFeed('123456789', 'test-token')

      expect(result.posts).toHaveLength(3)
      expect(result.pagesProcessed).toBe(3)
      expect(mockMakeRequest).toHaveBeenCalledTimes(3)
    })

    it('stops at maxPages limit', async () => {
      mockMakeRequest
        .mockResolvedValueOnce(
          createMockFeedResponse([{ id: 'post_1' }], 'https://graph.facebook.com/next1')
        )
        .mockResolvedValueOnce(
          createMockFeedResponse([{ id: 'post_2' }], 'https://graph.facebook.com/next2')
        )
        .mockResolvedValueOnce(
          createMockFeedResponse([{ id: 'post_3' }], 'https://graph.facebook.com/next3')
        )

      const result = await fetchPageFeed('123456789', 'test-token', { maxPages: 2 })

      expect(result.pagesProcessed).toBe(2)
      expect(result.reachedMaxPages).toBe(true)
      expect(mockMakeRequest).toHaveBeenCalledTimes(2)
    })

    it('stops at date cutoff (daysBack)', async () => {
      const fiveDaysAgo = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000)
      const tenDaysAgo = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000)
      const fortyDaysAgo = new Date(Date.now() - 40 * 24 * 60 * 60 * 1000)

      mockMakeRequest.mockResolvedValueOnce(
        createMockFeedResponse([
          { id: 'post_1', created_time: fiveDaysAgo.toISOString() },
          { id: 'post_2', created_time: tenDaysAgo.toISOString() },
          { id: 'post_3', created_time: fortyDaysAgo.toISOString() }, // Too old (>30 days)
        ])
      )

      const result = await fetchPageFeed('123456789', 'test-token', { daysBack: 30 })

      expect(result.posts).toHaveLength(2)
      expect(result.posts[0]?.id).toBe('post_1')
      expect(result.posts[1]?.id).toBe('post_2')
      expect(result.reachedDateLimit).toBe(true)
    })

    it('skips hidden and unpublished posts', async () => {
      mockMakeRequest.mockResolvedValueOnce(
        createMockFeedResponse([
          { id: 'post_1', is_published: true, is_hidden: false },
          { id: 'post_2', is_published: false, is_hidden: false }, // Skip
          { id: 'post_3', is_published: true, is_hidden: true }, // Skip
          { id: 'post_4', is_published: true, is_hidden: false },
        ])
      )

      const result = await fetchPageFeed('123456789', 'test-token')

      expect(result.posts).toHaveLength(2)
      expect(result.posts[0]?.id).toBe('post_1')
      expect(result.posts[1]?.id).toBe('post_4')
    })
  })

  describe('edge cases', () => {
    it('handles empty feed response', async () => {
      mockMakeRequest.mockResolvedValueOnce(createMockFeedResponse([]))

      const result = await fetchPageFeed('123456789', 'test-token')

      expect(result.posts).toHaveLength(0)
      expect(result.totalFetched).toBe(0)
      expect(result.oldestPostDate).toBeNull()
      expect(result.newestPostDate).toBeNull()
    })
  })
})

describe('fetchPostInsights', () => {
  describe('happy path', () => {
    it('fetches insights successfully', async () => {
      const insights = {
        post_impressions: 5200,
        post_impressions_unique: 4100,
        post_engaged_users: 245,
        post_clicks: 120,
      }

      mockMakeRequest.mockResolvedValueOnce(createMockPostInsightsResponse(insights))

      const result = await fetchPostInsights('post_123', 'test-token')

      expect(result).toEqual(insights)
    })

    it('expands reaction type objects into separate keys', async () => {
      const insights = {
        post_impressions: 5200,
        post_reactions_by_type_total: {
          like: 180,
          love: 50,
          wow: 10,
        },
      }

      mockMakeRequest.mockResolvedValueOnce(createMockPostInsightsResponse(insights))

      const result = await fetchPostInsights('post_123', 'test-token')

      expect(result).toEqual({
        post_impressions: 5200,
        post_reactions_by_type_total_like: 180,
        post_reactions_by_type_total_love: 50,
        post_reactions_by_type_total_wow: 10,
      })
    })

    it('returns null on error (graceful degradation)', async () => {
      mockMakeRequest.mockRejectedValueOnce(new Error('Permission denied'))

      const result = await fetchPostInsights('post_123', 'test-token')

      expect(result).toBeNull()
    })

    it('handles makeRequest failure', async () => {
      mockMakeRequest.mockRejectedValueOnce(new Error('Network timeout'))

      const result = await fetchPostInsights('post_123', 'test-token')

      expect(result).toBeNull()
    })

    it('returns null when response has no data', async () => {
      mockMakeRequest.mockResolvedValueOnce({ data: [] })

      const result = await fetchPostInsights('post_123', 'test-token')

      expect(result).toBeNull()
    })
  })
})

describe('fetchPostInsightsBatch', () => {
  describe('happy path', () => {
    it('returns empty Map for empty input array', async () => {
      const result = await fetchPostInsightsBatch([], 'test-token')

      expect(result.size).toBe(0)
      expect(mockFetch).not.toHaveBeenCalled()
    })

    it('fetches insights for multiple posts in one batch', async () => {
      const postIds = ['post_1', 'post_2', 'post_3']

      const batchResponse = [
        {
          code: 200,
          body: JSON.stringify({
            data: [
              { name: 'post_impressions', values: [{ value: 100 }] },
              { name: 'post_engaged_users', values: [{ value: 10 }] },
            ],
          }),
        },
        {
          code: 200,
          body: JSON.stringify({
            data: [
              { name: 'post_impressions', values: [{ value: 200 }] },
              { name: 'post_engaged_users', values: [{ value: 20 }] },
            ],
          }),
        },
        {
          code: 200,
          body: JSON.stringify({
            data: [
              { name: 'post_impressions', values: [{ value: 300 }] },
              { name: 'post_engaged_users', values: [{ value: 30 }] },
            ],
          }),
        },
      ]

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => batchResponse,
      } as Response)

      const result = await fetchPostInsightsBatch(postIds, 'test-token')

      expect(result.size).toBe(3)
      expect(result.get('post_1')).toEqual({ post_impressions: 100, post_engaged_users: 10 })
      expect(result.get('post_2')).toEqual({ post_impressions: 200, post_engaged_users: 20 })
      expect(result.get('post_3')).toEqual({ post_impressions: 300, post_engaged_users: 30 })
    })

    it('splits into multiple batches when posts > 50', async () => {
      const postIds = Array.from({ length: 150 }, (_, i) => `post_${i}`)

      const batchResponse = Array.from({ length: 50 }, () => ({
        code: 200,
        body: JSON.stringify({
          data: [{ name: 'post_impressions', values: [{ value: 100 }] }],
        }),
      }))

      mockFetch
        .mockResolvedValueOnce({ ok: true, json: async () => batchResponse } as Response)
        .mockResolvedValueOnce({ ok: true, json: async () => batchResponse } as Response)
        .mockResolvedValueOnce({ ok: true, json: async () => batchResponse } as Response)

      const result = await fetchPostInsightsBatch(postIds, 'test-token')

      expect(mockFetch).toHaveBeenCalledTimes(3) // 3 batches (50+50+50)
      expect(result.size).toBe(150)
    })

    it('maps insights back to correct post IDs', async () => {
      const postIds = ['post_A', 'post_B']

      const batchResponse = [
        {
          code: 200,
          body: JSON.stringify({
            data: [{ name: 'post_impressions', values: [{ value: 999 }] }],
          }),
        },
        {
          code: 200,
          body: JSON.stringify({
            data: [{ name: 'post_impressions', values: [{ value: 111 }] }],
          }),
        },
      ]

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => batchResponse,
      } as Response)

      const result = await fetchPostInsightsBatch(postIds, 'test-token')

      expect(result.get('post_A')).toEqual({ post_impressions: 999 })
      expect(result.get('post_B')).toEqual({ post_impressions: 111 })
    })
  })

  describe('error handling', () => {
    it('handles code 200 vs non-200 responses', async () => {
      const postIds = ['post_1', 'post_2', 'post_3']

      const batchResponse = [
        {
          code: 200,
          body: JSON.stringify({
            data: [{ name: 'post_impressions', values: [{ value: 100 }] }],
          }),
        },
        { code: 400 }, // Non-200 response
        {
          code: 200,
          body: JSON.stringify({
            data: [{ name: 'post_impressions', values: [{ value: 300 }] }],
          }),
        },
      ]

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => batchResponse,
      } as Response)

      const result = await fetchPostInsightsBatch(postIds, 'test-token')

      expect(result.get('post_1')).toEqual({ post_impressions: 100 })
      expect(result.get('post_2')).toBeNull() // Failed
      expect(result.get('post_3')).toEqual({ post_impressions: 300 })
    })

    it('marks entire batch as null on batch failure', async () => {
      const postIds = ['post_1', 'post_2']

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      } as Response)

      const result = await fetchPostInsightsBatch(postIds, 'test-token')

      expect(result.get('post_1')).toBeNull()
      expect(result.get('post_2')).toBeNull()
    })

    it('continues with next batch after one fails', async () => {
      const postIds = Array.from({ length: 100 }, (_, i) => `post_${i}`)

      const successBatch = Array.from({ length: 50 }, () => ({
        code: 200,
        body: JSON.stringify({
          data: [{ name: 'post_impressions', values: [{ value: 100 }] }],
        }),
      }))

      mockFetch
        .mockResolvedValueOnce({ ok: false, status: 500 } as Response) // Batch 1 fails
        .mockResolvedValueOnce({ ok: true, json: async () => successBatch } as Response) // Batch 2 succeeds

      const result = await fetchPostInsightsBatch(postIds, 'test-token')

      expect(mockFetch).toHaveBeenCalledTimes(2)
      // First 50 posts should be null
      expect(result.get('post_0')).toBeNull()
      expect(result.get('post_49')).toBeNull()
      // Next 50 posts should have data
      expect(result.get('post_50')).toEqual({ post_impressions: 100 })
      expect(result.get('post_99')).toEqual({ post_impressions: 100 })
    })
  })
})
