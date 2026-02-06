/**
 * Facebook API makeRequest tests - Retry & Timeout Logic.
 *
 * DATA INTEGRITY CRITICAL: Tests retry logic with exponential backoff,
 * timeout handling, and proper error propagation. This prevents cascading
 * failures and ensures reliable Facebook API communication.
 *
 * NOTE: All error-expecting tests attach the rejection handler BEFORE
 * advancing fake timers. This prevents Node.js from flagging the promise
 * rejection as "unhandled" during timer advancement.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { makeRequest, FacebookApiError } from '@/lib/integrations/facebook/client'
import { mockFacebookApiResponse, mockFacebookApiError } from '../../../utils/test-helpers'

describe('makeRequest', () => {
  const TEST_URL = 'https://graph.facebook.com/v19.0/me'
  const TEST_TOKEN = 'EAAtestToken'

  // Helper to get mock call args in a type-safe way
  function getMockCallArgs(mock: ReturnType<typeof vi.fn>, callIndex: number) {
    expect(mock.mock.calls.length).toBeGreaterThan(callIndex)
    return mock.mock.calls[callIndex] as unknown[]
  }

  beforeEach(() => {
    vi.stubEnv('FACEBOOK_APP_SECRET', 'test-secret')
    vi.stubEnv('FB_API_TIMEOUT_MS', '30000')
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  describe('successful requests', () => {
    it('includes appsecret_proof in query params', async () => {
      const responseData = { id: '123', name: 'Test User' }
      const fetchMock = vi.fn(() => Promise.resolve(mockFacebookApiResponse(responseData)))
      global.fetch = fetchMock

      const promise = makeRequest(TEST_URL, TEST_TOKEN)
      await vi.runAllTimersAsync()
      const result = await promise

      expect(result).toEqual(responseData)
      expect(fetchMock).toHaveBeenCalledTimes(1)

      // Verify appsecret_proof is in the URL
      expect(fetchMock).toHaveBeenCalledTimes(1)
      const args = getMockCallArgs(fetchMock, 0)
      const calledUrl = String(args[0])
      expect(calledUrl).toContain('appsecret_proof=')
      expect(calledUrl).toMatch(/appsecret_proof=[a-f0-9]{64}/)
    })

    it('parses JSON response', async () => {
      const responseData = {
        data: [
          { id: '1', name: 'Page 1' },
          { id: '2', name: 'Page 2' },
        ],
        paging: { next: 'https://...' },
      }

      global.fetch = vi.fn(() => Promise.resolve(mockFacebookApiResponse(responseData)))

      const promise = makeRequest(TEST_URL, TEST_TOKEN)
      await vi.runAllTimersAsync()
      const result = await promise

      expect(result).toEqual(responseData)
    })

    it('includes Authorization header', async () => {
      const responseData = { success: true }
      const fetchMock = vi.fn(() => Promise.resolve(mockFacebookApiResponse(responseData)))
      global.fetch = fetchMock

      const promise = makeRequest(TEST_URL, TEST_TOKEN)
      await vi.runAllTimersAsync()
      await promise

      expect(fetchMock).toHaveBeenCalledTimes(1)
      const args = getMockCallArgs(fetchMock, 0)
      const callOptions = args[1] as RequestInit
      expect(callOptions).toBeDefined()
      expect(callOptions.headers).toEqual(
        expect.objectContaining({
          Authorization: `Bearer ${TEST_TOKEN}`,
          Accept: 'application/json',
        })
      )
    })
  })

  describe('timeout handling', () => {
    it('uses default timeout (FB_API_TIMEOUT_MS)', async () => {
      vi.stubEnv('FB_API_TIMEOUT_MS', '15000')

      const fetchMock = vi.fn(() => Promise.resolve(mockFacebookApiResponse({ data: 'ok' })))
      global.fetch = fetchMock

      const promise = makeRequest(TEST_URL, TEST_TOKEN)
      await vi.runAllTimersAsync()
      await promise

      expect(fetchMock).toHaveBeenCalledTimes(1)
      const args = getMockCallArgs(fetchMock, 0)
      const callOptions = args[1] as RequestInit
      // Timeout is set via AbortSignal.timeout() - we can't easily inspect it,
      // but we verify the signal is present
      expect(callOptions).toBeDefined()
      expect(callOptions.signal).toBeDefined()
    })

    it('uses custom timeout from options', async () => {
      const fetchMock = vi.fn(() => Promise.resolve(mockFacebookApiResponse({ data: 'ok' })))
      global.fetch = fetchMock

      const promise = makeRequest(TEST_URL, TEST_TOKEN, { timeoutMs: 5000 })
      await vi.runAllTimersAsync()
      await promise

      expect(fetchMock).toHaveBeenCalledTimes(1)
      const args = getMockCallArgs(fetchMock, 0)
      const callOptions = args[1] as RequestInit
      expect(callOptions).toBeDefined()
      expect(callOptions.signal).toBeDefined()
    })

    // NOTE: Detailed timeout tests with AbortSignal.timeout() don't work well with fake timers
    // The signal is configured correctly above, and actual timeout behavior is tested in E2E tests
  })

  describe('retry logic with exponential backoff', () => {
    it('retries on rate limit error (code 4)', async () => {
      let attempts = 0
      global.fetch = vi.fn(() => {
        attempts++
        if (attempts < 3) {
          return Promise.resolve(mockFacebookApiError(4, 'Rate limited'))
        }
        return Promise.resolve(mockFacebookApiResponse({ data: 'success' }))
      })

      const promise = makeRequest(TEST_URL, TEST_TOKEN, { maxRetries: 3 })

      // Advance through retries
      await vi.runAllTimersAsync()
      const result = await promise

      expect(result).toEqual({ data: 'success' })
      expect(attempts).toBe(3) // Initial + 2 retries
    })

    it('uses exponential backoff (1s, 2s, 4s)', async () => {
      let attempts = 0
      const delays: number[] = []
      let lastTime = Date.now()

      global.fetch = vi.fn(() => {
        attempts++
        const now = Date.now()
        if (attempts > 1) {
          delays.push(now - lastTime)
        }
        lastTime = now

        if (attempts < 4) {
          return Promise.resolve(mockFacebookApiError(4, 'Rate limited'))
        }
        return Promise.resolve(mockFacebookApiResponse({ data: 'success' }))
      })

      const promise = makeRequest(TEST_URL, TEST_TOKEN, {
        maxRetries: 3,
        retryDelayMs: 1000,
      })

      await vi.runAllTimersAsync()
      await promise

      expect(attempts).toBe(4)
      expect(delays).toHaveLength(3)

      // Check exponential backoff: 1000ms, 2000ms, 4000ms
      expect(delays[0]).toBeGreaterThanOrEqual(1000)
      expect(delays[1]).toBeGreaterThanOrEqual(2000)
      expect(delays[2]).toBeGreaterThanOrEqual(4000)
    })

    it('respects maxRetries option (default 3)', async () => {
      let attempts = 0
      global.fetch = vi.fn(() => {
        attempts++
        return Promise.resolve(mockFacebookApiError(4, 'Rate limited'))
      })

      const promise = makeRequest(TEST_URL, TEST_TOKEN) // Uses default maxRetries=3
      // Attach rejection handler BEFORE advancing timers to prevent unhandled rejection
      const assertion = expect(promise).rejects.toBeInstanceOf(FacebookApiError)
      await vi.runAllTimersAsync()
      await assertion

      expect(attempts).toBe(4) // Initial + 3 retries
    })

    it('respects custom maxRetries', async () => {
      let attempts = 0
      global.fetch = vi.fn(() => {
        attempts++
        return Promise.resolve(mockFacebookApiError(4, 'Rate limited'))
      })

      const promise = makeRequest(TEST_URL, TEST_TOKEN, { maxRetries: 1 })
      const assertion = expect(promise).rejects.toBeInstanceOf(FacebookApiError)
      await vi.runAllTimersAsync()
      await assertion

      expect(attempts).toBe(2) // Initial + 1 retry
    })

    it('does NOT retry on token expired (code 190)', async () => {
      let attempts = 0
      global.fetch = vi.fn(() => {
        attempts++
        return Promise.resolve(mockFacebookApiError(190, 'Token expired'))
      })

      const promise = makeRequest(TEST_URL, TEST_TOKEN, { maxRetries: 3 })
      const assertion = expect(promise).rejects.toThrow('Token expired')
      await vi.runAllTimersAsync()
      await assertion

      expect(attempts).toBe(1) // No retries for token expired
    })

    it('does NOT retry on permission denied (code 200)', async () => {
      let attempts = 0
      global.fetch = vi.fn(() => {
        attempts++
        return Promise.resolve(mockFacebookApiError(200, 'Permission denied'))
      })

      const promise = makeRequest(TEST_URL, TEST_TOKEN, { maxRetries: 3 })
      const assertion = expect(promise).rejects.toBeInstanceOf(FacebookApiError)
      await vi.runAllTimersAsync()
      await assertion

      expect(attempts).toBe(1) // No retries for permission denied
    })

    it('succeeds after 2nd retry', async () => {
      let attempts = 0
      global.fetch = vi.fn(() => {
        attempts++
        if (attempts <= 2) {
          return Promise.resolve(mockFacebookApiError(17, 'User rate limited'))
        }
        return Promise.resolve(mockFacebookApiResponse({ data: 'success' }))
      })

      const promise = makeRequest(TEST_URL, TEST_TOKEN, { maxRetries: 3 })

      await vi.runAllTimersAsync()
      const result = await promise

      expect(result).toEqual({ data: 'success' })
      expect(attempts).toBe(3)
    })

    it('retries on temporary server errors (codes 1, 2)', async () => {
      let attempts = 0
      global.fetch = vi.fn(() => {
        attempts++
        if (attempts === 1) {
          return Promise.resolve(mockFacebookApiError(1, 'Temporary error'))
        }
        if (attempts === 2) {
          return Promise.resolve(mockFacebookApiError(2, 'Temporary error'))
        }
        return Promise.resolve(mockFacebookApiResponse({ data: 'success' }))
      })

      const promise = makeRequest(TEST_URL, TEST_TOKEN, { maxRetries: 3 })

      await vi.runAllTimersAsync()
      const result = await promise

      expect(result).toEqual({ data: 'success' })
      expect(attempts).toBe(3)
    })
  })

  describe('error handling', () => {
    it('throws FacebookApiError on FB error response', async () => {
      global.fetch = vi.fn(() => Promise.resolve(mockFacebookApiError(190, 'Invalid token')))

      const promise = makeRequest(TEST_URL, TEST_TOKEN, { maxRetries: 0 })
      const assertion = expect(promise).rejects.toSatisfy((error: unknown) => {
        expect(error).toBeInstanceOf(FacebookApiError)
        expect((error as FacebookApiError).code).toBe(190)
        expect((error as FacebookApiError).message).toBe('Invalid token')
        return true
      })
      await vi.runAllTimersAsync()
      await assertion
    })

    it('preserves error details (code, type, subcode, fbtrace_id)', async () => {
      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: false,
          status: 400,
          json: async () => ({
            error: {
              message: 'Detailed error',
              type: 'OAuthException',
              code: 190,
              error_subcode: 463,
              fbtrace_id: 'ABC123XYZ',
            },
          }),
        } as Response)
      )

      const promise = makeRequest(TEST_URL, TEST_TOKEN, { maxRetries: 0 })
      const assertion = expect(promise).rejects.toSatisfy((error: unknown) => {
        expect(error).toBeInstanceOf(FacebookApiError)
        const fbError = error as FacebookApiError
        expect(fbError.code).toBe(190)
        expect(fbError.type).toBe('OAuthException')
        expect(fbError.subcode).toBe(463)
        expect(fbError.fbtrace_id).toBe('ABC123XYZ')
        return true
      })
      await vi.runAllTimersAsync()
      await assertion
    })

    it('throws on network error after exhausting retries', async () => {
      let attempts = 0
      global.fetch = vi.fn(() => {
        attempts++
        return Promise.reject(new TypeError('Network error'))
      })

      const promise = makeRequest(TEST_URL, TEST_TOKEN, {
        maxRetries: 2,
        retryDelayMs: 100,
      })
      const assertion = expect(promise).rejects.toThrow('Network error')
      await vi.runAllTimersAsync()
      await assertion

      expect(attempts).toBe(3) // Initial + 2 retries
    })

    it('retries on network errors', async () => {
      let attempts = 0
      global.fetch = vi.fn(() => {
        attempts++
        if (attempts < 3) {
          return Promise.reject(new TypeError('Network error'))
        }
        return Promise.resolve(mockFacebookApiResponse({ data: 'recovered' }))
      })

      const promise = makeRequest(TEST_URL, TEST_TOKEN, {
        maxRetries: 3,
        retryDelayMs: 100,
      })

      await vi.runAllTimersAsync()
      const result = await promise

      expect(result).toEqual({ data: 'recovered' })
      expect(attempts).toBe(3)
    })

    it('throws on non-200 response without Facebook error format', async () => {
      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: false,
          status: 500,
          statusText: 'Internal Server Error',
          json: async () => ({ unexpected: 'format' }),
        } as Response)
      )

      const promise = makeRequest(TEST_URL, TEST_TOKEN, { maxRetries: 0 })
      const assertion = expect(promise).rejects.toThrow(
        'Facebook API error: 500 Internal Server Error'
      )
      await vi.runAllTimersAsync()
      await assertion
    })
  })

  describe('edge cases', () => {
    it('handles empty response body', async () => {
      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({}),
        } as Response)
      )

      const promise = makeRequest(TEST_URL, TEST_TOKEN)

      await vi.runAllTimersAsync()
      const result = await promise

      expect(result).toEqual({})
    })

    it('handles null response', async () => {
      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          status: 200,
          json: async () => null,
        } as Response)
      )

      const promise = makeRequest(TEST_URL, TEST_TOKEN)

      await vi.runAllTimersAsync()
      const result = await promise

      expect(result).toBeNull()
    })

    it('handles maxRetries = 0 (no retries)', async () => {
      let attempts = 0
      global.fetch = vi.fn(() => {
        attempts++
        return Promise.resolve(mockFacebookApiError(4, 'Rate limited'))
      })

      const promise = makeRequest(TEST_URL, TEST_TOKEN, { maxRetries: 0 })
      const assertion = expect(promise).rejects.toBeInstanceOf(FacebookApiError)
      await vi.runAllTimersAsync()
      await assertion

      expect(attempts).toBe(1) // No retries
    })

    it('handles URL with existing query params', async () => {
      const urlWithParams = 'https://graph.facebook.com/v19.0/me?fields=id,name'
      const fetchMock = vi.fn(() => Promise.resolve(mockFacebookApiResponse({ data: 'ok' })))
      global.fetch = fetchMock

      const promise = makeRequest(urlWithParams, TEST_TOKEN)

      await vi.runAllTimersAsync()
      await promise

      expect(fetchMock).toHaveBeenCalledTimes(1)
      const args = getMockCallArgs(fetchMock, 0)
      const calledUrl = String(args[0])
      expect(calledUrl).toBeDefined()

      // URL should contain both original params and appsecret_proof
      const url = new URL(calledUrl)
      expect(url.searchParams.get('fields')).toBe('id,name')
      expect(url.searchParams.get('appsecret_proof')).toMatch(/^[a-f0-9]{64}$/)
    })
  })

  describe('schema validation (optional)', () => {
    it('returns data even if schema validation fails', async () => {
      const responseData = { unexpected: 'field' }
      global.fetch = vi.fn(() => Promise.resolve(mockFacebookApiResponse(responseData)))

      // Mock schema that will fail
      const mockSchema = {
        safeParse: vi.fn(() => ({
          success: false,
          error: { issues: [] },
        })),
      }

      const promise = makeRequest(TEST_URL, TEST_TOKEN, {
        schema: mockSchema as never,
      })

      await vi.runAllTimersAsync()
      const result = await promise

      // Should return data despite validation failure
      expect(result).toEqual(responseData)
      expect(mockSchema.safeParse).toHaveBeenCalledWith(responseData)
    })
  })
})
