import type { PageInsights } from '@/lib/integrations/facebook/insights'
import type { NormalizedFacebookPage } from '@/lib/integrations/facebook/types'

// Normalized post structure for trigger evaluation
export interface NormalizedPost {
  id: string
  created_time: Date
  message: string | null
  type: 'photo' | 'video' | 'link' | 'status' | 'reel' | 'shared' | 'other'

  // Engagement metrics
  reactions_count: number
  comments_count: number
  shares_count: number
  total_engagement: number

  // Text analysis flags
  message_length: number
  emoji_count: number
  has_double_line_breaks: boolean
  has_emoji_bullets: boolean
  has_inline_links: boolean
  has_utm_params: boolean

  // Content type flags
  is_youtube_link: boolean
  is_shared_post: boolean
  is_reel: boolean

  // Media metadata
  has_media: boolean
  media_type: 'image' | 'video' | 'none'
  image_width: number | null
  image_height: number | null
  image_format: string | null

  // Post insights (if available)
  impressions: number | null
  impressions_organic: number | null
  impressions_paid: number | null
  reach: number | null
  clicks: number | null

  // Reaction breakdown
  reaction_like: number
  reaction_love: number
  reaction_wow: number
  reaction_haha: number
  reaction_sad: number
  reaction_angry: number

  // Original data reference
  permalink_url: string | null
}

// Collected raw data before normalization
export interface CollectedData {
  pageData: NormalizedFacebookPage
  posts: RawPost[]
  insights: PageInsights | null
  collectedAt: Date
  metadata: {
    postsCollected: number
    oldestPostDate: Date | null
    newestPostDate: Date | null
    insightsAvailable: boolean
    insightsError?: string | null
    insightsErrorMessage?: string | null
    daysOfData: number
  }
}

// Raw post from Facebook API (before normalization)
export interface RawPost {
  id: string
  created_time: string
  message?: string
  story?: string
  type?: string
  status_type?: string
  permalink_url?: string
  full_picture?: string
  attachments?: {
    data: Array<{
      media?: {
        image?: {
          height: number
          width: number
          src: string
        }
        source?: string
      }
      media_type?: string
      type?: string
      url?: string
      title?: string
      target?: {
        id: string
        url: string
      }
      subattachments?: {
        data: Array<{
          media?: {
            image?: {
              height: number
              width: number
              src: string
            }
          }
          media_type?: string
          type?: string
        }>
      }
    }>
  }
  reactions?: {
    summary: {
      total_count: number
    }
  }
  comments?: {
    summary: {
      total_count: number
    }
  }
  shares?: {
    count: number
  }
  // Post insights (optional)
  insights?: Record<string, number>
}

// Input for trigger evaluation
export interface TriggerInput {
  pageData: NormalizedFacebookPage
  posts90d: NormalizedPost[]
  insights28d: PageInsights | null
  industryBenchmark: IndustryBenchmarkData
}

// Industry benchmark data from database
export interface IndustryBenchmarkData {
  industry_code: string
  industry_name: string
  avg_engagement_rate: number
  reactions_pct: number
  comments_pct: number
  shares_pct: number
  ideal_engagement_pct: number
  ideal_sales_pct: number
  ideal_brand_pct: number
  ideal_posts_per_week: number
}

// Analysis result to be stored
export interface AnalysisRawData {
  pageData: NormalizedFacebookPage
  posts90d: NormalizedPost[]
  insights28d: PageInsights | null
  collectionMetadata: {
    collectedAt: string
    postsCollected: number
    oldestPostDate: string | null
    newestPostDate: string | null
    insightsAvailable: boolean
    insightsError?: string | null
    insightsErrorMessage?: string | null
    daysOfData: number
  }
}
