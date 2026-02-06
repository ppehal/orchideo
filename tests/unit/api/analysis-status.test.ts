/**
 * API Route Tests: GET /api/analysis/[id]/status
 *
 * Tests authentication, ownership verification, status response format,
 * error messages for failed analyses, and 404 handling.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

// Mock functions
const mockAuth = vi.fn()
const mockPrismaFindFirst = vi.fn()

vi.mock('@/lib/auth', () => ({
  auth: () => mockAuth(),
}))

vi.mock('@/lib/prisma', () => ({
  prisma: {
    analysis: {
      findFirst: (...args: unknown[]) => mockPrismaFindFirst(...args),
    },
  },
}))

vi.mock('@/lib/logging', () => ({
  createLogger: () => ({
    info: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }),
  logError: vi.fn(),
}))

// Import real constants (not mocked - they're pure data)
vi.mock('@/lib/constants', () => {
  return {
    ANALYSIS_STATUS_PROGRESS: {
      PENDING: 5,
      COLLECTING_DATA: 40,
      ANALYZING: 75,
      COMPLETED: 100,
      FAILED: 100,
    },
    getAnalysisErrorMessage: (errorCode: string | null) => {
      if (!errorCode) return { title: 'Neznámá chyba', description: 'Neočekávaná chyba' }
      const messages: Record<string, { title: string; description: string }> = {
        COLLECTION_ERROR: { title: 'Nedostatek dat', description: 'Nedostatek příspěvků.' },
        NO_POSTS: { title: 'Žádné příspěvky', description: 'Žádné příspěvky nalezeny.' },
        FACEBOOK_API_ERROR: { title: 'Chyba Facebook API', description: 'Chyba komunikace.' },
      }
      return messages[errorCode] ?? { title: 'Neznámá chyba', description: 'Neočekávaná chyba' }
    },
  }
})

import { GET } from '@/app/api/analysis/[id]/status/route'

/** Helper to create route params as Promise (Next.js 16 pattern) */
function createParams(id: string): { params: Promise<{ id: string }> } {
  return { params: Promise.resolve({ id }) }
}

/** Dummy request object (not used by this route) */
const dummyRequest = new Request('http://localhost/api/analysis/test-id/status')

beforeEach(() => {
  vi.resetAllMocks()
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('GET /api/analysis/[id]/status', () => {
  describe('authentication', () => {
    it('returns 401 when not authenticated', async () => {
      mockAuth.mockResolvedValueOnce(null)

      const response = await GET(dummyRequest, createParams('analysis-1'))
      const body = await response.json()

      expect(response.status).toBe(401)
      expect(body.error).toBe('Nepřihlášen')
    })

    it('returns 401 when session has no user id', async () => {
      mockAuth.mockResolvedValueOnce({ user: {} })

      const response = await GET(dummyRequest, createParams('analysis-1'))
      const body = await response.json()

      expect(response.status).toBe(401)
      expect(body.error).toBe('Nepřihlášen')
    })
  })

  describe('ownership verification', () => {
    it('returns 404 when analysis not found', async () => {
      mockAuth.mockResolvedValueOnce({ user: { id: 'user-1' } })
      mockPrismaFindFirst.mockResolvedValueOnce(null)

      const response = await GET(dummyRequest, createParams('nonexistent-id'))
      const body = await response.json()

      expect(response.status).toBe(404)
      expect(body.code).toBe('NOT_FOUND')
    })

    it('queries with both analysis id and userId', async () => {
      mockAuth.mockResolvedValueOnce({ user: { id: 'user-42' } })
      mockPrismaFindFirst.mockResolvedValueOnce({
        status: 'COMPLETED',
        error_code: null,
        error_message: null,
        public_token: 'pub-token',
      })

      await GET(dummyRequest, createParams('analysis-99'))

      expect(mockPrismaFindFirst).toHaveBeenCalledWith({
        where: {
          id: 'analysis-99',
          userId: 'user-42',
        },
        select: {
          status: true,
          error_code: true,
          error_message: true,
          public_token: true,
        },
      })
    })
  })

  describe('happy path', () => {
    it('returns COMPLETED status with progress 100', async () => {
      mockAuth.mockResolvedValueOnce({ user: { id: 'user-1' } })
      mockPrismaFindFirst.mockResolvedValueOnce({
        status: 'COMPLETED',
        error_code: null,
        error_message: null,
        public_token: 'pub-token-abc',
      })

      const response = await GET(dummyRequest, createParams('analysis-1'))
      const body = await response.json()

      expect(response.status).toBe(200)
      expect(body.success).toBe(true)
      expect(body.data.status).toBe('COMPLETED')
      expect(body.data.progress).toBe(100)
      expect(body.data.publicToken).toBe('pub-token-abc')
      expect(body.data.errorCode).toBeNull()
      expect(body.data.errorTitle).toBeNull()
      expect(body.data.errorMessage).toBeNull()
    })

    it('returns PENDING status with progress 5', async () => {
      mockAuth.mockResolvedValueOnce({ user: { id: 'user-1' } })
      mockPrismaFindFirst.mockResolvedValueOnce({
        status: 'PENDING',
        error_code: null,
        error_message: null,
        public_token: null,
      })

      const response = await GET(dummyRequest, createParams('analysis-1'))
      const body = await response.json()

      expect(response.status).toBe(200)
      expect(body.data.status).toBe('PENDING')
      expect(body.data.progress).toBe(5)
      expect(body.data.publicToken).toBeNull()
    })

    it('returns COLLECTING_DATA status with progress 40', async () => {
      mockAuth.mockResolvedValueOnce({ user: { id: 'user-1' } })
      mockPrismaFindFirst.mockResolvedValueOnce({
        status: 'COLLECTING_DATA',
        error_code: null,
        error_message: null,
        public_token: null,
      })

      const response = await GET(dummyRequest, createParams('analysis-1'))
      const body = await response.json()

      expect(response.status).toBe(200)
      expect(body.data.status).toBe('COLLECTING_DATA')
      expect(body.data.progress).toBe(40)
    })

    it('returns ANALYZING status with progress 75', async () => {
      mockAuth.mockResolvedValueOnce({ user: { id: 'user-1' } })
      mockPrismaFindFirst.mockResolvedValueOnce({
        status: 'ANALYZING',
        error_code: null,
        error_message: null,
        public_token: null,
      })

      const response = await GET(dummyRequest, createParams('analysis-1'))
      const body = await response.json()

      expect(response.status).toBe(200)
      expect(body.data.status).toBe('ANALYZING')
      expect(body.data.progress).toBe(75)
    })
  })

  describe('failed analysis error messages', () => {
    it('returns error info for FAILED status', async () => {
      mockAuth.mockResolvedValueOnce({ user: { id: 'user-1' } })
      mockPrismaFindFirst.mockResolvedValueOnce({
        status: 'FAILED',
        error_code: 'COLLECTION_ERROR',
        error_message: 'Not enough posts',
        public_token: null,
      })

      const response = await GET(dummyRequest, createParams('analysis-1'))
      const body = await response.json()

      expect(response.status).toBe(200)
      expect(body.data.status).toBe('FAILED')
      expect(body.data.progress).toBe(100)
      expect(body.data.errorCode).toBe('COLLECTION_ERROR')
      expect(body.data.errorTitle).toBe('Nedostatek dat')
      expect(body.data.errorMessage).toBe('Nedostatek příspěvků.')
    })

    it('returns fallback error for unknown error code', async () => {
      mockAuth.mockResolvedValueOnce({ user: { id: 'user-1' } })
      mockPrismaFindFirst.mockResolvedValueOnce({
        status: 'FAILED',
        error_code: 'SOME_UNKNOWN_CODE',
        error_message: 'Something broke',
        public_token: null,
      })

      const response = await GET(dummyRequest, createParams('analysis-1'))
      const body = await response.json()

      expect(response.status).toBe(200)
      expect(body.data.errorCode).toBe('SOME_UNKNOWN_CODE')
      expect(body.data.errorTitle).toBe('Neznámá chyba')
    })

    it('does not include error info for non-FAILED statuses', async () => {
      mockAuth.mockResolvedValueOnce({ user: { id: 'user-1' } })
      mockPrismaFindFirst.mockResolvedValueOnce({
        status: 'COLLECTING_DATA',
        error_code: null,
        error_message: null,
        public_token: null,
      })

      const response = await GET(dummyRequest, createParams('analysis-1'))
      const body = await response.json()

      expect(body.data.errorTitle).toBeNull()
      expect(body.data.errorMessage).toBeNull()
    })
  })

  describe('error handling', () => {
    it('returns 500 on database error', async () => {
      mockAuth.mockResolvedValueOnce({ user: { id: 'user-1' } })
      mockPrismaFindFirst.mockRejectedValueOnce(new Error('Connection lost'))

      const response = await GET(dummyRequest, createParams('analysis-1'))
      const body = await response.json()

      expect(response.status).toBe(500)
      expect(body.success).toBe(false)
    })
  })
})
