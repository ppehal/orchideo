import type { TriggerInput } from '@/lib/triggers/types'
import type { NormalizedPost, IndustryBenchmarkData } from '@/lib/services/analysis/types'
import type { NormalizedFacebookPage } from '@/lib/integrations/facebook/types'
import type { PageInsights } from '@/lib/integrations/facebook/insights'

// Helper to create a date relative to today
function daysAgo(days: number): Date {
  const date = new Date()
  date.setDate(date.getDate() - days)
  return date
}

// Default page data - matching NormalizedFacebookPage type
export const samplePageData: NormalizedFacebookPage = {
  fb_page_id: '123456789',
  name: 'Test Firma',
  username: 'testfirma',
  category: 'Retail Company',
  fan_count: 5000,
  picture_url: 'https://example.com/profile.jpg',
  cover_url: 'https://example.com/cover.jpg',
  page_access_token: 'test_token',
}

// Default industry benchmark
export const sampleBenchmark: IndustryBenchmarkData = {
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
}

// Default insights - matching PageInsights type
export const sampleInsights: PageInsights = {
  page_impressions: 50000,
  page_impressions_unique: 30000,
  page_impressions_organic: 35000,
  page_impressions_paid: 15000,
  page_engaged_users: 2500,
  page_post_engagements: 3000,
  page_views_total: 1200,
  page_fans: 5000,
  page_fan_adds: 150,
  page_fan_removes: 30,
  page_actions_post_reactions_total: {
    like: 2000,
    love: 300,
    wow: 100,
    haha: 150,
    sad: 20,
    angry: 10,
  },
  daily_impressions: null,
  daily_engaged_users: null,
  daily_fan_adds: null,
  daily_fan_removes: null,
  period_start: daysAgo(28).toISOString(),
  period_end: new Date().toISOString(),
  fetched_at: new Date().toISOString(),
}

// Helper to create a normalized post
export function createPost(overrides: Partial<NormalizedPost> = {}): NormalizedPost {
  return {
    id: `post_${Math.random().toString(36).slice(2)}`,
    created_time: daysAgo(Math.floor(Math.random() * 90)),
    message: 'Test post message',
    type: 'photo',
    reactions_count: 50,
    comments_count: 10,
    shares_count: 5,
    total_engagement: 65,
    message_length: 17,
    emoji_count: 2,
    has_double_line_breaks: false,
    has_emoji_bullets: false,
    has_inline_links: false,
    has_utm_params: false,
    is_youtube_link: false,
    is_shared_post: false,
    is_reel: false,
    has_media: true,
    media_type: 'image',
    image_width: 1080,
    image_height: 1350,
    image_format: 'png',
    impressions: null,
    impressions_organic: null,
    impressions_paid: null,
    reach: null,
    clicks: null,
    reaction_like: 40,
    reaction_love: 5,
    reaction_wow: 2,
    reaction_haha: 2,
    reaction_sad: 0,
    reaction_angry: 1,
    permalink_url: 'https://facebook.com/post/123',
    ...overrides,
  }
}

// Create posts with specific hour distribution
export function createPostsWithHours(hours: number[]): NormalizedPost[] {
  return hours.map((hour, i) => {
    const date = daysAgo(i % 90)
    date.setHours(hour, 0, 0, 0)
    return createPost({
      created_time: date,
      total_engagement: 50 + (hour >= 18 && hour <= 21 ? 30 : 0), // Evening posts perform better
    })
  })
}

// Create posts with specific day distribution
export function createPostsWithDays(days: number[]): NormalizedPost[] {
  return days.map((day, i) => {
    const date = new Date()
    // Find the most recent occurrence of this day
    const daysUntilTarget = (date.getDay() - day + 7) % 7
    date.setDate(date.getDate() - daysUntilTarget - Math.floor(i / 7) * 7)
    return createPost({
      created_time: date,
      total_engagement: 50 + (day >= 1 && day <= 3 ? 20 : 0), // Weekdays perform better
    })
  })
}

// Generate sample posts for a healthy page
export function generateSamplePosts(count: number = 50): NormalizedPost[] {
  const posts: NormalizedPost[] = []
  const types: NormalizedPost['type'][] = ['photo', 'video', 'link', 'status', 'reel']

  for (let i = 0; i < count; i++) {
    const type = types[i % types.length]!
    const isVideo = type === 'video' || type === 'reel'

    posts.push(
      createPost({
        created_time: daysAgo(Math.floor((i / count) * 90)),
        type,
        message: i % 5 === 0 ? 'Koupit teď se slevou 20%!' : 'Běžný příspěvek s obsahem.',
        message_length: i % 5 === 0 ? 25 : 30,
        emoji_count: i % 3,
        has_double_line_breaks: i % 4 === 0,
        has_emoji_bullets: i % 5 === 0,
        is_reel: type === 'reel',
        has_media: type !== 'status',
        media_type: isVideo ? 'video' : type === 'status' ? 'none' : 'image',
        total_engagement: 30 + Math.floor(Math.random() * 70),
        reactions_count: 20 + Math.floor(Math.random() * 50),
        comments_count: 5 + Math.floor(Math.random() * 20),
        shares_count: Math.floor(Math.random() * 10),
      })
    )
  }

  return posts
}

// Complete sample trigger input
export const sampleTriggerInput: TriggerInput = {
  pageData: samplePageData,
  posts90d: generateSamplePosts(50),
  insights28d: sampleInsights,
  industryBenchmark: sampleBenchmark,
}

// Minimal input (for INSUFFICIENT_DATA cases)
export const minimalTriggerInput: TriggerInput = {
  pageData: samplePageData,
  posts90d: generateSamplePosts(3), // Only 3 posts
  insights28d: null,
  industryBenchmark: sampleBenchmark,
}

// Input without insights
export const noInsightsTriggerInput: TriggerInput = {
  pageData: samplePageData,
  posts90d: generateSamplePosts(50),
  insights28d: null,
  industryBenchmark: sampleBenchmark,
}
