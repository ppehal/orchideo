/**
 * Analysis Runner Flow tests.
 *
 * DATA INTEGRITY CRITICAL: Tests the complete 12-step analysis flow including:
 * - Status transitions (PENDING → COLLECTING_DATA → ANALYZING → COMPLETED)
 * - Timeout handling with Promise.race
 * - Error recovery and failure states
 * - Snapshot and alert creation
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { createTestAnalysis, createTestFacebookPage } from '../../../utils/test-helpers'
import { ANALYSIS_TIMEOUT_MS } from '@/lib/config/timeouts'
import type { TriggerEvaluation } from '@/lib/triggers'
import type { CollectedData } from '@/lib/services/analysis/types'

// Mock all dependencies before importing
const mockPrisma = {
  analysis: {
    findUnique: vi.fn(),
  },
  industryBenchmark: {
    findUnique: vi.fn(),
  },
  triggerResult: {
    deleteMany: vi.fn(),
    createMany: vi.fn(),
  },
}

const mockUpdateAnalysisStatus = vi.fn()
const mockLogAnalysisCompleted = vi.fn()
const mockLogAnalysisFailed = vi.fn()
const mockDecrypt = vi.fn()
const mockCollectAnalysisData = vi.fn()
const mockNormalizeCollectedData = vi.fn()
const mockEvaluateAll = vi.fn()
const mockCreateOrUpdateSnapshot = vi.fn()
const mockCheckAndCreateAlerts = vi.fn()

vi.mock('@/lib/prisma', () => ({
  prisma: mockPrisma,
}))

vi.mock('@/lib/services/analysis/status-manager', () => ({
  updateAnalysisStatus: mockUpdateAnalysisStatus,
  logAnalysisCompleted: mockLogAnalysisCompleted,
  logAnalysisFailed: mockLogAnalysisFailed,
}))

vi.mock('@/lib/utils/encryption', () => ({
  decrypt: mockDecrypt,
}))

vi.mock('@/lib/services/analysis/collector', () => ({
  collectAnalysisData: mockCollectAnalysisData,
}))

vi.mock('@/lib/services/analysis/normalizer', () => ({
  normalizeCollectedData: mockNormalizeCollectedData,
}))

vi.mock('@/lib/triggers', () => ({
  evaluateAll: mockEvaluateAll,
}))

vi.mock('@/lib/services/snapshots', () => ({
  createOrUpdateSnapshot: mockCreateOrUpdateSnapshot,
}))

vi.mock('@/lib/services/alerts', () => ({
  checkAndCreateAlerts: mockCheckAndCreateAlerts,
}))

// Import after mocking
const { runAnalysis } = await import('@/lib/services/analysis/runner')

describe('runAnalysis', () => {
  const TEST_ANALYSIS_ID = 'analysis-123'
  const TEST_PAGE_ID = 'page-456'
  const TEST_USER_ID = 'user-789'
  const TEST_ACCESS_TOKEN = 'decrypted-token-abc'

  beforeEach(() => {
    vi.clearAllMocks()
    vi.unstubAllEnvs()

    // Setup default mocks for successful flow
    mockDecrypt.mockReturnValue(TEST_ACCESS_TOKEN)
    mockPrisma.triggerResult.deleteMany.mockResolvedValue({ count: 0 })
    mockPrisma.triggerResult.createMany.mockResolvedValue({ count: 5 })
    mockUpdateAnalysisStatus.mockResolvedValue(undefined)
    mockLogAnalysisCompleted.mockResolvedValue(undefined)
    mockLogAnalysisFailed.mockResolvedValue(undefined)
    mockCreateOrUpdateSnapshot.mockResolvedValue(undefined)
    mockCheckAndCreateAlerts.mockResolvedValue(undefined)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('successful execution', () => {
    it('completes 12-step analysis flow', async () => {
      const analysis = createTestAnalysis({
        id: TEST_ANALYSIS_ID,
        user_id: TEST_USER_ID,
        fb_page_id: TEST_PAGE_ID,
        status: 'PENDING',
        industry_code: 'RETAIL',
      })

      const facebookPage = createTestFacebookPage({
        fb_page_id: TEST_PAGE_ID,
        user_id: TEST_USER_ID,
        name: 'Test Page',
        page_access_token: 'encrypted-token',
      })

      mockPrisma.analysis.findUnique.mockResolvedValue({
        ...analysis,
        facebookPage,
      })

      const collectedData = {
        pageData: {
          fb_page_id: TEST_PAGE_ID,
          name: 'Test Page',
          category: 'Local Business',
          fan_count: 1000,
          picture_url: 'https://example.com/pic.jpg',
          cover_url: null,
          page_access_token: TEST_ACCESS_TOKEN,
          username: 'testpage',
        },
        posts: [],
        insights: null,
        collectedAt: new Date(),
        metadata: {
          postsCollected: 50,
          oldestPostDate: new Date('2024-01-01'),
          newestPostDate: new Date(),
          insightsAvailable: false,
          daysOfData: 90,
        },
      }

      const normalizedData = {
        pageData: collectedData.pageData,
        posts90d: [],
        insights28d: null,
        collectionMetadata: {
          collectedAt: collectedData.collectedAt.toISOString(),
          postsCollected: 50,
          oldestPostDate: collectedData.metadata.oldestPostDate?.toISOString() || null,
          newestPostDate: collectedData.metadata.newestPostDate?.toISOString() || null,
          insightsAvailable: false,
          daysOfData: 90,
        },
      }

      const evaluations: TriggerEvaluation[] = [
        {
          id: 'T001',
          name: 'Engagement Rate',
          description: 'Test trigger',
          category: 'ENGAGEMENT',
          score: 75,
          status: 'GOOD',
          recommendation: 'Keep it up',
          details: { currentValue: 100, targetValue: 80 },
        },
      ]

      mockCollectAnalysisData.mockResolvedValue({
        success: true,
        data: collectedData,
        partialSuccess: false,
        errors: [],
      })

      mockNormalizeCollectedData.mockReturnValue(normalizedData)

      mockPrisma.industryBenchmark.findUnique.mockResolvedValue({
        industry_code: 'RETAIL',
        industry_name: 'Maloobchod',
        avg_engagement_rate: 0.025,
        reactions_pct: 70,
        comments_pct: 20,
        shares_pct: 10,
        ideal_engagement_pct: 60,
        ideal_sales_pct: 15,
        ideal_brand_pct: 25,
        ideal_posts_per_week: 5,
      })

      mockEvaluateAll.mockReturnValue({
        evaluations,
        overallScore: 75,
        errors: [],
      })

      const result = await runAnalysis(TEST_ANALYSIS_ID)

      // Verify the 12-step flow:
      // 1. Load analysis
      expect(mockPrisma.analysis.findUnique).toHaveBeenCalledWith({
        where: { id: TEST_ANALYSIS_ID },
        include: { facebookPage: true },
      })

      // 2. Update status to COLLECTING_DATA
      expect(mockUpdateAnalysisStatus).toHaveBeenCalledWith(
        TEST_ANALYSIS_ID,
        'COLLECTING_DATA',
        expect.objectContaining({ started_at: expect.any(Date) })
      )

      // 3. Decrypt access token
      expect(mockDecrypt).toHaveBeenCalledWith('encrypted-token')

      // 4. Collect data from Facebook
      expect(mockCollectAnalysisData).toHaveBeenCalledWith(TEST_PAGE_ID, TEST_ACCESS_TOKEN)

      // 5. Update status to ANALYZING
      expect(mockUpdateAnalysisStatus).toHaveBeenCalledWith(TEST_ANALYSIS_ID, 'ANALYZING')

      // 6. Normalize data
      expect(mockNormalizeCollectedData).toHaveBeenCalledWith(collectedData)

      // 7. Load industry benchmark
      expect(mockPrisma.industryBenchmark.findUnique).toHaveBeenCalledWith({
        where: { industry_code: 'RETAIL' },
      })

      // 8. Evaluate triggers
      expect(mockEvaluateAll).toHaveBeenCalledWith(
        expect.objectContaining({
          pageData: normalizedData.pageData,
          posts90d: normalizedData.posts90d,
          insights28d: normalizedData.insights28d,
          industryBenchmark: expect.any(Object),
        })
      )

      // 9. Save trigger results
      expect(mockPrisma.triggerResult.deleteMany).toHaveBeenCalledWith({
        where: { analysisId: TEST_ANALYSIS_ID },
      })
      expect(mockPrisma.triggerResult.createMany).toHaveBeenCalledWith({
        data: expect.arrayContaining([
          expect.objectContaining({
            analysisId: TEST_ANALYSIS_ID,
            trigger_code: 'T001',
          }),
        ]),
      })

      // 10. Update status to COMPLETED
      expect(mockUpdateAnalysisStatus).toHaveBeenCalledWith(
        TEST_ANALYSIS_ID,
        'COMPLETED',
        expect.objectContaining({
          rawData: normalizedData,
          overall_score: 75,
          completed_at: expect.any(Date),
        })
      )

      // 11. Create snapshot
      expect(mockCreateOrUpdateSnapshot).toHaveBeenCalledWith(TEST_ANALYSIS_ID)

      // 12. Check and create alerts
      expect(mockCheckAndCreateAlerts).toHaveBeenCalledWith(TEST_ANALYSIS_ID, facebookPage.id)

      expect(result).toEqual({
        success: true,
        analysisId: TEST_ANALYSIS_ID,
      })
    })

    it('updates status transitions correctly', async () => {
      const analysis = createTestAnalysis({ id: TEST_ANALYSIS_ID })
      const facebookPage = createTestFacebookPage()

      mockPrisma.analysis.findUnique.mockResolvedValue({
        ...analysis,
        facebookPage,
      })

      mockCollectAnalysisData.mockResolvedValue({
        success: true,
        data: {
          pageData: {
            fb_page_id: TEST_PAGE_ID,
            name: 'Test Page',
            category: 'Local Business',
            fan_count: 1000,
            picture_url: 'https://example.com/pic.jpg',
            cover_url: null,
            page_access_token: TEST_ACCESS_TOKEN,
            username: 'testpage',
          },
          posts: [],
          insights: null,
          collectedAt: new Date(),
          metadata: {
            postsCollected: 0,
            oldestPostDate: null,
            newestPostDate: null,
            insightsAvailable: false,
            daysOfData: 0,
          },
        },
        partialSuccess: false,
        errors: [],
      })

      mockNormalizeCollectedData.mockReturnValue({
        pageData: {
          fb_page_id: TEST_PAGE_ID,
          name: 'Test Page',
          category: 'Local Business',
          fan_count: 1000,
          picture_url: 'https://example.com/pic.jpg',
          cover_url: null,
          page_access_token: TEST_ACCESS_TOKEN,
          username: 'testpage',
        },
        posts90d: [],
        insights28d: null,
        collectionMetadata: {
          collectedAt: new Date().toISOString(),
          postsCollected: 0,
          oldestPostDate: null,
          newestPostDate: null,
          insightsAvailable: false,
          daysOfData: 0,
        },
      })

      mockPrisma.industryBenchmark.findUnique.mockResolvedValue(null)

      mockEvaluateAll.mockReturnValue({
        evaluations: [],
        overallScore: 50,
        errors: [],
      })

      await runAnalysis(TEST_ANALYSIS_ID)

      // Verify status progression: PENDING → COLLECTING_DATA → ANALYZING → COMPLETED
      const statusCalls = mockUpdateAnalysisStatus.mock.calls

      expect(statusCalls).toEqual(
        expect.arrayContaining([
          [TEST_ANALYSIS_ID, 'COLLECTING_DATA', expect.any(Object)],
          [TEST_ANALYSIS_ID, 'ANALYZING'],
          [TEST_ANALYSIS_ID, 'COMPLETED', expect.any(Object)],
        ])
      )
    })

    it('uses default benchmark when industry benchmark not found', async () => {
      const analysis = createTestAnalysis({
        id: TEST_ANALYSIS_ID,
        industry_code: 'UNKNOWN',
      })
      const facebookPage = createTestFacebookPage()

      mockPrisma.analysis.findUnique.mockResolvedValue({
        ...analysis,
        facebookPage,
      })

      mockCollectAnalysisData.mockResolvedValue({
        success: true,
        data: {
          pageData: {
            fb_page_id: TEST_PAGE_ID,
            name: 'Test Page',
            category: 'Local Business',
            fan_count: 1000,
            picture_url: 'https://example.com/pic.jpg',
            cover_url: null,
            page_access_token: TEST_ACCESS_TOKEN,
            username: 'testpage',
          },
          posts: [],
          insights: null,
          collectedAt: new Date(),
          metadata: {
            postsCollected: 0,
            oldestPostDate: null,
            newestPostDate: null,
            insightsAvailable: false,
            daysOfData: 0,
          },
        },
        partialSuccess: false,
        errors: [],
      })

      mockNormalizeCollectedData.mockReturnValue({
        pageData: {
          fb_page_id: TEST_PAGE_ID,
          name: 'Test Page',
          category: 'Local Business',
          fan_count: 1000,
          picture_url: 'https://example.com/pic.jpg',
          cover_url: null,
          page_access_token: TEST_ACCESS_TOKEN,
          username: 'testpage',
        },
        posts90d: [],
        insights28d: null,
        collectionMetadata: {
          collectedAt: new Date().toISOString(),
          postsCollected: 0,
          oldestPostDate: null,
          newestPostDate: null,
          insightsAvailable: false,
          daysOfData: 0,
        },
      })

      // No benchmark found
      mockPrisma.industryBenchmark.findUnique.mockResolvedValue(null)

      mockEvaluateAll.mockReturnValue({
        evaluations: [],
        overallScore: 50,
        errors: [],
      })

      await runAnalysis(TEST_ANALYSIS_ID)

      // Verify evaluateAll was called with default benchmark
      expect(mockEvaluateAll).toHaveBeenCalledWith(
        expect.objectContaining({
          industryBenchmark: expect.objectContaining({
            industry_code: 'DEFAULT',
            industry_name: 'Obecný benchmark',
            avg_engagement_rate: 0.02,
          }),
        })
      )
    })
  })

  describe('timeout handling', () => {
    // NOTE: Real timeout tests with Promise.race and AbortSignal.timeout don't work well
    // with fake timers. These tests verify the timeout mechanism exists, but E2E tests
    // should verify actual timeout behavior.

    it('verifies timeout mechanism is configured', () => {
      // Verify that ANALYSIS_TIMEOUT_MS is used in the code
      // (This is a structural test, not a behavioral test)
      expect(typeof ANALYSIS_TIMEOUT_MS).toBe('number')
      expect(ANALYSIS_TIMEOUT_MS).toBeGreaterThan(0)
    })

    it('handles timeout errors correctly when thrown', async () => {
      const analysis = createTestAnalysis({ id: TEST_ANALYSIS_ID })
      const facebookPage = createTestFacebookPage()

      mockPrisma.analysis.findUnique.mockResolvedValue({
        ...analysis,
        facebookPage,
      })

      // Mock collectAnalysisData to throw timeout error
      mockCollectAnalysisData.mockRejectedValue(new Error('Analysis timeout exceeded'))

      const result = await runAnalysis(TEST_ANALYSIS_ID)

      expect(result.success).toBe(false)
      expect(result.errorCode).toBe('TIMEOUT')
      expect(result.error).toContain('časový limit')

      expect(mockUpdateAnalysisStatus).toHaveBeenCalledWith(
        TEST_ANALYSIS_ID,
        'FAILED',
        expect.objectContaining({
          error_code: 'TIMEOUT',
        })
      )

      expect(mockLogAnalysisFailed).toHaveBeenCalledWith(
        TEST_ANALYSIS_ID,
        expect.objectContaining({
          error_code: 'TIMEOUT',
        })
      )
    })
  })

  describe('error recovery', () => {
    it('marks FAILED on decrypt error', async () => {
      const analysis = createTestAnalysis({ id: TEST_ANALYSIS_ID })
      const facebookPage = createTestFacebookPage({
        page_access_token: 'invalid-encrypted-token',
      })

      mockPrisma.analysis.findUnique.mockResolvedValue({
        ...analysis,
        facebookPage,
      })

      mockDecrypt.mockImplementation(() => {
        throw new Error('Decryption failed: Invalid key')
      })

      const result = await runAnalysis(TEST_ANALYSIS_ID)

      expect(result.success).toBe(false)
      expect(result.errorCode).toBe('DECRYPTION_ERROR')
      expect(result.error).toContain('dešifrovat přístupový token')

      expect(mockUpdateAnalysisStatus).toHaveBeenCalledWith(
        TEST_ANALYSIS_ID,
        'FAILED',
        expect.objectContaining({
          error_code: 'DECRYPTION_ERROR',
        })
      )
    })

    it('marks FAILED on collection error', async () => {
      const analysis = createTestAnalysis({ id: TEST_ANALYSIS_ID })
      const facebookPage = createTestFacebookPage()

      mockPrisma.analysis.findUnique.mockResolvedValue({
        ...analysis,
        facebookPage,
      })

      mockCollectAnalysisData.mockResolvedValue({
        success: false,
        data: null,
        partialSuccess: false,
        errors: [{ message: 'Facebook API rate limited', code: 'RATE_LIMIT' }],
      })

      const result = await runAnalysis(TEST_ANALYSIS_ID)

      expect(result.success).toBe(false)
      expect(result.errorCode).toBe('COLLECTION_ERROR')
      expect(result.error).toBe('Facebook API rate limited')

      expect(mockUpdateAnalysisStatus).toHaveBeenCalledWith(
        TEST_ANALYSIS_ID,
        'FAILED',
        expect.objectContaining({
          error_code: 'COLLECTION_ERROR',
        })
      )
    })

    it('marks FAILED on normalization error', async () => {
      const analysis = createTestAnalysis({ id: TEST_ANALYSIS_ID })
      const facebookPage = createTestFacebookPage()

      mockPrisma.analysis.findUnique.mockResolvedValue({
        ...analysis,
        facebookPage,
      })

      mockCollectAnalysisData.mockResolvedValue({
        success: true,
        data: {
          pageData: {
            fb_page_id: TEST_PAGE_ID,
            name: 'Test Page',
            category: 'Local Business',
            fan_count: 1000,
            picture_url: 'https://example.com/pic.jpg',
            cover_url: null,
            page_access_token: TEST_ACCESS_TOKEN,
            username: 'testpage',
          },
          posts: [],
          insights: null,
          collectedAt: new Date(),
          metadata: {
            postsCollected: 0,
            oldestPostDate: null,
            newestPostDate: null,
            insightsAvailable: false,
            daysOfData: 0,
          },
        },
        partialSuccess: false,
        errors: [],
      })

      mockNormalizeCollectedData.mockImplementation(() => {
        throw new Error('Normalization failed: Invalid data format')
      })

      const result = await runAnalysis(TEST_ANALYSIS_ID)

      expect(result.success).toBe(false)
      expect(result.errorCode).toBe('INTERNAL_ERROR')
      expect(mockUpdateAnalysisStatus).toHaveBeenCalledWith(
        TEST_ANALYSIS_ID,
        'FAILED',
        expect.any(Object)
      )
    })

    it('marks FAILED on database error', async () => {
      const analysis = createTestAnalysis({ id: TEST_ANALYSIS_ID })
      const facebookPage = createTestFacebookPage()

      mockPrisma.analysis.findUnique.mockResolvedValue({
        ...analysis,
        facebookPage,
      })

      mockCollectAnalysisData.mockResolvedValue({
        success: true,
        data: {
          pageData: {
            fb_page_id: TEST_PAGE_ID,
            name: 'Test Page',
            category: 'Local Business',
            fan_count: 1000,
            picture_url: 'https://example.com/pic.jpg',
            cover_url: null,
            page_access_token: TEST_ACCESS_TOKEN,
            username: 'testpage',
          },
          posts: [],
          insights: null,
          collectedAt: new Date(),
          metadata: {
            postsCollected: 0,
            oldestPostDate: null,
            newestPostDate: null,
            insightsAvailable: false,
            daysOfData: 0,
          },
        },
        partialSuccess: false,
        errors: [],
      })

      mockNormalizeCollectedData.mockReturnValue({
        pageData: {
          fb_page_id: TEST_PAGE_ID,
          name: 'Test Page',
          category: 'Local Business',
          fan_count: 1000,
          picture_url: 'https://example.com/pic.jpg',
          cover_url: null,
          page_access_token: TEST_ACCESS_TOKEN,
          username: 'testpage',
        },
        posts90d: [],
        insights28d: null,
        collectionMetadata: {
          collectedAt: new Date().toISOString(),
          postsCollected: 0,
          oldestPostDate: null,
          newestPostDate: null,
          insightsAvailable: false,
          daysOfData: 0,
        },
      })

      mockPrisma.industryBenchmark.findUnique.mockRejectedValue(
        new Error('Database connection lost')
      )

      const result = await runAnalysis(TEST_ANALYSIS_ID)

      expect(result.success).toBe(false)
      expect(result.errorCode).toBe('INTERNAL_ERROR')
    })
  })

  describe('edge cases', () => {
    it('handles analysis not found', async () => {
      mockPrisma.analysis.findUnique.mockResolvedValue(null)

      const result = await runAnalysis(TEST_ANALYSIS_ID)

      expect(result.success).toBe(false)
      expect(result.errorCode).toBe('NOT_FOUND')
      expect(result.error).toContain('nenalezena')
    })

    it('handles Facebook page missing', async () => {
      const analysis = createTestAnalysis({ id: TEST_ANALYSIS_ID })

      mockPrisma.analysis.findUnique.mockResolvedValue({
        ...analysis,
        facebookPage: null, // Page not found
      })

      const result = await runAnalysis(TEST_ANALYSIS_ID)

      expect(result.success).toBe(false)
      expect(result.errorCode).toBe('PAGE_NOT_FOUND')
      expect(result.error).toContain('stránka nenalezena')

      expect(mockUpdateAnalysisStatus).toHaveBeenCalledWith(
        TEST_ANALYSIS_ID,
        'FAILED',
        expect.objectContaining({
          error_code: 'PAGE_NOT_FOUND',
        })
      )
    })

    it('handles null industry_code (uses default benchmark)', async () => {
      const analysis = createTestAnalysis({
        id: TEST_ANALYSIS_ID,
        industry_code: null, // No industry specified
      })
      const facebookPage = createTestFacebookPage()

      mockPrisma.analysis.findUnique.mockResolvedValue({
        ...analysis,
        facebookPage,
      })

      mockCollectAnalysisData.mockResolvedValue({
        success: true,
        data: {
          pageData: {
            fb_page_id: TEST_PAGE_ID,
            name: 'Test Page',
            category: 'Local Business',
            fan_count: 1000,
            picture_url: 'https://example.com/pic.jpg',
            cover_url: null,
            page_access_token: TEST_ACCESS_TOKEN,
            username: 'testpage',
          },
          posts: [],
          insights: null,
          collectedAt: new Date(),
          metadata: {
            postsCollected: 0,
            oldestPostDate: null,
            newestPostDate: null,
            insightsAvailable: false,
            daysOfData: 0,
          },
        },
        partialSuccess: false,
        errors: [],
      })

      mockNormalizeCollectedData.mockReturnValue({
        pageData: {
          fb_page_id: TEST_PAGE_ID,
          name: 'Test Page',
          category: 'Local Business',
          fan_count: 1000,
          picture_url: 'https://example.com/pic.jpg',
          cover_url: null,
          page_access_token: TEST_ACCESS_TOKEN,
          username: 'testpage',
        },
        posts90d: [],
        insights28d: null,
        collectionMetadata: {
          collectedAt: new Date().toISOString(),
          postsCollected: 0,
          oldestPostDate: null,
          newestPostDate: null,
          insightsAvailable: false,
          daysOfData: 0,
        },
      })

      mockPrisma.industryBenchmark.findUnique.mockResolvedValue(null)

      mockEvaluateAll.mockReturnValue({
        evaluations: [],
        overallScore: 50,
        errors: [],
      })

      await runAnalysis(TEST_ANALYSIS_ID)

      expect(mockPrisma.industryBenchmark.findUnique).toHaveBeenCalledWith({
        where: { industry_code: 'DEFAULT' },
      })
    })

    it('handles partial success from data collection', async () => {
      const analysis = createTestAnalysis({ id: TEST_ANALYSIS_ID })
      const facebookPage = createTestFacebookPage()

      mockPrisma.analysis.findUnique.mockResolvedValue({
        ...analysis,
        facebookPage,
      })

      mockCollectAnalysisData.mockResolvedValue({
        success: true,
        data: {
          pageData: {
            fb_page_id: TEST_PAGE_ID,
            name: 'Test Page',
            category: 'Local Business',
            fan_count: 1000,
            picture_url: 'https://example.com/pic.jpg',
            cover_url: null,
            page_access_token: TEST_ACCESS_TOKEN,
            username: 'testpage',
          },
          posts: [],
          insights: null,
          collectedAt: new Date(),
          metadata: {
            postsCollected: 50,
            oldestPostDate: null,
            newestPostDate: null,
            insightsAvailable: false,
            insightsError: 'PERMISSION_DENIED',
            insightsErrorMessage: 'Missing pages_read_engagement permission',
            daysOfData: 90,
          },
        },
        partialSuccess: true, // Insights failed but posts succeeded
        errors: [],
      })

      mockNormalizeCollectedData.mockReturnValue({
        pageData: {
          fb_page_id: TEST_PAGE_ID,
          name: 'Test Page',
          category: 'Local Business',
          fan_count: 1000,
          picture_url: 'https://example.com/pic.jpg',
          cover_url: null,
          page_access_token: TEST_ACCESS_TOKEN,
          username: 'testpage',
        },
        posts90d: [],
        insights28d: null,
        collectionMetadata: {
          collectedAt: new Date().toISOString(),
          postsCollected: 0,
          oldestPostDate: null,
          newestPostDate: null,
          insightsAvailable: false,
          daysOfData: 0,
        },
      })

      mockPrisma.industryBenchmark.findUnique.mockResolvedValue(null)

      mockEvaluateAll.mockReturnValue({
        evaluations: [],
        overallScore: 50,
        errors: [],
      })

      const result = await runAnalysis(TEST_ANALYSIS_ID)

      expect(result.success).toBe(true)
      expect(mockLogAnalysisCompleted).toHaveBeenCalledWith(
        TEST_ANALYSIS_ID,
        expect.objectContaining({
          partial_success: true,
        })
      )
    })
  })
})
