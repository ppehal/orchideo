/**
 * Facebook API mocks for testing.
 *
 * Provides factory functions to create mock Facebook API responses
 * for use in unit and integration tests.
 */

import type {
  FacebookPage,
  FacebookPost,
  NormalizedFacebookPage,
  PageListItem,
  FacebookInsight,
} from '@/lib/integrations/facebook/types'
import type { NormalizedPost } from '@/lib/services/analysis/types'

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Create a mock Facebook page
 */
export function createMockPage(overrides?: Partial<FacebookPage>): FacebookPage {
  return {
    id: '123456789',
    name: 'Test Page',
    access_token: 'mock-access-token',
    category: 'Local Business',
    fan_count: 1000,
    picture: {
      data: {
        height: 100,
        width: 100,
        url: 'https://example.com/picture.jpg',
        is_silhouette: false,
      },
    },
    cover: {
      cover_id: 'cover-123',
      source: 'https://example.com/cover.jpg',
      offset_x: 0,
      offset_y: 0,
    },
    about: 'Test page description',
    website: 'https://example.com',
    link: 'https://facebook.com/testpage',
    username: 'testpage',
    ...overrides,
  }
}

/**
 * Create a normalized Facebook page
 */
export function createMockNormalizedPage(
  overrides?: Partial<NormalizedFacebookPage>
): NormalizedFacebookPage {
  return {
    fb_page_id: '123456789',
    name: 'Test Page',
    category: 'Local Business',
    fan_count: 1000,
    picture_url: 'https://example.com/picture.jpg',
    cover_url: 'https://example.com/cover.jpg',
    page_access_token: 'mock-access-token',
    username: 'testpage',
    ...overrides,
  }
}

/**
 * Create a page list item
 */
export function createMockPageListItem(overrides?: Partial<PageListItem>): PageListItem {
  return {
    id: '123456789',
    name: 'Test Page',
    category: 'Local Business',
    picture_url: 'https://example.com/picture.jpg',
    tasks: ['ANALYZE', 'ADVERTISE', 'MODERATE', 'CREATE_CONTENT'],
    ...overrides,
  }
}

/**
 * Create a mock Facebook post
 */
export function createMockPost(overrides?: Partial<FacebookPost>): FacebookPost {
  const now = new Date()
  return {
    id: `post-${Math.random().toString(36).slice(2)}`,
    created_time: now.toISOString(),
    message: 'Test post message',
    type: 'status',
    status_type: 'mobile_status_update',
    permalink_url: 'https://facebook.com/123/posts/456',
    is_published: true,
    is_hidden: false,
    reactions: {
      summary: {
        total_count: 50,
      },
    },
    comments: {
      summary: {
        total_count: 10,
        can_comment: true,
      },
    },
    shares: {
      count: 5,
    },
    ...overrides,
  }
}

/**
 * Create a mock normalized post matching the actual NormalizedPost interface
 */
export function createMockNormalizedPost(overrides?: Partial<NormalizedPost>): NormalizedPost {
  const now = new Date()
  const reactions = 50
  const comments = 10
  const shares = 5

  return {
    id: `post-${Math.random().toString(36).slice(2)}`,
    created_time: now,
    message: 'Test post message with some content',
    type: 'status',
    permalink_url: 'https://facebook.com/123/posts/456',

    // Engagement metrics
    reactions_count: reactions,
    comments_count: comments,
    shares_count: shares,
    total_engagement: reactions + comments + shares,

    // Text analysis flags
    message_length: 35,
    emoji_count: 0,
    has_double_line_breaks: false,
    has_emoji_bullets: false,
    has_inline_links: false,
    has_utm_params: false,

    // Content type flags
    is_youtube_link: false,
    is_shared_post: false,
    is_reel: false,

    // Media metadata
    has_media: false,
    media_type: 'none',
    image_width: null,
    image_height: null,
    image_format: null,

    // Post insights
    impressions: 1000,
    impressions_organic: 900,
    impressions_paid: 100,
    reach: 500,
    clicks: 25,

    // Reaction breakdown
    reaction_like: 30,
    reaction_love: 10,
    reaction_wow: 5,
    reaction_haha: 3,
    reaction_sad: 1,
    reaction_angry: 1,

    ...overrides,
  }
}

/**
 * Create an array of mock posts with varying engagement
 */
export function createMockPostsArray(count: number = 10): NormalizedPost[] {
  const posts: NormalizedPost[] = []
  const now = new Date()
  const types: NormalizedPost['type'][] = ['photo', 'video', 'link', 'status', 'reel']

  for (let i = 0; i < count; i++) {
    const daysAgo = Math.floor(Math.random() * 90)
    const postDate = new Date(now)
    postDate.setDate(postDate.getDate() - daysAgo)

    const type = types[Math.floor(Math.random() * types.length)]
    const hasMedia = type === 'photo' || type === 'video' || type === 'reel'

    const reactions = Math.floor(Math.random() * 200)
    const comments = Math.floor(Math.random() * 50)
    const shares = Math.floor(Math.random() * 20)
    const reach = (reactions + comments + shares) * 10

    posts.push(
      createMockNormalizedPost({
        id: `post-${i}`,
        created_time: postDate,
        message: `Test post ${i} - ${type}`,
        type,
        reactions_count: reactions,
        comments_count: comments,
        shares_count: shares,
        total_engagement: reactions + comments + shares,
        reach: reach,
        impressions: Math.floor(reach * 1.5),
        impressions_organic: Math.floor(reach * 1.3),
        impressions_paid: Math.floor(reach * 0.2),
        has_media: hasMedia,
        media_type:
          type === 'photo' ? 'image' : type === 'video' || type === 'reel' ? 'video' : 'none',
        is_reel: type === 'reel',
        message_length: 10 + Math.floor(Math.random() * 200),
        emoji_count: Math.floor(Math.random() * 5),
        reaction_like: Math.floor(reactions * 0.6),
        reaction_love: Math.floor(reactions * 0.2),
        reaction_wow: Math.floor(reactions * 0.1),
        reaction_haha: Math.floor(reactions * 0.06),
        reaction_sad: Math.floor(reactions * 0.02),
        reaction_angry: Math.floor(reactions * 0.02),
      })
    )
  }

  return posts.sort((a, b) => b.created_time.getTime() - a.created_time.getTime())
}

/**
 * Create mock page insights
 */
export function createMockPageInsights(): FacebookInsight[] {
  return [
    {
      id: 'page_impressions',
      name: 'page_impressions',
      period: 'day',
      values: [{ value: 1000, end_time: new Date().toISOString() }],
      title: 'Daily Total Impressions',
    },
    {
      id: 'page_engaged_users',
      name: 'page_engaged_users',
      period: 'day',
      values: [{ value: 100, end_time: new Date().toISOString() }],
      title: 'Daily Engaged Users',
    },
    {
      id: 'page_fans',
      name: 'page_fans',
      period: 'lifetime',
      values: [{ value: 1000 }],
      title: 'Total Page Likes',
    },
    {
      id: 'page_fan_adds',
      name: 'page_fan_adds',
      period: 'day',
      values: [{ value: 10, end_time: new Date().toISOString() }],
      title: 'Daily New Likes',
    },
    {
      id: 'page_views_total',
      name: 'page_views_total',
      period: 'day',
      values: [{ value: 500, end_time: new Date().toISOString() }],
      title: 'Daily Page Views',
    },
  ]
}

// ============================================================================
// Mock API Responses
// ============================================================================

/**
 * Mock successful API response
 */
export function mockApiResponse<T>(data: T): { data: T } {
  return { data }
}

/**
 * Mock API error response
 */
export function mockApiError(
  code: number,
  message: string = 'Mock error'
): { error: { message: string; type: string; code: number } } {
  return {
    error: {
      message,
      type: 'OAuthException',
      code,
    },
  }
}

/**
 * Common error scenarios
 */
export const mockErrors = {
  tokenExpired: mockApiError(190, 'Error validating access token'),
  permissionDenied: mockApiError(200, 'Permission denied'),
  rateLimited: mockApiError(4, 'Application request limit reached'),
  serverError: mockApiError(1, 'An unknown error occurred'),
}

// ============================================================================
// Test Fixtures
// ============================================================================

/**
 * Pre-built test scenarios for common use cases
 */
export const testFixtures = {
  /**
   * Page with excellent metrics
   */
  excellentPage: {
    page: createMockNormalizedPage({
      fan_count: 50000,
      name: 'Excellent Test Page',
    }),
    posts: createMockPostsArray(30).map((post) => ({
      ...post,
      reactions_count: post.reactions_count * 3,
      comments_count: post.comments_count * 2,
      total_engagement: post.reactions_count * 3 + post.comments_count * 2 + post.shares_count,
    })),
  },

  /**
   * Page with poor metrics
   */
  poorPage: {
    page: createMockNormalizedPage({
      fan_count: 100,
      name: 'Poor Test Page',
    }),
    posts: createMockPostsArray(5).map((post) => ({
      ...post,
      reactions_count: Math.floor(post.reactions_count * 0.1),
      comments_count: 0,
      shares_count: 0,
      total_engagement: Math.floor(post.reactions_count * 0.1),
    })),
  },

  /**
   * New page with minimal data
   */
  newPage: {
    page: createMockNormalizedPage({
      fan_count: 50,
      name: 'New Test Page',
    }),
    posts: createMockPostsArray(2),
  },

  /**
   * Page with no posts
   */
  emptyPage: {
    page: createMockNormalizedPage({
      fan_count: 200,
      name: 'Empty Test Page',
    }),
    posts: [] as NormalizedPost[],
  },
}
