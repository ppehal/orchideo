/**
 * Analysis Server Action tests - Auth + Security + Facebook API.
 *
 * SECURITY CRITICAL: Tests authentication, token handling, and Facebook API
 * error handling. Ensures proper encryption and authorization checks.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { createAnalysis } from '@/lib/actions/analysis'
import { mockSession } from '../../utils/test-helpers'

// Mock functions - declared outside to avoid hoisting issues
const mockAuth = vi.fn()
const mockGetFacebookAccessToken = vi.fn()
const mockGetManagedPagesWithTokens = vi.fn()
const mockGetPageMetadata = vi.fn()
const mockEncrypt = vi.fn()
const mockGenerateSecureToken = vi.fn()
const mockStartAnalysisInBackground = vi.fn()

const mockPrismaFacebookPageUpsert = vi.fn()
const mockPrismaAnalysisCreate = vi.fn()
const mockPrismaAnalyticsEventCreate = vi.fn()

vi.mock('@/lib/auth', () => ({
  auth: () => mockAuth(),
  getFacebookAccessToken: (userId: string) => mockGetFacebookAccessToken(userId),
}))

vi.mock('@/lib/integrations/facebook', () => {
  // FacebookApiError class for instanceof checks
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

    isTokenExpired(): boolean {
      return this.code === 190
    }

    isPermissionDenied(): boolean {
      return this.code === 10 || this.code === 200 || this.code === 230
    }

    isRateLimited(): boolean {
      return this.code === 4 || this.code === 17 || this.code === 32 || this.code === 613
    }

    isRetryable(): boolean {
      return this.isRateLimited() || this.code === 1 || this.code === 2
    }
  }

  return {
    getManagedPagesWithTokens: (token: string) => mockGetManagedPagesWithTokens(token),
    getPageMetadata: (pageId: string, token: string) => mockGetPageMetadata(pageId, token),
    FacebookApiError,
  }
})

vi.mock('@/lib/prisma', () => ({
  prisma: {
    facebookPage: {
      upsert: (...args: unknown[]) => mockPrismaFacebookPageUpsert(...args),
    },
    analysis: {
      create: (...args: unknown[]) => mockPrismaAnalysisCreate(...args),
    },
    analyticsEvent: {
      create: (...args: unknown[]) => mockPrismaAnalyticsEventCreate(...args),
    },
  },
}))

vi.mock('@/lib/utils/encryption', () => ({
  encrypt: (plaintext: string) => mockEncrypt(plaintext),
}))

vi.mock('@/lib/utils/tokens', () => ({
  generateSecureToken: () => mockGenerateSecureToken(),
}))

vi.mock('@/lib/services/analysis/runner', () => ({
  startAnalysisInBackground: (id: string) => mockStartAnalysisInBackground(id),
}))

vi.mock('@/lib/config/env', () => ({
  env: {
    NODE_ENV: 'test',
    LOG_LEVEL: 'silent',
    REPORT_EXPIRATION_DAYS: 7,
    ENCRYPTION_KEY: '0'.repeat(64),
    FACEBOOK_APP_SECRET: 'test-secret',
    FB_API_TIMEOUT_MS: 30000,
  },
  isProduction: false,
  isDevelopment: false,
  isTest: true,
}))

describe('createAnalysis', () => {
  const TEST_USER_ID = 'user-1'
  const TEST_PAGE_ID = '123456789'
  const TEST_INDUSTRY_CODE = 'RETAIL'
  const TEST_USER_ACCESS_TOKEN = 'EAAtest-user-token'
  const TEST_PAGE_ACCESS_TOKEN = 'EAAtest-page-token'
  const TEST_ENCRYPTED_TOKEN = 'encrypted:test-page-token'
  const TEST_PUBLIC_TOKEN = 'public-token-123'

  beforeEach(() => {
    vi.clearAllMocks()

    // Default mock returns
    mockGenerateSecureToken.mockReturnValue(TEST_PUBLIC_TOKEN)
    mockEncrypt.mockReturnValue(TEST_ENCRYPTED_TOKEN)
    mockStartAnalysisInBackground.mockImplementation(() => {
      // Fire-and-forget, no return value
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('authentication (withAuth wrapper)', () => {
    it('returns UNAUTHORIZED when not authenticated', async () => {
      mockAuth.mockResolvedValue(null)

      const result = await createAnalysis(TEST_PAGE_ID, TEST_INDUSTRY_CODE)

      expect(result).toEqual({
        success: false,
        error: 'Nepřihlášen',
        code: 'UNAUTHORIZED',
      })
      expect(mockGetFacebookAccessToken).not.toHaveBeenCalled()
    })

    it('proceeds when authenticated', async () => {
      const session = mockSession(TEST_USER_ID)
      mockAuth.mockResolvedValue(session)
      mockGetFacebookAccessToken.mockResolvedValue(TEST_USER_ACCESS_TOKEN)
      mockGetManagedPagesWithTokens.mockResolvedValue([
        { id: TEST_PAGE_ID, name: 'Test Page', access_token: TEST_PAGE_ACCESS_TOKEN },
      ])
      mockGetPageMetadata.mockResolvedValue({
        fb_page_id: TEST_PAGE_ID,
        name: 'Test Page',
        category: 'Local Business',
        fan_count: 1000,
        picture_url: 'https://example.com/picture.jpg',
        cover_url: 'https://example.com/cover.jpg',
      })
      mockPrismaFacebookPageUpsert.mockResolvedValue({
        id: 'fb-page-1',
        fb_page_id: TEST_PAGE_ID,
        userId: TEST_USER_ID,
        name: 'Test Page',
        page_access_token: TEST_ENCRYPTED_TOKEN,
      })
      mockPrismaAnalysisCreate.mockResolvedValue({
        id: 'analysis-1',
        public_token: TEST_PUBLIC_TOKEN,
        userId: TEST_USER_ID,
      })
      mockPrismaAnalyticsEventCreate.mockResolvedValue({
        id: 'event-1',
      })

      const result = await createAnalysis(TEST_PAGE_ID, TEST_INDUSTRY_CODE)

      expect(result.success).toBe(true)
      expect(mockGetFacebookAccessToken).toHaveBeenCalledWith(TEST_USER_ID)
    })
  })

  describe('Facebook integration', () => {
    beforeEach(() => {
      const session = mockSession(TEST_USER_ID)
      mockAuth.mockResolvedValue(session)
    })

    it('returns FACEBOOK_NOT_CONNECTED when no token', async () => {
      mockGetFacebookAccessToken.mockResolvedValue(null)

      const result = await createAnalysis(TEST_PAGE_ID, TEST_INDUSTRY_CODE)

      expect(result).toEqual({
        success: false,
        error: 'Facebook účet není propojen',
        code: 'FACEBOOK_NOT_CONNECTED',
      })
    })

    it('returns PAGE_NOT_FOUND when page not in managed pages', async () => {
      mockGetFacebookAccessToken.mockResolvedValue(TEST_USER_ACCESS_TOKEN)
      mockGetManagedPagesWithTokens.mockResolvedValue([
        { id: 'different-page-id', name: 'Different Page', access_token: 'token' },
      ])

      const result = await createAnalysis(TEST_PAGE_ID, TEST_INDUSTRY_CODE)

      expect(result).toEqual({
        success: false,
        error: 'Nemáte přístup k této stránce',
        code: 'PAGE_NOT_FOUND',
      })
    })

    it('returns TOKEN_EXPIRED on expired token', async () => {
      mockGetFacebookAccessToken.mockResolvedValue(TEST_USER_ACCESS_TOKEN)
      mockGetManagedPagesWithTokens.mockResolvedValue([
        { id: TEST_PAGE_ID, name: 'Test Page', access_token: TEST_PAGE_ACCESS_TOKEN },
      ])

      // Import FacebookApiError from mock
      const { FacebookApiError } = await import('@/lib/integrations/facebook')
      mockGetPageMetadata.mockRejectedValue(
        new FacebookApiError('Token expired', 190, 'OAuthException')
      )

      const result = await createAnalysis(TEST_PAGE_ID, TEST_INDUSTRY_CODE)

      expect(result).toEqual({
        success: false,
        error: 'Facebook token vypršel, prosím přihlaste se znovu',
        code: 'TOKEN_EXPIRED',
      })
    })

    it('returns PERMISSION_DENIED on permission error', async () => {
      mockGetFacebookAccessToken.mockResolvedValue(TEST_USER_ACCESS_TOKEN)
      mockGetManagedPagesWithTokens.mockResolvedValue([
        { id: TEST_PAGE_ID, name: 'Test Page', access_token: TEST_PAGE_ACCESS_TOKEN },
      ])

      const { FacebookApiError } = await import('@/lib/integrations/facebook')
      mockGetPageMetadata.mockRejectedValue(
        new FacebookApiError('Permission denied', 200, 'OAuthException')
      )

      const result = await createAnalysis(TEST_PAGE_ID, TEST_INDUSTRY_CODE)

      expect(result).toEqual({
        success: false,
        error: 'Nemáte oprávnění pro přístup k této stránce',
        code: 'PERMISSION_DENIED',
      })
    })

    it('returns FACEBOOK_API_ERROR on other Facebook errors', async () => {
      mockGetFacebookAccessToken.mockResolvedValue(TEST_USER_ACCESS_TOKEN)
      mockGetManagedPagesWithTokens.mockResolvedValue([
        { id: TEST_PAGE_ID, name: 'Test Page', access_token: TEST_PAGE_ACCESS_TOKEN },
      ])

      const { FacebookApiError } = await import('@/lib/integrations/facebook')
      mockGetPageMetadata.mockRejectedValue(
        new FacebookApiError('Rate limited', 4, 'OAuthException')
      )

      const result = await createAnalysis(TEST_PAGE_ID, TEST_INDUSTRY_CODE)

      expect(result).toEqual({
        success: false,
        error: 'Chyba při komunikaci s Facebook API',
        code: 'FACEBOOK_API_ERROR',
      })
    })
  })

  describe('database operations', () => {
    beforeEach(() => {
      const session = mockSession(TEST_USER_ID)
      mockAuth.mockResolvedValue(session)
      mockGetFacebookAccessToken.mockResolvedValue(TEST_USER_ACCESS_TOKEN)
      mockGetManagedPagesWithTokens.mockResolvedValue([
        { id: TEST_PAGE_ID, name: 'Test Page', access_token: TEST_PAGE_ACCESS_TOKEN },
      ])
      mockGetPageMetadata.mockResolvedValue({
        fb_page_id: TEST_PAGE_ID,
        name: 'Test Page',
        category: 'Local Business',
        fan_count: 1000,
        picture_url: 'https://example.com/picture.jpg',
        cover_url: 'https://example.com/cover.jpg',
      })
      mockPrismaAnalyticsEventCreate.mockResolvedValue({ id: 'event-1' })
    })

    it('upserts FacebookPage with metadata', async () => {
      mockPrismaFacebookPageUpsert.mockResolvedValue({
        id: 'fb-page-1',
        fb_page_id: TEST_PAGE_ID,
        userId: TEST_USER_ID,
        name: 'Test Page',
        page_access_token: TEST_ENCRYPTED_TOKEN,
      })
      mockPrismaAnalysisCreate.mockResolvedValue({
        id: 'analysis-1',
        public_token: TEST_PUBLIC_TOKEN,
      })

      await createAnalysis(TEST_PAGE_ID, TEST_INDUSTRY_CODE)

      expect(mockPrismaFacebookPageUpsert).toHaveBeenCalledWith({
        where: { fb_page_id: TEST_PAGE_ID },
        update: {
          name: 'Test Page',
          category: 'Local Business',
          fan_count: 1000,
          picture_url: 'https://example.com/picture.jpg',
          cover_url: 'https://example.com/cover.jpg',
          page_access_token: TEST_ENCRYPTED_TOKEN,
        },
        create: {
          fb_page_id: TEST_PAGE_ID,
          name: 'Test Page',
          category: 'Local Business',
          fan_count: 1000,
          picture_url: 'https://example.com/picture.jpg',
          cover_url: 'https://example.com/cover.jpg',
          page_access_token: TEST_ENCRYPTED_TOKEN,
          userId: TEST_USER_ID,
        },
      })
    })

    it('encrypts page access token before storage', async () => {
      mockPrismaFacebookPageUpsert.mockResolvedValue({
        id: 'fb-page-1',
        fb_page_id: TEST_PAGE_ID,
        page_access_token: TEST_ENCRYPTED_TOKEN,
      })
      mockPrismaAnalysisCreate.mockResolvedValue({
        id: 'analysis-1',
        public_token: TEST_PUBLIC_TOKEN,
      })

      await createAnalysis(TEST_PAGE_ID, TEST_INDUSTRY_CODE)

      expect(mockEncrypt).toHaveBeenCalledWith(TEST_PAGE_ACCESS_TOKEN)
      expect(mockPrismaFacebookPageUpsert).toHaveBeenCalledWith(
        expect.objectContaining({
          update: expect.objectContaining({
            page_access_token: TEST_ENCRYPTED_TOKEN,
          }),
          create: expect.objectContaining({
            page_access_token: TEST_ENCRYPTED_TOKEN,
          }),
        })
      )
    })

    it('DOES NOT overwrite userId on page update', async () => {
      mockPrismaFacebookPageUpsert.mockResolvedValue({
        id: 'fb-page-1',
        fb_page_id: TEST_PAGE_ID,
        userId: 'original-user-id', // Different user
        page_access_token: TEST_ENCRYPTED_TOKEN,
      })
      mockPrismaAnalysisCreate.mockResolvedValue({
        id: 'analysis-1',
        public_token: TEST_PUBLIC_TOKEN,
      })

      await createAnalysis(TEST_PAGE_ID, TEST_INDUSTRY_CODE)

      // Verify update does not include userId
      expect(mockPrismaFacebookPageUpsert).toHaveBeenCalledWith(
        expect.objectContaining({
          update: expect.not.objectContaining({
            userId: expect.anything(),
          }),
        })
      )

      // But create should include userId
      expect(mockPrismaFacebookPageUpsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({
            userId: TEST_USER_ID,
          }),
        })
      )
    })

    it('creates Analysis record with public_token', async () => {
      mockPrismaFacebookPageUpsert.mockResolvedValue({
        id: 'fb-page-1',
        fb_page_id: TEST_PAGE_ID,
      })
      mockPrismaAnalysisCreate.mockResolvedValue({
        id: 'analysis-1',
        public_token: TEST_PUBLIC_TOKEN,
      })

      await createAnalysis(TEST_PAGE_ID, TEST_INDUSTRY_CODE)

      expect(mockGenerateSecureToken).toHaveBeenCalled()
      expect(mockPrismaAnalysisCreate).toHaveBeenCalledWith({
        data: expect.objectContaining({
          public_token: TEST_PUBLIC_TOKEN,
          status: 'PENDING',
          page_name: 'Test Page',
          page_picture: 'https://example.com/picture.jpg',
          page_fan_count: 1000,
          fb_page_category: 'Local Business',
          industry_code: TEST_INDUSTRY_CODE,
          userId: TEST_USER_ID,
          fb_page_id: 'fb-page-1',
        }),
      })
    })

    it('sets correct expiration date (REPORT_EXPIRATION_DAYS)', async () => {
      mockPrismaFacebookPageUpsert.mockResolvedValue({
        id: 'fb-page-1',
        fb_page_id: TEST_PAGE_ID,
      })
      mockPrismaAnalysisCreate.mockResolvedValue({
        id: 'analysis-1',
        public_token: TEST_PUBLIC_TOKEN,
      })

      await createAnalysis(TEST_PAGE_ID, TEST_INDUSTRY_CODE)

      expect(mockPrismaAnalysisCreate).toHaveBeenCalledTimes(1)
      const callArgs = mockPrismaAnalysisCreate.mock.calls[0]
      const expiresAt = callArgs?.[0]?.data?.expires_at as Date

      expect(expiresAt).toBeInstanceOf(Date)

      // Verify expiration is in the future
      const now = new Date()
      expect(expiresAt.getTime()).toBeGreaterThan(now.getTime())

      // Verify expiration is approximately 7 days from now (within 1 day tolerance)
      const sevenDaysFromNow = new Date()
      sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7)
      const diff = Math.abs(expiresAt.getTime() - sevenDaysFromNow.getTime())
      expect(diff).toBeLessThan(24 * 60 * 60 * 1000) // Less than 1 day difference
    })

    it('starts analysis in background', async () => {
      mockPrismaFacebookPageUpsert.mockResolvedValue({
        id: 'fb-page-1',
        fb_page_id: TEST_PAGE_ID,
      })
      mockPrismaAnalysisCreate.mockResolvedValue({
        id: 'analysis-1',
        public_token: TEST_PUBLIC_TOKEN,
      })

      await createAnalysis(TEST_PAGE_ID, TEST_INDUSTRY_CODE)

      expect(mockStartAnalysisInBackground).toHaveBeenCalledWith('analysis-1')
    })

    it('creates analytics event', async () => {
      mockPrismaFacebookPageUpsert.mockResolvedValue({
        id: 'fb-page-1',
        fb_page_id: TEST_PAGE_ID,
      })
      mockPrismaAnalysisCreate.mockResolvedValue({
        id: 'analysis-1',
        public_token: TEST_PUBLIC_TOKEN,
      })

      await createAnalysis(TEST_PAGE_ID, TEST_INDUSTRY_CODE)

      expect(mockPrismaAnalyticsEventCreate).toHaveBeenCalledWith({
        data: {
          event_type: 'analysis_started',
          analysisId: 'analysis-1',
          metadata: {
            fb_page_id: TEST_PAGE_ID,
            page_name: 'Test Page',
            fan_count: 1000,
            industry_code: TEST_INDUSTRY_CODE,
          },
        },
      })
    })
  })

  describe('success response', () => {
    it('returns { analysisId, publicToken }', async () => {
      const session = mockSession(TEST_USER_ID)
      mockAuth.mockResolvedValue(session)
      mockGetFacebookAccessToken.mockResolvedValue(TEST_USER_ACCESS_TOKEN)
      mockGetManagedPagesWithTokens.mockResolvedValue([
        { id: TEST_PAGE_ID, name: 'Test Page', access_token: TEST_PAGE_ACCESS_TOKEN },
      ])
      mockGetPageMetadata.mockResolvedValue({
        fb_page_id: TEST_PAGE_ID,
        name: 'Test Page',
        category: 'Local Business',
        fan_count: 1000,
        picture_url: 'https://example.com/picture.jpg',
        cover_url: 'https://example.com/cover.jpg',
      })
      mockPrismaFacebookPageUpsert.mockResolvedValue({
        id: 'fb-page-1',
        fb_page_id: TEST_PAGE_ID,
      })
      mockPrismaAnalysisCreate.mockResolvedValue({
        id: 'analysis-1',
        public_token: TEST_PUBLIC_TOKEN,
      })
      mockPrismaAnalyticsEventCreate.mockResolvedValue({ id: 'event-1' })

      const result = await createAnalysis(TEST_PAGE_ID, TEST_INDUSTRY_CODE)

      expect(result).toEqual({
        success: true,
        data: {
          analysisId: 'analysis-1',
          publicToken: TEST_PUBLIC_TOKEN,
        },
      })
    })
  })

  describe('error handling', () => {
    it('returns INTERNAL_ERROR on unexpected errors', async () => {
      const session = mockSession(TEST_USER_ID)
      mockAuth.mockResolvedValue(session)
      mockGetFacebookAccessToken.mockRejectedValue(new Error('Database connection failed'))

      const result = await createAnalysis(TEST_PAGE_ID, TEST_INDUSTRY_CODE)

      expect(result).toEqual({
        success: false,
        error: 'Nepodařilo se vytvořit analýzu',
        code: 'INTERNAL_ERROR',
      })
    })

    it('uses default industry code when not provided', async () => {
      const session = mockSession(TEST_USER_ID)
      mockAuth.mockResolvedValue(session)
      mockGetFacebookAccessToken.mockResolvedValue(TEST_USER_ACCESS_TOKEN)
      mockGetManagedPagesWithTokens.mockResolvedValue([
        { id: TEST_PAGE_ID, name: 'Test Page', access_token: TEST_PAGE_ACCESS_TOKEN },
      ])
      mockGetPageMetadata.mockResolvedValue({
        fb_page_id: TEST_PAGE_ID,
        name: 'Test Page',
        category: 'Local Business',
        fan_count: 1000,
        picture_url: 'https://example.com/picture.jpg',
        cover_url: 'https://example.com/cover.jpg',
      })
      mockPrismaFacebookPageUpsert.mockResolvedValue({
        id: 'fb-page-1',
        fb_page_id: TEST_PAGE_ID,
      })
      mockPrismaAnalysisCreate.mockResolvedValue({
        id: 'analysis-1',
        public_token: TEST_PUBLIC_TOKEN,
      })
      mockPrismaAnalyticsEventCreate.mockResolvedValue({ id: 'event-1' })

      await createAnalysis(TEST_PAGE_ID) // No industry code

      expect(mockPrismaAnalysisCreate).toHaveBeenCalledWith({
        data: expect.objectContaining({
          industry_code: 'DEFAULT',
        }),
      })
    })
  })
})
