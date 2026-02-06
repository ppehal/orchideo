/**
 * Shared test utilities and mocks for all test suites.
 *
 * Provides reusable mocks for auth, Prisma, encryption, and common test scenarios.
 */

import type { Session } from 'next-auth'
import { vi } from 'vitest'

// ============================================================================
// Authentication Mocks
// ============================================================================

/**
 * Create a mock NextAuth session
 */
export function mockSession(
  userId: string = 'user-1',
  email: string = 'test@example.com'
): Session {
  return {
    user: {
      id: userId,
      email,
      name: 'Test User',
      image: null,
    },
    expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  }
}

/**
 * Create a mock auth() function that returns a session
 */
export function mockAuthFunction(session: Session | null = mockSession()) {
  return vi.fn(() => Promise.resolve(session))
}

// ============================================================================
// Prisma Mocks
// ============================================================================

/**
 * Create a mock Prisma client with common methods
 */
export function mockPrismaClient() {
  return {
    analysis: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
    facebookPage: {
      upsert: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
    },
    triggerResult: {
      deleteMany: vi.fn(),
      createMany: vi.fn(),
      findMany: vi.fn(),
    },
    analysisSnapshot: {
      create: vi.fn(),
      findMany: vi.fn(),
    },
    competitorGroup: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      delete: vi.fn(),
    },
    competitor: {
      createMany: vi.fn(),
      deleteMany: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    $transaction: vi.fn((callback) => {
      // Execute callback with mock client for transaction tests
      if (typeof callback === 'function') {
        return callback(mockPrismaClient())
      }
      // Array of operations (legacy transaction API)
      return Promise.resolve(callback)
    }),
    $queryRaw: vi.fn(),
  }
}

// ============================================================================
// Encryption Mocks
// ============================================================================

/**
 * Create a valid test encryption key (32 bytes hex)
 */
export function createTestEncryptionKey(): string {
  // 32 bytes = 64 hex characters
  return '0'.repeat(64)
}

/**
 * Mock encrypt function
 */
export function mockEncrypt(plaintext: string): string {
  // Simple mock: just prefix with 'encrypted:'
  return `encrypted:${plaintext}`
}

/**
 * Mock decrypt function
 */
export function mockDecrypt(ciphertext: string): string {
  // Simple mock: remove 'encrypted:' prefix
  if (ciphertext.startsWith('encrypted:')) {
    return ciphertext.slice(10)
  }
  throw new Error('Invalid ciphertext format')
}

// ============================================================================
// Facebook API Mocks
// ============================================================================

/**
 * Create a mock Facebook page access token
 */
export function mockFacebookPageToken(pageId: string = '123456789'): string {
  return `EAAtest${pageId}token`
}

/**
 * Create a mock Facebook user access token
 */
export function mockFacebookUserToken(): string {
  return 'EAAtestUserAccessToken'
}

/**
 * Mock Facebook API response wrapper
 */
export function mockFacebookApiResponse<T>(data: T) {
  return {
    ok: true,
    status: 200,
    json: async () => data,
  } as Response
}

/**
 * Mock Facebook API error response
 */
export function mockFacebookApiError(code: number, message: string) {
  return {
    ok: false,
    status: 400,
    json: async () => ({
      error: {
        message,
        type: 'OAuthException',
        code,
      },
    }),
  } as Response
}

// ============================================================================
// Timer Utilities
// ============================================================================

/**
 * Helper to advance timers and flush promises
 */
export async function advanceTimersAndFlush(ms: number) {
  vi.advanceTimersByTime(ms)
  await vi.runAllTimersAsync()
  await Promise.resolve() // Flush microtasks
}

/**
 * Helper to wait for next tick (useful in async tests)
 */
export function nextTick() {
  return new Promise((resolve) => process.nextTick(resolve))
}

// ============================================================================
// Test Data Factories
// ============================================================================

/**
 * Create a test Analysis record
 */
export function createTestAnalysis(overrides: Record<string, unknown> = {}) {
  return {
    id: 'analysis-1',
    user_id: 'user-1',
    fb_page_id: '123456789',
    page_name: 'Test Page',
    industry_code: 'RETAIL',
    status: 'PENDING',
    started_at: new Date(),
    ended_at: null,
    public_token: 'test-public-token',
    expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    created_at: new Date(),
    updated_at: new Date(),
    ...overrides,
  }
}

/**
 * Create a test FacebookPage record
 */
export function createTestFacebookPage(overrides: Record<string, unknown> = {}) {
  return {
    id: 'fb-page-1',
    fb_page_id: '123456789',
    userId: 'user-1',
    name: 'Test Page',
    username: 'testpage',
    category: 'Local Business',
    fan_count: 1000,
    picture_url: 'https://example.com/picture.jpg',
    cover_url: 'https://example.com/cover.jpg',
    page_access_token: 'encrypted:test-token',
    token_expires_at: null,
    created_at: new Date(),
    updated_at: new Date(),
    ...overrides,
  }
}

/**
 * Create a test CompetitorGroup record
 */
export function createTestCompetitorGroup(overrides: Record<string, unknown> = {}) {
  return {
    id: 'group-1',
    user_id: 'user-1',
    name: 'Test Competitors',
    primary_page_id: '123456789',
    created_at: new Date(),
    updated_at: new Date(),
    ...overrides,
  }
}

/**
 * Create a test TriggerResult record
 */
export function createTestTriggerResult(overrides: Record<string, unknown> = {}) {
  return {
    id: 'result-1',
    analysis_id: 'analysis-1',
    trigger_id: 'T001',
    status: 'CRITICAL',
    current_value: '10',
    target_value: '50',
    details: {},
    created_at: new Date(),
    ...overrides,
  }
}

// ============================================================================
// Facebook API Data Factories (for feed, insights, collector tests)
// ============================================================================

import type {
  FacebookPost,
  FacebookFeedResponse,
  NormalizedFacebookPage,
  FacebookInsightsResponse,
  FacebookInsight,
} from '@/lib/integrations/facebook/types'
import type { FetchFeedResult } from '@/lib/integrations/facebook/feed'
import type { PageInsights } from '@/lib/integrations/facebook/insights'

/**
 * Create a Facebook post for testing
 */
export function createMockFacebookPost(
  overrides: Partial<FacebookPost> = {}
): FacebookPost {
  return {
    id: 'post_123',
    created_time: new Date().toISOString(),
    message: 'Test post message',
    reactions: { summary: { total_count: 50 } },
    comments: { summary: { total_count: 10 } },
    shares: { count: 5 },
    is_published: true,
    is_hidden: false,
    permalink_url: 'https://facebook.com/post/123',
    processedInsights: undefined,
    ...overrides,
  }
}

/**
 * Create a mock Facebook feed response
 * @param posts - Array of partials to convert to FacebookPost objects
 * @param nextUrl - Optional pagination URL
 */
export function createMockFeedResponse(
  posts: Array<Partial<FacebookPost>>,
  nextUrl?: string
): FacebookFeedResponse {
  return {
    data: posts.map((p) => createMockFacebookPost(p)),
    paging: nextUrl ? { next: nextUrl } : undefined,
  }
}

/**
 * Create a mock post insights response
 */
export function createMockPostInsightsResponse(
  insights: Record<string, number | Record<string, number>>
): { data: Array<{ name: string; values: Array<{ value: number | Record<string, number> }> }> } {
  return {
    data: Object.entries(insights).map(([name, value]) => ({
      name,
      values: [{ value }],
    })),
  }
}

/**
 * Create a mock batch API response
 */
export function createMockBatchResponse(
  results: Array<{ code: number; body?: string }>
): unknown[] {
  return results
}

/**
 * Create a mock Facebook insights response
 */
export function createMockInsightsResponse(
  insights: Array<{
    name: string
    period: string
    values: Array<{ value: number | Record<string, number>; end_time?: string }>
  }>
): FacebookInsightsResponse {
  return {
    data: insights.map((insight) => ({
      ...insight,
      id: `${insight.name}/insights`,
    })) as FacebookInsight[],
  }
}

/**
 * Create a mock NormalizedFacebookPage
 */
export function createMockPageMetadata(
  overrides: Partial<NormalizedFacebookPage> = {}
): NormalizedFacebookPage {
  return {
    fb_page_id: '123456789',
    name: 'Test Page',
    category: 'Local Business',
    fan_count: 1000,
    picture_url: 'https://example.com/picture.jpg',
    cover_url: 'https://example.com/cover.jpg',
    page_access_token: 'test-page-token',
    username: 'testpage',
    ...overrides,
  }
}

/**
 * Create a mock FetchFeedResult
 */
export function createMockFetchFeedResult(
  posts: FacebookPost[],
  overrides: Partial<FetchFeedResult> = {}
): FetchFeedResult {
  const oldestPostDate = posts.length > 0 ? new Date(posts[posts.length - 1]!.created_time) : null
  const newestPostDate = posts.length > 0 ? new Date(posts[0]!.created_time) : null

  return {
    posts,
    totalFetched: posts.length,
    pagesProcessed: 1,
    oldestPostDate,
    newestPostDate,
    reachedMaxPosts: false,
    reachedMaxPages: false,
    reachedDateLimit: false,
    ...overrides,
  }
}

/**
 * Create a mock PageInsights
 */
export function createMockPageInsights(
  overrides: Partial<PageInsights> = {}
): PageInsights {
  const now = new Date()
  const periodStart = new Date(now.getTime() - 28 * 24 * 60 * 60 * 1000)

  return {
    page_impressions: 10000,
    page_impressions_unique: 8000,
    page_impressions_organic: 7000,
    page_impressions_paid: 3000,
    page_engaged_users: 500,
    page_post_engagements: 1200,
    page_views_total: 2500,
    page_fans: 1000,
    page_fan_adds: 50,
    page_fan_removes: 10,
    page_actions_post_reactions_total: {
      like: 300,
      love: 150,
      wow: 50,
      haha: 30,
      sad: 10,
      angry: 5,
    },
    daily_impressions: [
      { date: now.toISOString(), value: 400 },
      { date: new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString(), value: 350 },
    ],
    daily_engaged_users: [
      { date: now.toISOString(), value: 20 },
      { date: new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString(), value: 18 },
    ],
    daily_fan_adds: [
      { date: now.toISOString(), value: 2 },
      { date: new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString(), value: 3 },
    ],
    daily_fan_removes: [
      { date: now.toISOString(), value: 0 },
      { date: new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString(), value: 1 },
    ],
    period_start: periodStart.toISOString(),
    period_end: now.toISOString(),
    fetched_at: now.toISOString(),
    ...overrides,
  }
}

// ============================================================================
// Environment Variable Helpers
// ============================================================================

/**
 * Setup test environment variables
 */
export function setupTestEnv() {
  vi.stubEnv('ENCRYPTION_KEY', createTestEncryptionKey())
  vi.stubEnv('NEXTAUTH_SECRET', 'test-nextauth-secret')
  vi.stubEnv('FACEBOOK_APP_SECRET', 'test-facebook-app-secret')
  vi.stubEnv('FB_API_TIMEOUT_MS', '30000')
  vi.stubEnv('ANALYSIS_TIMEOUT_MS', '300000')
  vi.stubEnv('REPORT_EXPIRATION_DAYS', '7')
}

/**
 * Cleanup test environment variables
 */
export function cleanupTestEnv() {
  vi.unstubAllEnvs()
}
