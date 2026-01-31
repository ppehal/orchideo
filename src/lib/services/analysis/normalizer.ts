import { createLogger } from '@/lib/logging'
import type { NormalizedPost, RawPost, CollectedData, AnalysisRawData } from './types'

const log = createLogger('analysis-normalizer')

// Regex patterns for text analysis
const EMOJI_REGEX =
  /[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|[\u{1F600}-\u{1F64F}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]/gu
const DOUBLE_LINE_BREAK_REGEX = /\n\s*\n/
const EMOJI_BULLET_REGEX = /^[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/mu
const URL_REGEX = /https?:\/\/[^\s]+/gi
const UTM_REGEX = /[?&]utm_/i
const YOUTUBE_REGEX = /(?:youtube\.com|youtu\.be)/i

function countEmojis(text: string | null): number {
  if (!text) return 0
  const matches = text.match(EMOJI_REGEX)
  return matches ? matches.length : 0
}

function hasDoubleLineBreaks(text: string | null): boolean {
  if (!text) return false
  return DOUBLE_LINE_BREAK_REGEX.test(text)
}

function hasEmojiBullets(text: string | null): boolean {
  if (!text) return false
  // Check if text has emoji at the start of lines (bullet-style)
  const lines = text.split('\n')
  const emojiBulletLines = lines.filter((line) => EMOJI_BULLET_REGEX.test(line.trim()))
  return emojiBulletLines.length >= 2
}

function hasInlineLinks(text: string | null): boolean {
  if (!text) return false
  return URL_REGEX.test(text)
}

function hasUtmParams(text: string | null, attachmentUrl: string | null): boolean {
  if (text && UTM_REGEX.test(text)) return true
  if (attachmentUrl && UTM_REGEX.test(attachmentUrl)) return true
  return false
}

function isYouTubeLink(text: string | null, attachmentUrl: string | null): boolean {
  if (text && YOUTUBE_REGEX.test(text)) return true
  if (attachmentUrl && YOUTUBE_REGEX.test(attachmentUrl)) return true
  return false
}

function isSharedPost(post: RawPost): boolean {
  // Check if it's a shared post based on attachment properties
  // Note: status_type and type fields are deprecated in Graph API v3.3+
  const attachment = post.attachments?.data?.[0]
  if (attachment?.type === 'share') return true
  if (attachment?.target) return true
  return false
}

function isReel(post: RawPost): boolean {
  // Check if it's a reel based on attachment properties
  // Note: status_type is deprecated in Graph API v3.3+
  const attachment = post.attachments?.data?.[0]
  if (attachment?.media_type === 'reel' || attachment?.type === 'reel') return true
  return false
}

function determinePostType(
  post: RawPost
): 'photo' | 'video' | 'link' | 'status' | 'reel' | 'shared' | 'other' {
  if (isSharedPost(post)) return 'shared'
  if (isReel(post)) return 'reel'

  // Derive type from attachments (type/status_type deprecated in Graph API v3.3+)
  const attachment = post.attachments?.data?.[0]

  if (attachment?.media_type === 'photo' || attachment?.type === 'photo') return 'photo'
  if (attachment?.media_type === 'video' || attachment?.type === 'video') return 'video'
  if (attachment?.media_type === 'album') return 'photo' // Albums are treated as photos
  if (attachment?.media_type === 'link' || attachment?.type === 'link') return 'link'

  // No attachment = text-only status
  if (!attachment) return 'status'

  // Fallback: check if there's a full_picture (indicates media)
  if (post.full_picture) return 'photo'

  return 'other'
}

function extractMediaMetadata(post: RawPost): {
  has_media: boolean
  media_type: 'image' | 'video' | 'none'
  image_width: number | null
  image_height: number | null
  image_format: string | null
} {
  const attachment = post.attachments?.data?.[0]
  const subAttachment = attachment?.subattachments?.data?.[0]

  // Check for image
  const image = attachment?.media?.image || subAttachment?.media?.image
  if (image) {
    // Try to determine format from URL
    const url = image.src || post.full_picture || ''
    let format: string | null = null
    if (url.includes('.png')) format = 'png'
    else if (url.includes('.jpg') || url.includes('.jpeg')) format = 'jpeg'
    else if (url.includes('.gif')) format = 'gif'
    else if (url.includes('.webp')) format = 'webp'

    return {
      has_media: true,
      media_type: 'image',
      image_width: image.width || null,
      image_height: image.height || null,
      image_format: format,
    }
  }

  // Check for video
  if (attachment?.media?.source || attachment?.media_type === 'video') {
    return {
      has_media: true,
      media_type: 'video',
      image_width: null,
      image_height: null,
      image_format: null,
    }
  }

  // Check for full_picture (fallback for images)
  if (post.full_picture) {
    return {
      has_media: true,
      media_type: 'image',
      image_width: null,
      image_height: null,
      image_format: null,
    }
  }

  return {
    has_media: false,
    media_type: 'none',
    image_width: null,
    image_height: null,
    image_format: null,
  }
}

function extractReactions(post: RawPost): {
  reaction_like: number
  reaction_love: number
  reaction_wow: number
  reaction_haha: number
  reaction_sad: number
  reaction_angry: number
} {
  const insights = post.insights || {}

  return {
    reaction_like: insights['post_reactions_by_type_total_like'] || 0,
    reaction_love: insights['post_reactions_by_type_total_love'] || 0,
    reaction_wow: insights['post_reactions_by_type_total_wow'] || 0,
    reaction_haha: insights['post_reactions_by_type_total_haha'] || 0,
    reaction_sad: insights['post_reactions_by_type_total_sad'] || 0,
    reaction_angry: insights['post_reactions_by_type_total_angry'] || 0,
  }
}

export function normalizePost(post: RawPost): NormalizedPost {
  const message = post.message || null
  const attachmentUrl = post.attachments?.data?.[0]?.url || null

  const reactionsCount = post.reactions?.summary?.total_count || 0
  const commentsCount = post.comments?.summary?.total_count || 0
  const sharesCount = post.shares?.count || 0

  const mediaMetadata = extractMediaMetadata(post)
  const reactions = extractReactions(post)

  return {
    id: post.id,
    created_time: new Date(post.created_time),
    message,
    type: determinePostType(post),

    // Engagement metrics
    reactions_count: reactionsCount,
    comments_count: commentsCount,
    shares_count: sharesCount,
    total_engagement: reactionsCount + commentsCount + sharesCount,

    // Text analysis
    message_length: message?.length || 0,
    emoji_count: countEmojis(message),
    has_double_line_breaks: hasDoubleLineBreaks(message),
    has_emoji_bullets: hasEmojiBullets(message),
    has_inline_links: hasInlineLinks(message),
    has_utm_params: hasUtmParams(message, attachmentUrl),

    // Content type flags
    is_youtube_link: isYouTubeLink(message, attachmentUrl),
    is_shared_post: isSharedPost(post),
    is_reel: isReel(post),

    // Media metadata
    ...mediaMetadata,

    // Post insights
    impressions: post.insights?.['post_impressions'] || null,
    impressions_organic: post.insights?.['post_impressions_organic'] || null,
    impressions_paid: post.insights?.['post_impressions_paid'] || null,
    reach: post.insights?.['post_impressions_unique'] || null,
    clicks: post.insights?.['post_clicks'] || null,

    // Reactions breakdown
    ...reactions,

    // Reference
    permalink_url: post.permalink_url || null,
  }
}

export function normalizeCollectedData(collectedData: CollectedData): AnalysisRawData {
  log.info({ postsCount: collectedData.posts.length }, 'Normalizing collected data')

  const normalizedPosts = collectedData.posts.map(normalizePost)

  // Sort by date descending (newest first)
  normalizedPosts.sort((a, b) => b.created_time.getTime() - a.created_time.getTime())

  log.info(
    {
      normalizedCount: normalizedPosts.length,
      oldestPost: normalizedPosts[normalizedPosts.length - 1]?.created_time?.toISOString(),
      newestPost: normalizedPosts[0]?.created_time?.toISOString(),
    },
    'Data normalization completed'
  )

  return {
    pageData: collectedData.pageData,
    posts90d: normalizedPosts,
    insights28d: collectedData.insights,
    collectionMetadata: {
      collectedAt: collectedData.collectedAt.toISOString(),
      postsCollected: collectedData.metadata.postsCollected,
      oldestPostDate: collectedData.metadata.oldestPostDate?.toISOString() || null,
      newestPostDate: collectedData.metadata.newestPostDate?.toISOString() || null,
      insightsAvailable: collectedData.metadata.insightsAvailable,
      daysOfData: collectedData.metadata.daysOfData,
    },
  }
}

// Utility functions for trigger evaluation
export function getPostsByDateRange(posts: NormalizedPost[], daysBack: number): NormalizedPost[] {
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - daysBack)
  return posts.filter((p) => p.created_time >= cutoff)
}

export function calculateAverageEngagement(posts: NormalizedPost[]): number {
  if (posts.length === 0) return 0
  const totalEngagement = posts.reduce((sum, p) => sum + p.total_engagement, 0)
  return totalEngagement / posts.length
}

export function calculateEngagementRate(posts: NormalizedPost[], fanCount: number): number {
  if (posts.length === 0 || fanCount === 0) return 0
  const avgEngagement = calculateAverageEngagement(posts)
  return avgEngagement / fanCount
}
