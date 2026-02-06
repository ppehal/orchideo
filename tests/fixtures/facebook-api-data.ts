/**
 * Facebook API sample data fixtures for testing.
 *
 * Contains realistic sample responses from Facebook Graph API to use in tests.
 */

import type { FacebookPost, FacebookFeedResponse } from '@/lib/integrations/facebook/types'
import type { PageInsights } from '@/lib/integrations/facebook/insights'

/**
 * Sample Facebook post with realistic data
 */
export const sampleFacebookPost: FacebookPost = {
  id: '123456789_987654321',
  created_time: '2025-01-15T10:30:00+0000',
  message: 'Check out our new product launch! 🚀',
  permalink_url: 'https://facebook.com/123456789/posts/987654321',
  full_picture: 'https://scontent.xx.fbcdn.net/v/test.jpg',
  attachments: {
    data: [
      {
        media_type: 'photo',
        type: 'photo',
        media: {
          image: {
            height: 720,
            width: 1280,
            src: 'https://scontent.xx.fbcdn.net/v/test.jpg',
          },
        },
        url: 'https://facebook.com/photo/123',
        title: 'Product Launch',
        description: 'Our latest innovation',
      },
    ],
  },
  reactions: {
    summary: {
      total_count: 245,
    },
  },
  comments: {
    summary: {
      total_count: 38,
    },
  },
  shares: {
    count: 12,
  },
  is_published: true,
  is_hidden: false,
  processedInsights: {
    post_impressions: 5200,
    post_impressions_unique: 4100,
    post_impressions_organic: 3800,
    post_impressions_paid: 1400,
    post_engaged_users: 245,
    post_clicks: 120,
    post_reactions_by_type_total_like: 180,
    post_reactions_by_type_total_love: 50,
    post_reactions_by_type_total_wow: 10,
    post_reactions_by_type_total_haha: 5,
  },
}

/**
 * Sample Facebook feed response
 */
export const sampleFeedResponse: FacebookFeedResponse = {
  data: [
    sampleFacebookPost,
    {
      id: '123456789_987654322',
      created_time: '2025-01-14T15:20:00+0000',
      message: 'Thanks to all our customers for your support!',
      permalink_url: 'https://facebook.com/123456789/posts/987654322',
      reactions: { summary: { total_count: 156 } },
      comments: { summary: { total_count: 22 } },
      shares: { count: 5 },
      is_published: true,
      is_hidden: false,
    },
  ],
  paging: {
    cursors: {
      after: 'MTAxNTExOTQ1MjAwNzI5NDE=',
      before: 'NDMyNzQyODI3OTQw',
    },
    next: 'https://graph.facebook.com/v19.0/123456789/feed?limit=100&after=MTAxNTExOTQ1MjAwNzI5NDE=',
  },
}

/**
 * Sample page insights with complete metrics
 */
export const samplePageInsights: PageInsights = {
  page_impressions: 85000,
  page_impressions_unique: 62000,
  page_impressions_organic: 55000,
  page_impressions_paid: 30000,
  page_engaged_users: 4200,
  page_post_engagements: 8500,
  page_views_total: 12500,
  page_fans: 15420,
  page_fan_adds: 320,
  page_fan_removes: 85,
  page_actions_post_reactions_total: {
    like: 3200,
    love: 850,
    wow: 250,
    haha: 180,
    sad: 45,
    angry: 20,
  },
  daily_impressions: [
    { date: '2025-01-15T00:00:00+0000', value: 3200 },
    { date: '2025-01-14T00:00:00+0000', value: 2950 },
    { date: '2025-01-13T00:00:00+0000', value: 3100 },
  ],
  daily_engaged_users: [
    { date: '2025-01-15T00:00:00+0000', value: 160 },
    { date: '2025-01-14T00:00:00+0000', value: 145 },
    { date: '2025-01-13T00:00:00+0000', value: 152 },
  ],
  daily_fan_adds: [
    { date: '2025-01-15T00:00:00+0000', value: 12 },
    { date: '2025-01-14T00:00:00+0000', value: 8 },
    { date: '2025-01-13T00:00:00+0000', value: 15 },
  ],
  daily_fan_removes: [
    { date: '2025-01-15T00:00:00+0000', value: 3 },
    { date: '2025-01-14T00:00:00+0000', value: 2 },
    { date: '2025-01-13T00:00:00+0000', value: 4 },
  ],
  period_start: '2024-12-18T00:00:00+0000',
  period_end: '2025-01-15T00:00:00+0000',
  fetched_at: '2025-01-15T12:00:00+0000',
}
