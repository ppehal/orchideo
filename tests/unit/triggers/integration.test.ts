import { describe, it, expect, beforeAll } from 'vitest'
import { evaluateAll, evaluateCategory } from '@/lib/triggers/engine'
import {
  sampleTriggerInput,
  minimalTriggerInput,
  noInsightsTriggerInput,
  createPost,
  samplePageData,
  sampleBenchmark,
  sampleInsights,
  generateSamplePosts,
} from '../../fixtures/sample-analysis-data'
import type { TriggerInput } from '@/lib/triggers/types'
import { getAllTriggers } from '@/lib/triggers/registry'

// Import all triggers to ensure they're registered
import '@/lib/triggers/rules'

describe('Trigger Engine Integration Tests', () => {
  beforeAll(() => {
    // Ensure triggers are registered
    const count = getAllTriggers().length
    expect(count).toBeGreaterThan(20)
  })

  describe('Real-world Excellent Page', () => {
    it('evaluates excellent page data and produces high score', () => {
      const excellentInput: TriggerInput = {
        pageData: {
          ...samplePageData,
          fan_count: 10000,
          picture_url: 'https://example.com/profile.jpg',
          cover_url: 'https://example.com/cover.jpg',
        },
        posts90d: Array(80)
          .fill(null)
          .map((_, i) => {
            const date = new Date()
            date.setDate(date.getDate() - Math.floor((i / 80) * 90))

            return createPost({
              created_time: date,
              total_engagement: 150 + Math.floor(Math.random() * 100),
              reactions_count: 120 + Math.floor(Math.random() * 80),
              comments_count: 20 + Math.floor(Math.random() * 15),
              shares_count: 10 + Math.floor(Math.random() * 10),
              has_media: true,
              media_type: i % 3 === 0 ? 'video' : 'image',
              emoji_count: 3,
              has_double_line_breaks: true,
              has_emoji_bullets: i % 2 === 0,
              message_length: 120,
              type: i % 5 === 0 ? 'video' : 'photo',
            })
          }),
        insights28d: {
          ...sampleInsights,
          page_engaged_users: 8000,
          page_post_engagements: 10000,
          page_fans: 10000,
        },
        industryBenchmark: sampleBenchmark,
      }

      const result = evaluateAll(excellentInput)

      // Excellent page should score well
      expect(result.overallScore).toBeGreaterThanOrEqual(40)
      expect(result.errors.length).toBe(0)

      // All evaluations should be valid
      result.evaluations.forEach((e) => {
        expect(e.score).toBeGreaterThanOrEqual(0)
        expect(e.score).toBeLessThanOrEqual(100)
        expect(['EXCELLENT', 'GOOD', 'NEEDS_IMPROVEMENT', 'CRITICAL']).toContain(e.status)
      })

      // Category scores should be reasonable
      expect(result.categoryScores.BASIC).toBeGreaterThan(0)
      expect(result.categoryScores.CONTENT).toBeGreaterThan(0)
    })
  })

  describe('Real-world Poor Page', () => {
    it('evaluates poor page data and identifies issues', () => {
      const poorInput: TriggerInput = {
        pageData: {
          ...samplePageData,
          fan_count: 500,
          picture_url: null,
          cover_url: null,
        },
        posts90d: Array(8)
          .fill(null)
          .map((_, i) => {
            const date = new Date()
            date.setDate(date.getDate() - i * 15) // Infrequent posting

            return createPost({
              created_time: date,
              total_engagement: 2 + Math.floor(Math.random() * 3),
              reactions_count: 1 + Math.floor(Math.random() * 2),
              comments_count: 0,
              shares_count: 0,
              message: 'Koupit teď!!! Sleva pouze dnes! Akce! Cena od 99 Kč!!!',
              message_length: 55,
              has_media: false,
              media_type: 'none',
              emoji_count: 0,
              type: 'status',
            })
          }),
        insights28d: {
          ...sampleInsights,
          page_engaged_users: 50,
          page_post_engagements: 30,
          page_fans: 500,
          page_fan_adds: 5,
          page_fan_removes: 10,
        },
        industryBenchmark: sampleBenchmark,
      }

      const result = evaluateAll(poorInput)

      // Poor page should have lower score
      expect(result.overallScore).toBeLessThan(100)

      // Should identify specific issues
      const criticalTriggers = result.evaluations.filter((e) => e.status === 'CRITICAL')
      const needsImprovementTriggers = result.evaluations.filter(
        (e) => e.status === 'NEEDS_IMPROVEMENT'
      )

      expect(criticalTriggers.length + needsImprovementTriggers.length).toBeGreaterThan(0)

      // Should have recommendations
      const withRecommendations = result.evaluations.filter((e) => e.recommendation)
      expect(withRecommendations.length).toBeGreaterThan(0)
    })
  })

  describe('Real-world New Page', () => {
    it('handles minimal data gracefully for new pages', () => {
      const newPageInput: TriggerInput = {
        pageData: {
          ...samplePageData,
          fan_count: 50,
          picture_url: 'https://example.com/profile.jpg',
          cover_url: null,
        },
        posts90d: [
          createPost({
            created_time: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
            total_engagement: 5,
          }),
          createPost({
            created_time: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
            total_engagement: 8,
          }),
        ],
        insights28d: null,
        industryBenchmark: sampleBenchmark,
      }

      const result = evaluateAll(newPageInput)

      // Should complete without errors
      expect(result.evaluations.length).toBeGreaterThan(0)
      expect(result.overallScore).toBeGreaterThanOrEqual(0)

      // Should have many fallback evaluations due to insufficient data
      const insufficientData = result.evaluations.filter(
        (e) => e.details?.reason === 'INSUFFICIENT_DATA'
      )
      expect(insufficientData.length).toBeGreaterThan(0)

      // Should have some metric unavailable
      const metricUnavailable = result.evaluations.filter(
        (e) => e.details?.reason === 'METRIC_UNAVAILABLE'
      )
      expect(metricUnavailable.length).toBeGreaterThan(0)
    })
  })

  describe('Concurrent Evaluations', () => {
    it('handles multiple concurrent evaluations safely', async () => {
      const inputs: TriggerInput[] = [
        sampleTriggerInput,
        minimalTriggerInput,
        noInsightsTriggerInput,
        {
          ...sampleTriggerInput,
          posts90d: generateSamplePosts(100),
        },
        {
          ...sampleTriggerInput,
          posts90d: generateSamplePosts(10),
        },
      ]

      const promises = inputs.map((input) => Promise.resolve(evaluateAll(input)))

      const results = await Promise.all(promises)

      expect(results.length).toBe(5)

      results.forEach((result) => {
        expect(result.evaluations.length).toBeGreaterThan(0)
        expect(result.overallScore).toBeGreaterThanOrEqual(0)
        expect(result.overallScore).toBeLessThanOrEqual(100)
        expect(result.evaluatedAt).toBeInstanceOf(Date)
      })
    })

    it('handles concurrent category evaluations', async () => {
      const categories = [
        'BASIC',
        'CONTENT',
        'TECHNICAL',
        'TIMING',
        'SHARING',
        'PAGE_SETTINGS',
      ] as const

      const promises = categories.map((category) =>
        Promise.resolve(evaluateCategory(sampleTriggerInput, category))
      )

      const results = await Promise.all(promises)

      expect(results.length).toBe(6)

      results.forEach((evaluations, idx) => {
        evaluations.forEach((e) => {
          expect(e.category).toBe(categories[idx])
          expect(e.score).toBeGreaterThanOrEqual(0)
          expect(e.score).toBeLessThanOrEqual(100)
        })
      })
    })
  })

  describe('Edge Cases', () => {
    it('handles empty posts array', () => {
      const emptyPostsInput: TriggerInput = {
        ...sampleTriggerInput,
        posts90d: [],
      }

      const result = evaluateAll(emptyPostsInput)

      expect(result.evaluations.length).toBeGreaterThan(0)
      expect(result.overallScore).toBeGreaterThanOrEqual(0)

      // Should have fallback evaluations
      const fallbacks = result.evaluations.filter((e) => e.details?.reason)
      expect(fallbacks.length).toBeGreaterThan(0)
    })

    it('handles posts without engagement data', () => {
      const noEngagementInput: TriggerInput = {
        ...sampleTriggerInput,
        posts90d: Array(20)
          .fill(null)
          .map(() =>
            createPost({
              reactions_count: 0,
              comments_count: 0,
              shares_count: 0,
              total_engagement: 0,
            })
          ),
      }

      const result = evaluateAll(noEngagementInput)

      expect(result.evaluations.length).toBeGreaterThan(0)
      // Low engagement should result in lower scores
      expect(result.overallScore).toBeLessThan(100)
    })

    it('handles posts with extreme values', () => {
      const extremeInput: TriggerInput = {
        ...sampleTriggerInput,
        posts90d: [
          createPost({
            total_engagement: 10000,
            reactions_count: 8000,
            comments_count: 1500,
            shares_count: 500,
          }),
          createPost({
            total_engagement: 0,
            reactions_count: 0,
            comments_count: 0,
            shares_count: 0,
          }),
        ],
      }

      const result = evaluateAll(extremeInput)

      expect(result.evaluations.length).toBeGreaterThan(0)
      expect(result.overallScore).toBeGreaterThanOrEqual(0)
      expect(result.overallScore).toBeLessThanOrEqual(100)
    })

    it('handles very old posts (90+ days)', () => {
      const oldPostsInput: TriggerInput = {
        ...sampleTriggerInput,
        posts90d: Array(10)
          .fill(null)
          .map((_, i) => {
            const date = new Date()
            date.setDate(date.getDate() - (90 + i))
            return createPost({ created_time: date })
          }),
      }

      const result = evaluateAll(oldPostsInput)

      expect(result.evaluations.length).toBeGreaterThan(0)
      expect(result.overallScore).toBeGreaterThanOrEqual(0)
    })

    it('handles null/undefined values in posts', () => {
      const nullValuesInput: TriggerInput = {
        ...sampleTriggerInput,
        posts90d: Array(20)
          .fill(null)
          .map(() =>
            createPost({
              impressions: null,
              impressions_organic: null,
              impressions_paid: null,
              reach: null,
              clicks: null,
            })
          ),
      }

      const result = evaluateAll(nullValuesInput)

      expect(result.evaluations.length).toBeGreaterThan(0)
      expect(result.overallScore).toBeGreaterThanOrEqual(0)
    })
  })

  describe('Stress Tests', () => {
    it('handles large number of posts (500+)', () => {
      const largeInput: TriggerInput = {
        ...sampleTriggerInput,
        posts90d: generateSamplePosts(500),
      }

      const result = evaluateAll(largeInput)

      expect(result.evaluations.length).toBeGreaterThan(0)
      expect(result.overallScore).toBeGreaterThanOrEqual(0)
      expect(result.overallScore).toBeLessThanOrEqual(100)
    })

    it('handles repeated evaluations on same input', () => {
      const results: number[] = []

      for (let i = 0; i < 10; i++) {
        const result = evaluateAll(sampleTriggerInput)
        results.push(result.overallScore)
      }

      // All results should be identical (deterministic)
      const uniqueScores = new Set(results)
      expect(uniqueScores.size).toBe(1)
    })
  })

  describe('Error Recovery', () => {
    it('continues evaluation even if some triggers fail', () => {
      // This test assumes that even with bad data, the engine should
      // produce fallback evaluations and not crash
      const badInput: TriggerInput = {
        pageData: {
          ...samplePageData,
          // @ts-expect-error - Testing runtime resilience
          fan_count: 'invalid',
        },
        posts90d: sampleTriggerInput.posts90d,
        insights28d: sampleTriggerInput.insights28d,
        industryBenchmark: sampleBenchmark,
      }

      // Should not throw, should handle gracefully
      const result = evaluateAll(badInput)

      expect(result.evaluations.length).toBeGreaterThan(0)
      // May have errors recorded
      expect(Array.isArray(result.errors)).toBe(true)
    })
  })

  describe('Category-Specific Integration', () => {
    it('BASIC category evaluates correctly', () => {
      const result = evaluateCategory(sampleTriggerInput, 'BASIC')

      expect(result.length).toBeGreaterThan(0)
      result.forEach((e) => {
        expect(e.category).toBe('BASIC')
        expect(e.id).toMatch(/^BASIC_/)
      })
    })

    it('CONTENT category evaluates correctly', () => {
      const result = evaluateCategory(sampleTriggerInput, 'CONTENT')

      expect(result.length).toBeGreaterThan(0)
      result.forEach((e) => {
        expect(e.category).toBe('CONTENT')
        expect(e.id).toMatch(/^CONT_/)
      })
    })

    it('TECHNICAL category evaluates correctly', () => {
      const result = evaluateCategory(sampleTriggerInput, 'TECHNICAL')

      expect(result.length).toBeGreaterThan(0)
      result.forEach((e) => {
        expect(e.category).toBe('TECHNICAL')
        expect(e.id).toMatch(/^TECH_/)
      })
    })

    it('TIMING category evaluates correctly', () => {
      const result = evaluateCategory(sampleTriggerInput, 'TIMING')

      expect(result.length).toBeGreaterThan(0)
      result.forEach((e) => {
        expect(e.category).toBe('TIMING')
        expect(e.id).toMatch(/^TIME_/)
      })
    })
  })
})
