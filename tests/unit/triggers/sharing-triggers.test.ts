import { describe, it, expect } from 'vitest'
import { sampleTriggerInput, createPost } from '../../fixtures/sample-analysis-data'
import type { TriggerInput } from '@/lib/triggers/types'

// Import triggers to ensure they're registered
import '@/lib/triggers/rules/sharing'
import { getAllTriggers } from '@/lib/triggers/registry'

describe('SHARING Triggers', () => {
  const triggers = getAllTriggers()
  const sharingTriggers = triggers.filter((t) => t.category === 'SHARING')

  describe('SHARE_001 - Sdílené příspěvky', () => {
    const trigger = sharingTriggers.find((t) => t.id === 'SHARE_001')

    it('should be registered', () => {
      expect(trigger).toBeDefined()
    })

    it('should reward low shared content ratio', () => {
      const input: TriggerInput = {
        ...sampleTriggerInput,
        posts90d: Array(20)
          .fill(null)
          .map((_, i) =>
            createPost({
              is_shared_post: i < 2, // Only 10% shared
            })
          ),
      }

      const result = trigger!.evaluate(input)
      expect(result.score).toBeGreaterThan(80)
    })

    it('should penalize too much shared content', () => {
      const input: TriggerInput = {
        ...sampleTriggerInput,
        posts90d: Array(20)
          .fill(null)
          .map((_, i) =>
            createPost({
              is_shared_post: i < 12, // 60% shared
            })
          ),
      }

      const result = trigger!.evaluate(input)
      expect(result.score).toBeLessThan(50)
    })
  })

  describe('SHARE_002 - YouTube videa', () => {
    const trigger = sharingTriggers.find((t) => t.id === 'SHARE_002')

    it('should be registered', () => {
      expect(trigger).toBeDefined()
    })

    it('should reward no YouTube links', () => {
      const input: TriggerInput = {
        ...sampleTriggerInput,
        posts90d: Array(20)
          .fill(null)
          .map(() =>
            createPost({
              is_youtube_link: false,
            })
          ),
      }

      const result = trigger!.evaluate(input)
      expect(result.score).toBeGreaterThanOrEqual(90)
    })

    it('should penalize heavy YouTube usage', () => {
      const input: TriggerInput = {
        ...sampleTriggerInput,
        posts90d: Array(20)
          .fill(null)
          .map((_, i) =>
            createPost({
              is_youtube_link: i < 10, // 50% YouTube
              type: i < 10 ? 'link' : 'photo',
            })
          ),
      }

      const result = trigger!.evaluate(input)
      expect(result.score).toBeLessThanOrEqual(60) // At or below 60
    })
  })

  describe('SHARE_003 - Reels formát', () => {
    const trigger = sharingTriggers.find((t) => t.id === 'SHARE_003')

    it('should be registered', () => {
      expect(trigger).toBeDefined()
    })

    it('should reward optimal Reels usage (15-30%)', () => {
      const input: TriggerInput = {
        ...sampleTriggerInput,
        posts90d: Array(20)
          .fill(null)
          .map((_, i) =>
            createPost({
              is_reel: i < 5, // 25% Reels
              type: i < 5 ? 'reel' : 'photo',
            })
          ),
      }

      const result = trigger!.evaluate(input)
      expect(result.score).toBeGreaterThan(75)
    })

    it('should encourage Reels when none are used', () => {
      const input: TriggerInput = {
        ...sampleTriggerInput,
        posts90d: Array(20)
          .fill(null)
          .map(() =>
            createPost({
              is_reel: false,
              type: 'photo',
            })
          ),
      }

      const result = trigger!.evaluate(input)
      expect(result.score).toBeLessThanOrEqual(50)
      expect(result.recommendation).toBeDefined()
    })
  })

  describe('SHARE_004 - UTM parametry', () => {
    const trigger = sharingTriggers.find((t) => t.id === 'SHARE_004')

    it('should be registered', () => {
      expect(trigger).toBeDefined()
    })

    it('should reward high UTM usage on link posts', () => {
      const input: TriggerInput = {
        ...sampleTriggerInput,
        posts90d: Array(10)
          .fill(null)
          .map(() =>
            createPost({
              type: 'link',
              has_inline_links: true,
              has_utm_params: true,
              is_youtube_link: false,
              is_shared_post: false,
            })
          ),
      }

      const result = trigger!.evaluate(input)
      expect(result.score).toBeGreaterThan(80)
    })

    it('should handle pages with few link posts', () => {
      const input: TriggerInput = {
        ...sampleTriggerInput,
        posts90d: Array(20)
          .fill(null)
          .map(() =>
            createPost({
              type: 'photo',
              has_inline_links: false,
            })
          ),
      }

      const result = trigger!.evaluate(input)
      expect(result.score).toBe(70) // Neutral score when not enough link posts
    })
  })

  describe('All SHARING triggers', () => {
    it('should have 4 triggers registered', () => {
      expect(sharingTriggers).toHaveLength(4)
    })

    it('should all return valid evaluations', () => {
      for (const trigger of sharingTriggers) {
        const result = trigger.evaluate(sampleTriggerInput)

        expect(result.id).toBeDefined()
        expect(result.name).toBeDefined()
        expect(result.category).toBe('SHARING')
        expect(result.score).toBeGreaterThanOrEqual(0)
        expect(result.score).toBeLessThanOrEqual(100)
      }
    })
  })
})
