/**
 * API Route Tests: GET /api/facebook/pages
 *
 * Tests authentication, rate limiting, Facebook API error handling,
 * and security (no access_token leakage).
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

// Mock functions
const mockAuth = vi.fn()
const mockGetFacebookAccessToken = vi.fn()
const mockGetManagedPagesWithTokens = vi.fn()
const mockGetRateLimiter = vi.fn()

// Rate limiter mock object (reused across tests)
const mockLimiter = {
  canProceed: vi.fn().mockReturnValue(true),
  acquire: vi.fn().mockResolvedValue(undefined),
  getStats: vi.fn().mockReturnValue({ current: 0, max: 20, windowMs: 60000 }),
}

vi.mock('@/lib/auth', () => ({
  auth: () => mockAuth(),
  getFacebookAccessToken: (userId: string) => mockGetFacebookAccessToken(userId),
}))

vi.mock('@/lib/integrations/facebook', () => {
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
  }

  return {
    getManagedPagesWithTokens: (token: string) => mockGetManagedPagesWithTokens(token),
    FacebookApiError,
  }
})

vi.mock('@/lib/utils/rate-limiter', () => ({
  getRateLimiter: (name: string, options?: unknown) => mockGetRateLimiter(name, options),
}))

vi.mock('@/lib/logging', () => ({
  createLogger: () => ({
    info: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }),
  logError: vi.fn(),
  LogFields: { userId: 'user_id' },
}))

// Import the route handler AFTER mocks are set up
import { GET } from '@/app/api/facebook/pages/route'

beforeEach(() => {
  vi.resetAllMocks()
  mockGetRateLimiter.mockReturnValue(mockLimiter)
  mockLimiter.canProceed.mockReturnValue(true)
  mockLimiter.acquire.mockResolvedValue(undefined)
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('GET /api/facebook/pages', () => {
  describe('authentication', () => {
    it('returns 401 when not authenticated', async () => {
      mockAuth.mockResolvedValueOnce(null)

      const response = await GET()
      const body = await response.json()

      expect(response.status).toBe(401)
      expect(body.error).toBe('Nepřihlášen')
    })

    it('returns 401 when session has no user id', async () => {
      mockAuth.mockResolvedValueOnce({ user: {} })

      const response = await GET()
      const body = await response.json()

      expect(response.status).toBe(401)
      expect(body.error).toBe('Nepřihlášen')
    })

    it('proceeds when authenticated', async () => {
      mockAuth.mockResolvedValueOnce({ user: { id: 'user-1' } })
      mockGetFacebookAccessToken.mockResolvedValueOnce('fb-token')
      mockGetManagedPagesWithTokens.mockResolvedValueOnce([])

      const response = await GET()

      expect(response.status).toBe(200)
    })
  })

  describe('rate limiting', () => {
    it('returns 429 when rate limit exceeded', async () => {
      mockAuth.mockResolvedValueOnce({ user: { id: 'user-1' } })
      mockLimiter.canProceed.mockReturnValue(false)
      mockLimiter.getStats.mockReturnValue({ current: 20, max: 20, windowMs: 60000 })

      const response = await GET()
      const body = await response.json()

      expect(response.status).toBe(429)
      expect(body.code).toBe('RATE_LIMITED')
      expect(response.headers.get('Retry-After')).toBe('60')
      expect(response.headers.get('X-RateLimit-Remaining')).toBe('0')
    })
  })

  describe('happy path', () => {
    it('returns Facebook pages list', async () => {
      mockAuth.mockResolvedValueOnce({ user: { id: 'user-1' } })
      mockGetFacebookAccessToken.mockResolvedValueOnce('fb-token')
      mockGetManagedPagesWithTokens.mockResolvedValueOnce([
        {
          id: 'page-1',
          name: 'My Page',
          category: 'Business',
          picture_url: 'https://example.com/pic.jpg',
          tasks: ['MANAGE', 'CREATE_CONTENT'],
          username: 'mypage',
          access_token: 'secret-page-token',
        },
        {
          id: 'page-2',
          name: 'Other Page',
          category: 'Entertainment',
          picture_url: null,
          tasks: ['MANAGE'],
          username: null,
          access_token: 'another-secret-token',
        },
      ])

      const response = await GET()
      const body = await response.json()

      expect(response.status).toBe(200)
      expect(body.pages).toHaveLength(2)
      expect(body.pages[0]).toEqual({
        id: 'page-1',
        name: 'My Page',
        category: 'Business',
        picture_url: 'https://example.com/pic.jpg',
        tasks: ['MANAGE', 'CREATE_CONTENT'],
        username: 'mypage',
      })
    })
  })

  describe('error handling', () => {
    it('returns 400 FACEBOOK_NOT_CONNECTED when no token', async () => {
      mockAuth.mockResolvedValueOnce({ user: { id: 'user-1' } })
      mockGetFacebookAccessToken.mockResolvedValueOnce(null)

      const response = await GET()
      const body = await response.json()

      expect(response.status).toBe(400)
      expect(body.code).toBe('FACEBOOK_NOT_CONNECTED')
    })

    it('returns 401 TOKEN_EXPIRED on expired token', async () => {
      mockAuth.mockResolvedValueOnce({ user: { id: 'user-1' } })
      mockGetFacebookAccessToken.mockResolvedValueOnce('fb-token')

      const { FacebookApiError } = await import('@/lib/integrations/facebook')
      mockGetManagedPagesWithTokens.mockRejectedValueOnce(
        new FacebookApiError('Token expired', 190, 'OAuthException')
      )

      const response = await GET()
      const body = await response.json()

      expect(response.status).toBe(401)
      expect(body.code).toBe('TOKEN_EXPIRED')
    })

    it('returns 403 PERMISSION_DENIED on permission error', async () => {
      mockAuth.mockResolvedValueOnce({ user: { id: 'user-1' } })
      mockGetFacebookAccessToken.mockResolvedValueOnce('fb-token')

      const { FacebookApiError } = await import('@/lib/integrations/facebook')
      mockGetManagedPagesWithTokens.mockRejectedValueOnce(
        new FacebookApiError('Permission denied', 200, 'OAuthException')
      )

      const response = await GET()
      const body = await response.json()

      expect(response.status).toBe(403)
      expect(body.code).toBe('PERMISSION_DENIED')
    })

    it('returns 502 for generic Facebook API errors', async () => {
      mockAuth.mockResolvedValueOnce({ user: { id: 'user-1' } })
      mockGetFacebookAccessToken.mockResolvedValueOnce('fb-token')

      const { FacebookApiError } = await import('@/lib/integrations/facebook')
      mockGetManagedPagesWithTokens.mockRejectedValueOnce(
        new FacebookApiError('Server error', 2, 'OAuthException')
      )

      const response = await GET()
      const body = await response.json()

      expect(response.status).toBe(502)
      expect(body.code).toBe('FACEBOOK_API_ERROR')
    })

    it('returns 500 for non-Facebook errors', async () => {
      mockAuth.mockResolvedValueOnce({ user: { id: 'user-1' } })
      mockGetFacebookAccessToken.mockResolvedValueOnce('fb-token')
      mockGetManagedPagesWithTokens.mockRejectedValueOnce(new Error('DB connection failed'))

      const response = await GET()
      const body = await response.json()

      expect(response.status).toBe(500)
      expect(body.code).toBe('INTERNAL_ERROR')
    })
  })

  describe('security', () => {
    it('does not expose access_token in response', async () => {
      mockAuth.mockResolvedValueOnce({ user: { id: 'user-1' } })
      mockGetFacebookAccessToken.mockResolvedValueOnce('fb-token')
      mockGetManagedPagesWithTokens.mockResolvedValueOnce([
        {
          id: 'page-1',
          name: 'My Page',
          category: 'Business',
          picture_url: null,
          tasks: ['MANAGE'],
          username: null,
          access_token: 'super-secret-page-token',
        },
      ])

      const response = await GET()
      const body = await response.json()

      expect(response.status).toBe(200)
      // Verify access_token is NOT present
      const rawJson = JSON.stringify(body)
      expect(rawJson).not.toContain('super-secret-page-token')
      expect(rawJson).not.toContain('access_token')
      // Verify expected fields ARE present
      expect(body.pages[0]).toHaveProperty('id')
      expect(body.pages[0]).toHaveProperty('name')
      expect(body.pages[0]).not.toHaveProperty('access_token')
    })
  })
})
