import { describe, it, expect } from 'vitest'
import {
  normalizePost,
  normalizeCollectedData,
  getPostsByDateRange,
  calculateAverageEngagement,
  calculateEngagementRate,
} from '@/lib/services/analysis/normalizer'
import type { RawPost, CollectedData, NormalizedPost } from '@/lib/services/analysis/types'
import type { NormalizedFacebookPage } from '@/lib/integrations/facebook/types'

// Helper to create minimal RawPost for testing
function createRawPost(overrides: Partial<RawPost> = {}): RawPost {
  return {
    id: 'post_123',
    created_time: '2024-01-15T10:00:00+0000',
    message: 'Test post message',
    type: 'status',
    ...overrides,
  }
}

// Helper to create minimal NormalizedPost for testing
function createNormalizedPost(overrides: Partial<NormalizedPost> = {}): NormalizedPost {
  return {
    id: 'post_123',
    created_time: new Date('2024-01-15T10:00:00Z'),
    message: 'Test message',
    type: 'status',
    reactions_count: 10,
    comments_count: 5,
    shares_count: 2,
    total_engagement: 17,
    message_length: 12,
    emoji_count: 0,
    has_double_line_breaks: false,
    has_emoji_bullets: false,
    has_inline_links: false,
    has_utm_params: false,
    is_youtube_link: false,
    is_shared_post: false,
    is_reel: false,
    has_media: false,
    media_type: 'none',
    image_width: null,
    image_height: null,
    image_format: null,
    impressions: null,
    impressions_organic: null,
    impressions_paid: null,
    reach: null,
    clicks: null,
    reaction_like: 0,
    reaction_love: 0,
    reaction_wow: 0,
    reaction_haha: 0,
    reaction_sad: 0,
    reaction_angry: 0,
    permalink_url: null,
    ...overrides,
  }
}

describe('Normalizer', () => {
  describe('normalizePost', () => {
    describe('basic normalization', () => {
      it('normalizes a simple status post', () => {
        const raw = createRawPost({
          id: 'test_id',
          created_time: '2024-01-15T12:30:00+0000',
          message: 'Hello World!',
          type: 'status',
        })

        const result = normalizePost(raw)

        expect(result.id).toBe('test_id')
        expect(result.created_time).toEqual(new Date('2024-01-15T12:30:00+0000'))
        expect(result.message).toBe('Hello World!')
        expect(result.type).toBe('status')
        expect(result.message_length).toBe(12)
      })

      it('handles null message', () => {
        const raw = createRawPost({ message: undefined })
        const result = normalizePost(raw)

        expect(result.message).toBeNull()
        expect(result.message_length).toBe(0)
      })

      it('calculates total engagement correctly', () => {
        const raw = createRawPost({
          reactions: { summary: { total_count: 100 } },
          comments: { summary: { total_count: 50 } },
          shares: { count: 25 },
        })

        const result = normalizePost(raw)

        expect(result.reactions_count).toBe(100)
        expect(result.comments_count).toBe(50)
        expect(result.shares_count).toBe(25)
        expect(result.total_engagement).toBe(175)
      })

      it('handles missing engagement data', () => {
        const raw = createRawPost({})
        const result = normalizePost(raw)

        expect(result.reactions_count).toBe(0)
        expect(result.comments_count).toBe(0)
        expect(result.shares_count).toBe(0)
        expect(result.total_engagement).toBe(0)
      })

      it('treats empty string message as null (falsy coercion)', () => {
        const rawEmpty = createRawPost({ message: '' })
        const rawUndefined = createRawPost({ message: undefined })

        const resultEmpty = normalizePost(rawEmpty)
        const resultUndefined = normalizePost(rawUndefined)

        // Both empty string and undefined become null due to `|| null` coercion
        expect(resultEmpty.message).toBeNull()
        expect(resultEmpty.message_length).toBe(0)
        expect(resultUndefined.message).toBeNull()
        expect(resultUndefined.message_length).toBe(0)
      })

      it('handles invalid date format gracefully', () => {
        const raw = createRawPost({ created_time: 'not-a-date' })
        const result = normalizePost(raw)

        // Invalid date should result in Invalid Date object
        expect(result.created_time instanceof Date).toBe(true)
        expect(isNaN(result.created_time.getTime())).toBe(true)
      })

      it('handles zero engagement values', () => {
        const raw = createRawPost({
          reactions: { summary: { total_count: 0 } },
          comments: { summary: { total_count: 0 } },
          shares: { count: 0 },
        })

        const result = normalizePost(raw)

        expect(result.reactions_count).toBe(0)
        expect(result.comments_count).toBe(0)
        expect(result.shares_count).toBe(0)
        expect(result.total_engagement).toBe(0)
      })
    })

    describe('post type detection', () => {
      it('detects photo post from attachment media_type', () => {
        const raw = createRawPost({
          attachments: {
            data: [{ media_type: 'photo' }],
          },
        })
        expect(normalizePost(raw).type).toBe('photo')
      })

      it('detects video post from attachment media_type', () => {
        const raw = createRawPost({
          attachments: {
            data: [{ media_type: 'video' }],
          },
        })
        expect(normalizePost(raw).type).toBe('video')
      })

      it('detects link post from attachment media_type', () => {
        const raw = createRawPost({
          attachments: {
            data: [{ media_type: 'link' }],
          },
        })
        expect(normalizePost(raw).type).toBe('link')
      })

      it('returns status for post without attachments', () => {
        const raw = createRawPost({})
        expect(normalizePost(raw).type).toBe('status')
      })

      it('detects shared post by target in attachment', () => {
        const raw = createRawPost({
          type: 'link',
          attachments: {
            data: [{ target: { id: '123', url: 'https://fb.com/123' } }],
          },
        })
        const result = normalizePost(raw)

        expect(result.type).toBe('shared')
        expect(result.is_shared_post).toBe(true)
      })

      it('detects reel by media_type', () => {
        const raw = createRawPost({
          attachments: {
            data: [{ media_type: 'reel' }],
          },
        })
        const result = normalizePost(raw)

        expect(result.type).toBe('reel')
        expect(result.is_reel).toBe(true)
      })

      it('detects reel by attachment type', () => {
        const raw = createRawPost({
          attachments: {
            data: [{ type: 'reel' }],
          },
        })
        const result = normalizePost(raw)

        expect(result.is_reel).toBe(true)
      })

      it('returns "other" for unrecognized attachment type', () => {
        const raw = createRawPost({
          attachments: {
            data: [{ type: 'unknown_type', media_type: 'something_else' }],
          },
        })
        const result = normalizePost(raw)

        expect(result.type).toBe('other')
      })

      it('treats album media_type as photo', () => {
        const raw = createRawPost({
          attachments: {
            data: [{ media_type: 'album' }],
          },
        })
        const result = normalizePost(raw)

        expect(result.type).toBe('photo')
      })

      it('detects shared post by share attachment type', () => {
        const raw = createRawPost({
          attachments: {
            data: [{ type: 'share' }],
          },
        })
        const result = normalizePost(raw)

        expect(result.type).toBe('shared')
        expect(result.is_shared_post).toBe(true)
      })
    })

    describe('text analysis', () => {
      it('counts emojis correctly', () => {
        const raw = createRawPost({ message: 'Hello 👋 World 🌍! Test 😀😀' })
        const result = normalizePost(raw)
        expect(result.emoji_count).toBe(4)
      })

      it('detects double line breaks', () => {
        const raw = createRawPost({ message: 'Line 1\n\nLine 2' })
        expect(normalizePost(raw).has_double_line_breaks).toBe(true)
      })

      it('does not detect single line breaks as double', () => {
        const raw = createRawPost({ message: 'Line 1\nLine 2' })
        expect(normalizePost(raw).has_double_line_breaks).toBe(false)
      })

      it('detects emoji bullets', () => {
        const raw = createRawPost({
          message: '🔥 First point\n✅ Second point\n💡 Third point',
        })
        expect(normalizePost(raw).has_emoji_bullets).toBe(true)
      })

      it('does not detect single emoji as bullet', () => {
        const raw = createRawPost({ message: '🔥 Just one emoji line' })
        expect(normalizePost(raw).has_emoji_bullets).toBe(false)
      })

      it('detects exactly 2 emoji bullets (minimum threshold)', () => {
        const raw = createRawPost({
          message: '🔥 First point\n✅ Second point',
        })
        expect(normalizePost(raw).has_emoji_bullets).toBe(true)
      })

      it('detects inline links', () => {
        const raw = createRawPost({
          message: 'Check out https://example.com for more info',
        })
        expect(normalizePost(raw).has_inline_links).toBe(true)
      })

      it('detects UTM params in message', () => {
        const raw = createRawPost({
          message: 'Visit https://example.com?utm_source=facebook',
        })
        expect(normalizePost(raw).has_utm_params).toBe(true)
      })

      it('detects UTM params in attachment URL', () => {
        const raw = createRawPost({
          attachments: {
            data: [{ url: 'https://example.com?utm_campaign=test' }],
          },
        })
        expect(normalizePost(raw).has_utm_params).toBe(true)
      })

      it('detects YouTube link in message', () => {
        const raw = createRawPost({
          message: 'Watch this: https://youtube.com/watch?v=123',
        })
        expect(normalizePost(raw).is_youtube_link).toBe(true)
      })

      it('detects youtu.be short link', () => {
        const raw = createRawPost({
          message: 'Video: https://youtu.be/abc123',
        })
        expect(normalizePost(raw).is_youtube_link).toBe(true)
      })
    })

    describe('media metadata extraction', () => {
      it('extracts image metadata', () => {
        const raw = createRawPost({
          attachments: {
            data: [
              {
                media: {
                  image: {
                    width: 1200,
                    height: 630,
                    src: 'https://example.com/image.png',
                  },
                },
              },
            ],
          },
        })

        const result = normalizePost(raw)

        expect(result.has_media).toBe(true)
        expect(result.media_type).toBe('image')
        expect(result.image_width).toBe(1200)
        expect(result.image_height).toBe(630)
        expect(result.image_format).toBe('png')
      })

      it('detects JPEG format from URL', () => {
        const raw = createRawPost({
          attachments: {
            data: [
              {
                media: {
                  image: { width: 800, height: 600, src: 'https://example.com/photo.jpg' },
                },
              },
            ],
          },
        })
        expect(normalizePost(raw).image_format).toBe('jpeg')
      })

      it('detects GIF format from URL', () => {
        const raw = createRawPost({
          attachments: {
            data: [
              {
                media: {
                  image: { width: 400, height: 300, src: 'https://example.com/animation.gif' },
                },
              },
            ],
          },
        })
        expect(normalizePost(raw).image_format).toBe('gif')
      })

      it('detects WebP format from URL', () => {
        const raw = createRawPost({
          attachments: {
            data: [
              {
                media: {
                  image: { width: 800, height: 600, src: 'https://example.com/image.webp' },
                },
              },
            ],
          },
        })
        expect(normalizePost(raw).image_format).toBe('webp')
      })

      it('detects format from URL with query parameters', () => {
        const raw = createRawPost({
          attachments: {
            data: [
              {
                media: {
                  image: {
                    width: 800,
                    height: 600,
                    src: 'https://example.com/image.png?w=100&h=100',
                  },
                },
              },
            ],
          },
        })
        expect(normalizePost(raw).image_format).toBe('png')
      })

      it('extracts image from subattachments', () => {
        const raw = createRawPost({
          attachments: {
            data: [
              {
                subattachments: {
                  data: [
                    {
                      media: {
                        image: {
                          width: 1200,
                          height: 800,
                          src: 'https://example.com/sub-image.png',
                        },
                      },
                    },
                  ],
                },
              },
            ],
          },
        })

        const result = normalizePost(raw)

        expect(result.has_media).toBe(true)
        expect(result.media_type).toBe('image')
        expect(result.image_width).toBe(1200)
        expect(result.image_height).toBe(800)
        expect(result.image_format).toBe('png')
      })

      it('returns null format for unrecognized extension', () => {
        const raw = createRawPost({
          attachments: {
            data: [
              {
                media: {
                  image: {
                    width: 800,
                    height: 600,
                    src: 'https://example.com/image.tiff',
                  },
                },
              },
            ],
          },
        })
        expect(normalizePost(raw).image_format).toBeNull()
      })

      it('handles image without dimensions from full_picture fallback', () => {
        const raw = createRawPost({
          full_picture: 'https://example.com/image.png',
        })

        const result = normalizePost(raw)

        expect(result.has_media).toBe(true)
        expect(result.media_type).toBe('image')
        expect(result.image_width).toBeNull()
        expect(result.image_height).toBeNull()
      })

      it('extracts video metadata', () => {
        const raw = createRawPost({
          attachments: {
            data: [
              {
                media: { source: 'https://video.com/v.mp4' },
                media_type: 'video',
              },
            ],
          },
        })

        const result = normalizePost(raw)

        expect(result.has_media).toBe(true)
        expect(result.media_type).toBe('video')
      })

      it('falls back to full_picture', () => {
        const raw = createRawPost({
          full_picture: 'https://example.com/full.jpg',
        })

        const result = normalizePost(raw)

        expect(result.has_media).toBe(true)
        expect(result.media_type).toBe('image')
      })

      it('returns no media when none present', () => {
        const raw = createRawPost({})
        const result = normalizePost(raw)

        expect(result.has_media).toBe(false)
        expect(result.media_type).toBe('none')
      })
    })

    describe('reactions breakdown', () => {
      it('extracts reaction types from insights', () => {
        const raw = createRawPost({
          insights: {
            post_reactions_by_type_total_like: 50,
            post_reactions_by_type_total_love: 20,
            post_reactions_by_type_total_wow: 5,
            post_reactions_by_type_total_haha: 10,
            post_reactions_by_type_total_sad: 2,
            post_reactions_by_type_total_angry: 1,
          },
        })

        const result = normalizePost(raw)

        expect(result.reaction_like).toBe(50)
        expect(result.reaction_love).toBe(20)
        expect(result.reaction_wow).toBe(5)
        expect(result.reaction_haha).toBe(10)
        expect(result.reaction_sad).toBe(2)
        expect(result.reaction_angry).toBe(1)
      })

      it('defaults reactions to 0 when not present', () => {
        const raw = createRawPost({})
        const result = normalizePost(raw)

        expect(result.reaction_like).toBe(0)
        expect(result.reaction_love).toBe(0)
      })
    })

    describe('post insights', () => {
      it('extracts post insights', () => {
        const raw = createRawPost({
          insights: {
            post_impressions: 1000,
            post_impressions_organic: 800,
            post_impressions_paid: 200,
            post_impressions_unique: 750,
            post_clicks: 50,
          },
        })

        const result = normalizePost(raw)

        expect(result.impressions).toBe(1000)
        expect(result.impressions_organic).toBe(800)
        expect(result.impressions_paid).toBe(200)
        expect(result.reach).toBe(750)
        expect(result.clicks).toBe(50)
      })

      it('returns null for missing insights', () => {
        const raw = createRawPost({})
        const result = normalizePost(raw)

        expect(result.impressions).toBeNull()
        expect(result.reach).toBeNull()
        expect(result.clicks).toBeNull()
      })
    })
  })

  describe('normalizeCollectedData', () => {
    it('normalizes collected data and sorts posts by date', () => {
      const pageData: NormalizedFacebookPage = {
        fb_page_id: 'page_123',
        name: 'Test Page',
        category: 'Business',
        fan_count: 1000,
        picture_url: null,
        cover_url: null,
        page_access_token: 'test_token',
        username: 'testpage',
      }

      const collectedData: CollectedData = {
        pageData,
        posts: [
          createRawPost({ id: 'old', created_time: '2024-01-01T10:00:00+0000' }),
          createRawPost({ id: 'new', created_time: '2024-01-15T10:00:00+0000' }),
          createRawPost({ id: 'mid', created_time: '2024-01-10T10:00:00+0000' }),
        ],
        insights: null,
        collectedAt: new Date('2024-01-20T00:00:00Z'),
        metadata: {
          postsCollected: 3,
          oldestPostDate: new Date('2024-01-01'),
          newestPostDate: new Date('2024-01-15'),
          insightsAvailable: false,
          daysOfData: 14,
        },
      }

      const result = normalizeCollectedData(collectedData)

      // Should be sorted newest first
      expect(result.posts90d).toHaveLength(3)
      expect(result.posts90d[0]!.id).toBe('new')
      expect(result.posts90d[1]!.id).toBe('mid')
      expect(result.posts90d[2]!.id).toBe('old')

      expect(result.pageData).toEqual(pageData)
      expect(result.collectionMetadata.postsCollected).toBe(3)
      expect(result.collectionMetadata.daysOfData).toBe(14)
    })

    it('normalizes collection with no posts', () => {
      const pageData: NormalizedFacebookPage = {
        fb_page_id: 'page_123',
        name: 'Empty Page',
        category: 'Business',
        fan_count: 0,
        picture_url: null,
        cover_url: null,
        page_access_token: 'test_token',
        username: 'emptypage',
      }

      const collectedData: CollectedData = {
        pageData,
        posts: [],
        insights: null,
        collectedAt: new Date('2024-01-20T00:00:00Z'),
        metadata: {
          postsCollected: 0,
          oldestPostDate: null,
          newestPostDate: null,
          insightsAvailable: false,
          daysOfData: 0,
        },
      }

      const result = normalizeCollectedData(collectedData)

      expect(result.posts90d).toHaveLength(0)
      expect(result.collectionMetadata.postsCollected).toBe(0)
      expect(result.collectionMetadata.oldestPostDate).toBeNull()
      expect(result.collectionMetadata.newestPostDate).toBeNull()
    })
  })

  describe('getPostsByDateRange', () => {
    const today = new Date()
    const posts: NormalizedPost[] = [
      createNormalizedPost({
        id: 'recent',
        created_time: new Date(today.getTime() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
      }),
      createNormalizedPost({
        id: 'older',
        created_time: new Date(today.getTime() - 15 * 24 * 60 * 60 * 1000), // 15 days ago
      }),
      createNormalizedPost({
        id: 'oldest',
        created_time: new Date(today.getTime() - 45 * 24 * 60 * 60 * 1000), // 45 days ago
      }),
    ]

    it('filters posts within date range', () => {
      const result = getPostsByDateRange(posts, 10)
      expect(result).toHaveLength(1)
      expect(result[0]!.id).toBe('recent')
    })

    it('returns all posts for large range', () => {
      const result = getPostsByDateRange(posts, 90)
      expect(result).toHaveLength(3)
    })

    it('returns empty array when no posts in range', () => {
      const result = getPostsByDateRange(posts, 1)
      expect(result).toHaveLength(0)
    })

    it('handles empty posts array', () => {
      const result = getPostsByDateRange([], 30)
      expect(result).toHaveLength(0)
    })

    it('handles zero daysBack (should return no posts)', () => {
      const result = getPostsByDateRange(posts, 0)
      expect(result).toHaveLength(0)
    })

    it('handles negative daysBack (edge case)', () => {
      const result = getPostsByDateRange(posts, -1)
      expect(result).toHaveLength(0)
    })
  })

  describe('calculateAverageEngagement', () => {
    it('calculates average engagement correctly', () => {
      const posts: NormalizedPost[] = [
        createNormalizedPost({ total_engagement: 100 }),
        createNormalizedPost({ total_engagement: 50 }),
        createNormalizedPost({ total_engagement: 150 }),
      ]

      const result = calculateAverageEngagement(posts)
      expect(result).toBe(100) // (100 + 50 + 150) / 3
    })

    it('returns 0 for empty array', () => {
      const result = calculateAverageEngagement([])
      expect(result).toBe(0)
    })

    it('handles single post', () => {
      const posts = [createNormalizedPost({ total_engagement: 42 })]
      expect(calculateAverageEngagement(posts)).toBe(42)
    })
  })

  describe('calculateEngagementRate', () => {
    it('calculates engagement rate correctly', () => {
      const posts: NormalizedPost[] = [
        createNormalizedPost({ total_engagement: 100 }),
        createNormalizedPost({ total_engagement: 100 }),
      ]

      const result = calculateEngagementRate(posts, 1000)
      expect(result).toBe(0.1) // avg 100 / 1000 fans = 0.1
    })

    it('returns 0 for empty posts', () => {
      const result = calculateEngagementRate([], 1000)
      expect(result).toBe(0)
    })

    it('returns 0 for zero fan count', () => {
      const posts = [createNormalizedPost({ total_engagement: 100 })]
      expect(calculateEngagementRate(posts, 0)).toBe(0)
    })
  })
})
