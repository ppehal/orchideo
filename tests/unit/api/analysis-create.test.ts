/**
 * API Route Tests: POST /api/analysis/create
 *
 * Tests input validation (Zod), rate limiting, authentication,
 * server action delegation, and error code mapping.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

// Mock functions
const mockAuth = vi.fn()
const mockCreateAnalysis = vi.fn()
const mockGetRateLimiter = vi.fn()

const mockLimiter = {
  canProceed: vi.fn().mockReturnValue(true),
  acquire: vi.fn().mockResolvedValue(undefined),
  getStats: vi.fn().mockReturnValue({ current: 0, max: 10, windowMs: 3600000 }),
}

vi.mock('@/lib/auth', () => ({
  auth: () => mockAuth(),
}))

vi.mock('@/lib/actions/analysis', () => ({
  createAnalysis: (pageId: string, industryCode?: string) =>
    mockCreateAnalysis(pageId, industryCode),
}))

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
  withRequestContext: () => ({
    info: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }),
}))

import { POST } from '@/app/api/analysis/create/route'

/** Helper to create a Request object with JSON body */
function createRequest(body: unknown): Request {
  return new Request('http://localhost/api/analysis/create', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

beforeEach(() => {
  vi.resetAllMocks()
  mockGetRateLimiter.mockReturnValue(mockLimiter)
  mockLimiter.canProceed.mockReturnValue(true)
  mockLimiter.acquire.mockResolvedValue(undefined)
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('POST /api/analysis/create', () => {
  describe('input validation', () => {
    it('returns 400 when pageId is missing', async () => {
      mockAuth.mockResolvedValueOnce({ user: { id: 'user-1' } })

      const response = await POST(createRequest({}))
      const body = await response.json()

      expect(response.status).toBe(400)
      expect(body.code).toBe('VALIDATION_ERROR')
    })

    it('returns 400 when pageId is empty string', async () => {
      mockAuth.mockResolvedValueOnce({ user: { id: 'user-1' } })

      const response = await POST(createRequest({ pageId: '' }))
      const body = await response.json()

      expect(response.status).toBe(400)
      expect(body.code).toBe('VALIDATION_ERROR')
    })

    it('accepts request with only pageId (industryCode defaults to DEFAULT)', async () => {
      mockAuth.mockResolvedValueOnce({ user: { id: 'user-1' } })
      mockCreateAnalysis.mockResolvedValueOnce({
        success: true,
        data: { analysisId: 'analysis-1', publicToken: 'token-abc' },
      })

      const response = await POST(createRequest({ pageId: 'page-123' }))

      expect(response.status).toBe(200)
      expect(mockCreateAnalysis).toHaveBeenCalledWith('page-123', 'DEFAULT')
    })

    it('passes custom industryCode to createAnalysis', async () => {
      mockAuth.mockResolvedValueOnce({ user: { id: 'user-1' } })
      mockCreateAnalysis.mockResolvedValueOnce({
        success: true,
        data: { analysisId: 'analysis-1', publicToken: 'token-abc' },
      })

      const response = await POST(createRequest({ pageId: 'page-123', industryCode: 'RETAIL' }))

      expect(response.status).toBe(200)
      expect(mockCreateAnalysis).toHaveBeenCalledWith('page-123', 'RETAIL')
    })
  })

  describe('rate limiting', () => {
    it('returns 429 when rate limit exceeded', async () => {
      mockAuth.mockResolvedValueOnce({ user: { id: 'user-1' } })
      mockLimiter.canProceed.mockReturnValue(false)
      mockLimiter.getStats.mockReturnValue({ current: 10, max: 10, windowMs: 3600000 })

      const response = await POST(createRequest({ pageId: 'page-123' }))
      const body = await response.json()

      expect(response.status).toBe(429)
      expect(body.code).toBe('RATE_LIMITED')
      expect(response.headers.get('Retry-After')).toBe('3600')
    })

    it('proceeds without rate limiting for unauthenticated users', async () => {
      mockAuth.mockResolvedValueOnce(null)
      mockCreateAnalysis.mockResolvedValueOnce({
        success: false,
        error: 'Nepřihlášen',
        code: 'UNAUTHORIZED',
      })

      await POST(createRequest({ pageId: 'page-123' }))

      // Should not check rate limiter at all
      expect(mockGetRateLimiter).not.toHaveBeenCalled()
      // But still processes the request (createAnalysis handles auth internally)
      expect(mockCreateAnalysis).toHaveBeenCalled()
    })
  })

  describe('happy path', () => {
    it('creates analysis successfully', async () => {
      mockAuth.mockResolvedValueOnce({ user: { id: 'user-1' } })
      mockCreateAnalysis.mockResolvedValueOnce({
        success: true,
        data: { analysisId: 'analysis-42', publicToken: 'pub-token-xyz' },
      })

      const response = await POST(createRequest({ pageId: 'page-123' }))
      const body = await response.json()

      expect(response.status).toBe(200)
      expect(body.analysisId).toBe('analysis-42')
      expect(body.publicToken).toBe('pub-token-xyz')
    })
  })

  describe('error handling', () => {
    it('returns 401 for UNAUTHORIZED error code', async () => {
      mockAuth.mockResolvedValueOnce({ user: { id: 'user-1' } })
      mockCreateAnalysis.mockResolvedValueOnce({
        success: false,
        error: 'Nepřihlášen',
        code: 'UNAUTHORIZED',
      })

      const response = await POST(createRequest({ pageId: 'page-123' }))
      const body = await response.json()

      expect(response.status).toBe(401)
      expect(body.code).toBe('UNAUTHORIZED')
    })

    it('returns 403 for PERMISSION_DENIED error code', async () => {
      mockAuth.mockResolvedValueOnce({ user: { id: 'user-1' } })
      mockCreateAnalysis.mockResolvedValueOnce({
        success: false,
        error: 'Nemáte oprávnění',
        code: 'PERMISSION_DENIED',
      })

      const response = await POST(createRequest({ pageId: 'page-123' }))
      const body = await response.json()

      expect(response.status).toBe(403)
      expect(body.code).toBe('PERMISSION_DENIED')
    })

    it('returns 400 for PAGE_NOT_FOUND error code', async () => {
      mockAuth.mockResolvedValueOnce({ user: { id: 'user-1' } })
      mockCreateAnalysis.mockResolvedValueOnce({
        success: false,
        error: 'Stránka nenalezena',
        code: 'PAGE_NOT_FOUND',
      })

      const response = await POST(createRequest({ pageId: 'page-123' }))
      const body = await response.json()

      expect(response.status).toBe(400)
      expect(body.code).toBe('PAGE_NOT_FOUND')
    })

    it('returns 400 for FACEBOOK_NOT_CONNECTED error code', async () => {
      mockAuth.mockResolvedValueOnce({ user: { id: 'user-1' } })
      mockCreateAnalysis.mockResolvedValueOnce({
        success: false,
        error: 'Facebook není propojený',
        code: 'FACEBOOK_NOT_CONNECTED',
      })

      const response = await POST(createRequest({ pageId: 'page-123' }))
      const body = await response.json()

      expect(response.status).toBe(400)
      expect(body.code).toBe('FACEBOOK_NOT_CONNECTED')
    })

    it('returns 500 for unknown error codes', async () => {
      mockAuth.mockResolvedValueOnce({ user: { id: 'user-1' } })
      mockCreateAnalysis.mockResolvedValueOnce({
        success: false,
        error: 'Something went wrong',
        code: 'SOME_OTHER_ERROR',
      })

      const response = await POST(createRequest({ pageId: 'page-123' }))
      const body = await response.json()

      expect(response.status).toBe(500)
      expect(body.code).toBe('SOME_OTHER_ERROR')
    })

    it('returns 500 on unexpected exception', async () => {
      mockAuth.mockResolvedValueOnce({ user: { id: 'user-1' } })
      mockCreateAnalysis.mockRejectedValueOnce(new Error('DB crashed'))

      const response = await POST(createRequest({ pageId: 'page-123' }))
      const body = await response.json()

      expect(response.status).toBe(500)
      expect(body.code).toBe('INTERNAL_ERROR')
    })
  })
})
