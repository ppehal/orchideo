/**
 * Facebook Insights Integration Tests
 *
 * Tests the page insights fetching logic including daily/lifetime/28-day metrics,
 * error handling for permission/rate limit/unsupported, and partial success scenarios.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { fetchPageInsights } from '@/lib/integrations/facebook/insights'
import { createMockInsightsResponse } from '../../../utils/test-helpers'

// Mock functions - declared outside to avoid hoisting issues
const mockMakeRequest = vi.fn()

vi.mock('@/lib/integrations/facebook/client', () => {
  // Must define class INSIDE factory to avoid hoisting issues
  class FacebookApiError extends Error {
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
  }

  return {
    makeRequest: (url: string, token: string, options?: unknown) =>
      mockMakeRequest(url, token, options),
    GRAPH_API_BASE_URL: 'https://graph.facebook.com/v19.0',
    FacebookApiError,
  }
})

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
  vi.resetAllMocks()
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('fetchPageInsights', () => {
  describe('happy path', () => {
    it('fetches all daily metrics successfully', async () => {
      // Daily metrics response
      mockMakeRequest.mockResolvedValueOnce(
        createMockInsightsResponse([
          {
            name: 'page_impressions',
            period: 'day',
            values: [
              { value: 100, end_time: '2025-01-15T00:00:00+0000' },
              { value: 200, end_time: '2025-01-16T00:00:00+0000' },
            ],
          },
          {
            name: 'page_impressions_unique',
            period: 'day',
            values: [
              { value: 80, end_time: '2025-01-15T00:00:00+0000' },
              { value: 160, end_time: '2025-01-16T00:00:00+0000' },
            ],
          },
          {
            name: 'page_impressions_organic',
            period: 'day',
            values: [{ value: 70, end_time: '2025-01-15T00:00:00+0000' }],
          },
          {
            name: 'page_impressions_paid',
            period: 'day',
            values: [{ value: 30, end_time: '2025-01-15T00:00:00+0000' }],
          },
          {
            name: 'page_engaged_users',
            period: 'day',
            values: [{ value: 25, end_time: '2025-01-15T00:00:00+0000' }],
          },
          {
            name: 'page_post_engagements',
            period: 'day',
            values: [{ value: 50, end_time: '2025-01-15T00:00:00+0000' }],
          },
          {
            name: 'page_fan_adds',
            period: 'day',
            values: [{ value: 5, end_time: '2025-01-15T00:00:00+0000' }],
          },
          {
            name: 'page_fan_removes',
            period: 'day',
            values: [{ value: 2, end_time: '2025-01-15T00:00:00+0000' }],
          },
          {
            name: 'page_views_total',
            period: 'day',
            values: [{ value: 300, end_time: '2025-01-15T00:00:00+0000' }],
          },
        ])
      )
      // Lifetime metrics response
      mockMakeRequest.mockResolvedValueOnce(
        createMockInsightsResponse([
          {
            name: 'page_fans',
            period: 'day',
            values: [{ value: 1500, end_time: '2025-01-16T00:00:00+0000' }],
          },
        ])
      )
      // 28-day metrics response
      mockMakeRequest.mockResolvedValueOnce(
        createMockInsightsResponse([
          {
            name: 'page_actions_post_reactions_total',
            period: 'days_28',
            values: [{ value: { like: 200, love: 50, wow: 10 } }],
          },
        ])
      )

      const result = await fetchPageInsights('123456789', 'test-token')

      expect(result.error).toBeNull()
      expect(result.data).not.toBeNull()
      // Daily sums
      expect(result.data!.page_impressions).toBe(300) // 100 + 200
      expect(result.data!.page_impressions_unique).toBe(240) // 80 + 160
      expect(result.data!.page_impressions_organic).toBe(70)
      expect(result.data!.page_impressions_paid).toBe(30)
      expect(result.data!.page_engaged_users).toBe(25)
      expect(result.data!.page_post_engagements).toBe(50)
      expect(result.data!.page_fan_adds).toBe(5)
      expect(result.data!.page_fan_removes).toBe(2)
      expect(result.data!.page_views_total).toBe(300)
      // Lifetime
      expect(result.data!.page_fans).toBe(1500)
      // 28-day reaction breakdown
      expect(result.data!.page_actions_post_reactions_total).toEqual({
        like: 200,
        love: 50,
        wow: 10,
      })
      // Daily arrays
      expect(result.data!.daily_impressions).toHaveLength(2)
      expect(result.data!.daily_engaged_users).toHaveLength(1)
      // Metadata
      expect(result.data!.period_start).toBeDefined()
      expect(result.data!.period_end).toBeDefined()
      expect(result.data!.fetched_at).toBeDefined()
    })

    it('fetches lifetime metrics (page_fans)', async () => {
      // Daily metrics - minimal response
      mockMakeRequest.mockResolvedValueOnce(createMockInsightsResponse([]))
      // Lifetime metrics - page_fans with multiple values (should take last)
      mockMakeRequest.mockResolvedValueOnce(
        createMockInsightsResponse([
          {
            name: 'page_fans',
            period: 'day',
            values: [
              { value: 1400, end_time: '2025-01-15T00:00:00+0000' },
              { value: 1500, end_time: '2025-01-16T00:00:00+0000' },
            ],
          },
        ])
      )
      // 28-day metrics
      mockMakeRequest.mockResolvedValueOnce(createMockInsightsResponse([]))

      const result = await fetchPageInsights('123456789', 'test-token')

      expect(result.error).toBeNull()
      expect(result.data!.page_fans).toBe(1500) // Takes last value
    })

    it('fetches 28-day period metrics (reactions breakdown)', async () => {
      // Daily metrics
      mockMakeRequest.mockResolvedValueOnce(createMockInsightsResponse([]))
      // Lifetime metrics
      mockMakeRequest.mockResolvedValueOnce(createMockInsightsResponse([]))
      // 28-day metrics with reaction breakdown
      mockMakeRequest.mockResolvedValueOnce(
        createMockInsightsResponse([
          {
            name: 'page_actions_post_reactions_total',
            period: 'days_28',
            values: [{ value: { like: 500, love: 120, wow: 30, haha: 25, sad: 5, angry: 2 } }],
          },
        ])
      )

      const result = await fetchPageInsights('123456789', 'test-token')

      expect(result.error).toBeNull()
      expect(result.data!.page_actions_post_reactions_total).toEqual({
        like: 500,
        love: 120,
        wow: 30,
        haha: 25,
        sad: 5,
        angry: 2,
      })
    })
  })

  describe('error handling', () => {
    // Helper to create FacebookApiError from the mocked module
    async function createFBApiError(message: string, code: number, type: string) {
      const { FacebookApiError } = await import('@/lib/integrations/facebook/client')
      return new FacebookApiError(message, code, type)
    }

    it('returns PERMISSION_DENIED error for codes 10, 200, 230', async () => {
      for (const code of [10, 200, 230]) {
        vi.resetAllMocks()

        const error = await createFBApiError('Permission denied', code, 'OAuthException')
        mockMakeRequest.mockRejectedValueOnce(error)

        const result = await fetchPageInsights('123456789', 'test-token')

        expect(result.data).toBeNull()
        expect(result.error).not.toBeNull()
        expect(result.error!.code).toBe('PERMISSION_DENIED')
        expect(result.error!.fbErrorCode).toBe(code)
      }
    })

    it('returns NOT_SUPPORTED error for code 100 (small pages)', async () => {
      const error = await createFBApiError('Unsupported operation', 100, 'OAuthException')
      mockMakeRequest.mockRejectedValueOnce(error)

      const result = await fetchPageInsights('123456789', 'test-token')

      expect(result.data).toBeNull()
      expect(result.error).not.toBeNull()
      expect(result.error!.code).toBe('NOT_SUPPORTED')
      expect(result.error!.fbErrorCode).toBe(100)
    })

    it('returns RATE_LIMITED error for code 4', async () => {
      const error = await createFBApiError('Rate limited', 4, 'OAuthException')
      mockMakeRequest.mockRejectedValueOnce(error)

      const result = await fetchPageInsights('123456789', 'test-token')

      expect(result.data).toBeNull()
      expect(result.error).not.toBeNull()
      expect(result.error!.code).toBe('RATE_LIMITED')
      expect(result.error!.fbErrorCode).toBe(4)
    })

    it('returns UNKNOWN error for non-Facebook errors', async () => {
      mockMakeRequest.mockRejectedValueOnce(new Error('Network timeout'))

      const result = await fetchPageInsights('123456789', 'test-token')

      expect(result.data).toBeNull()
      expect(result.error).not.toBeNull()
      expect(result.error!.code).toBe('UNKNOWN')
      expect(result.error!.message).toBe('Network timeout')
    })
  })

  describe('partial success', () => {
    it('succeeds with daily metrics even if lifetime fails', async () => {
      // Daily metrics - success
      mockMakeRequest.mockResolvedValueOnce(
        createMockInsightsResponse([
          {
            name: 'page_impressions',
            period: 'day',
            values: [{ value: 100, end_time: '2025-01-15T00:00:00+0000' }],
          },
        ])
      )
      // Lifetime metrics - failure (caught internally)
      mockMakeRequest.mockRejectedValueOnce(new Error('Lifetime fetch failed'))
      // 28-day metrics - success
      mockMakeRequest.mockResolvedValueOnce(createMockInsightsResponse([]))

      const result = await fetchPageInsights('123456789', 'test-token')

      expect(result.error).toBeNull()
      expect(result.data).not.toBeNull()
      expect(result.data!.page_impressions).toBe(100)
      expect(result.data!.page_fans).toBeUndefined() // Not set because lifetime failed
    })

    it('succeeds with daily metrics even if 28-day fails', async () => {
      // Daily metrics - success
      mockMakeRequest.mockResolvedValueOnce(
        createMockInsightsResponse([
          {
            name: 'page_engaged_users',
            period: 'day',
            values: [{ value: 50, end_time: '2025-01-15T00:00:00+0000' }],
          },
        ])
      )
      // Lifetime metrics - success
      mockMakeRequest.mockResolvedValueOnce(
        createMockInsightsResponse([
          {
            name: 'page_fans',
            period: 'day',
            values: [{ value: 1000, end_time: '2025-01-16T00:00:00+0000' }],
          },
        ])
      )
      // 28-day metrics - failure (caught internally)
      mockMakeRequest.mockRejectedValueOnce(new Error('28-day fetch failed'))

      const result = await fetchPageInsights('123456789', 'test-token')

      expect(result.error).toBeNull()
      expect(result.data).not.toBeNull()
      expect(result.data!.page_engaged_users).toBe(50)
      expect(result.data!.page_fans).toBe(1000)
      expect(result.data!.page_actions_post_reactions_total).toBeUndefined() // Not set
    })
  })

  describe('helper functions (indirect tests via fetchPageInsights)', () => {
    it('sums daily values correctly', async () => {
      mockMakeRequest.mockResolvedValueOnce(
        createMockInsightsResponse([
          {
            name: 'page_impressions',
            period: 'day',
            values: [
              { value: 100, end_time: '2025-01-13T00:00:00+0000' },
              { value: 200, end_time: '2025-01-14T00:00:00+0000' },
              { value: 300, end_time: '2025-01-15T00:00:00+0000' },
            ],
          },
        ])
      )
      mockMakeRequest.mockResolvedValueOnce(createMockInsightsResponse([]))
      mockMakeRequest.mockResolvedValueOnce(createMockInsightsResponse([]))

      const result = await fetchPageInsights('123456789', 'test-token')

      expect(result.data!.page_impressions).toBe(600) // 100 + 200 + 300
    })

    it('extracts daily values array correctly', async () => {
      mockMakeRequest.mockResolvedValueOnce(
        createMockInsightsResponse([
          {
            name: 'page_fan_adds',
            period: 'day',
            values: [
              { value: 5, end_time: '2025-01-13T00:00:00+0000' },
              { value: 8, end_time: '2025-01-14T00:00:00+0000' },
              { value: 3, end_time: '2025-01-15T00:00:00+0000' },
            ],
          },
        ])
      )
      mockMakeRequest.mockResolvedValueOnce(createMockInsightsResponse([]))
      mockMakeRequest.mockResolvedValueOnce(createMockInsightsResponse([]))

      const result = await fetchPageInsights('123456789', 'test-token')

      expect(result.data!.daily_fan_adds).toHaveLength(3)
      expect(result.data!.daily_fan_adds![0]).toEqual({
        date: '2025-01-13T00:00:00+0000',
        value: 5,
      })
      expect(result.data!.daily_fan_adds![2]).toEqual({
        date: '2025-01-15T00:00:00+0000',
        value: 3,
      })
    })

    it('validates reaction breakdown structure', async () => {
      mockMakeRequest.mockResolvedValueOnce(createMockInsightsResponse([]))
      mockMakeRequest.mockResolvedValueOnce(createMockInsightsResponse([]))
      // Valid reaction breakdown
      mockMakeRequest.mockResolvedValueOnce(
        createMockInsightsResponse([
          {
            name: 'page_actions_post_reactions_total',
            period: 'days_28',
            values: [{ value: { like: 100, love: 50 } }],
          },
        ])
      )

      const result = await fetchPageInsights('123456789', 'test-token')

      expect(result.data!.page_actions_post_reactions_total).toEqual({ like: 100, love: 50 })
    })

    it('returns null for invalid reaction data', async () => {
      mockMakeRequest.mockResolvedValueOnce(createMockInsightsResponse([]))
      mockMakeRequest.mockResolvedValueOnce(createMockInsightsResponse([]))
      // Invalid: value is a number, not an object
      mockMakeRequest.mockResolvedValueOnce(
        createMockInsightsResponse([
          { name: 'page_actions_post_reactions_total', period: 'days_28', values: [{ value: 42 }] },
        ])
      )

      const result = await fetchPageInsights('123456789', 'test-token')

      // Should return null because the value is not a valid reaction breakdown
      expect(result.data!.page_actions_post_reactions_total).toBeNull()
    })
  })
})
