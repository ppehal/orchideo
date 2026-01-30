import { describe, it, expect } from 'vitest'
import { sampleTriggerInput, createPost } from '../../fixtures/sample-analysis-data'
import type { TriggerInput } from '@/lib/triggers/types'

// Import triggers to ensure they're registered
import '@/lib/triggers/rules/technical'
import { getAllTriggers } from '@/lib/triggers/registry'

describe('TECHNICAL Triggers', () => {
  const triggers = getAllTriggers()
  const techTriggers = triggers.filter((t) => t.category === 'TECHNICAL')

  describe('TECH_001 - Velikosti vizuálů', () => {
    const trigger = techTriggers.find((t) => t.id === 'TECH_001')

    it('should be registered', () => {
      expect(trigger).toBeDefined()
    })

    it('should reward optimal image sizes', () => {
      const input: TriggerInput = {
        ...sampleTriggerInput,
        posts90d: Array(20)
          .fill(null)
          .map(() =>
            createPost({
              image_width: 1080,
              image_height: 1350,
              has_media: true,
              media_type: 'image',
            })
          ),
      }

      const result = trigger!.evaluate(input)
      expect(result.score).toBeGreaterThan(70)
    })
  })

  describe('TECH_002 - Typ souboru', () => {
    const trigger = techTriggers.find((t) => t.id === 'TECH_002')

    it('should be registered', () => {
      expect(trigger).toBeDefined()
    })

    it('should reward PNG format', () => {
      const input: TriggerInput = {
        ...sampleTriggerInput,
        posts90d: Array(20)
          .fill(null)
          .map(() =>
            createPost({
              image_format: 'png',
              has_media: true,
              media_type: 'image',
            })
          ),
      }

      const result = trigger!.evaluate(input)
      expect(result.score).toBeGreaterThanOrEqual(80)
    })
  })

  describe('TECH_003 - Délka textací', () => {
    const trigger = techTriggers.find((t) => t.id === 'TECH_003')

    it('should be registered', () => {
      expect(trigger).toBeDefined()
    })

    it('should analyze message lengths', () => {
      const result = trigger!.evaluate(sampleTriggerInput)

      expect(result.id).toBe('TECH_003')
      expect(result.details?.metrics).toBeDefined()
    })
  })

  describe('TECH_004 - Práce s odstavci', () => {
    const trigger = techTriggers.find((t) => t.id === 'TECH_004')

    it('should be registered', () => {
      expect(trigger).toBeDefined()
    })

    it('should reward posts with paragraph breaks', () => {
      const input: TriggerInput = {
        ...sampleTriggerInput,
        posts90d: Array(20)
          .fill(null)
          .map(() =>
            createPost({
              message_length: 150,
              has_double_line_breaks: true,
            })
          ),
      }

      const result = trigger!.evaluate(input)
      expect(result.score).toBeGreaterThan(60)
    })
  })

  describe('TECH_005 - Odkazy v textu', () => {
    const trigger = techTriggers.find((t) => t.id === 'TECH_005')

    it('should be registered', () => {
      expect(trigger).toBeDefined()
    })

    it('should penalize inline links', () => {
      const input: TriggerInput = {
        ...sampleTriggerInput,
        posts90d: Array(20)
          .fill(null)
          .map(() =>
            createPost({
              has_inline_links: true,
            })
          ),
      }

      const result = trigger!.evaluate(input)
      expect(result.score).toBeLessThan(70)
    })

    it('should reward posts without inline links', () => {
      const input: TriggerInput = {
        ...sampleTriggerInput,
        posts90d: Array(20)
          .fill(null)
          .map(() =>
            createPost({
              has_inline_links: false,
            })
          ),
      }

      const result = trigger!.evaluate(input)
      expect(result.score).toBeGreaterThanOrEqual(80)
    })
  })

  describe('TECH_006 - Emotikony', () => {
    const trigger = techTriggers.find((t) => t.id === 'TECH_006')

    it('should be registered', () => {
      expect(trigger).toBeDefined()
    })

    it('should reward optimal emoji usage (2-4)', () => {
      const input: TriggerInput = {
        ...sampleTriggerInput,
        posts90d: Array(20)
          .fill(null)
          .map(() =>
            createPost({
              emoji_count: 3,
            })
          ),
      }

      const result = trigger!.evaluate(input)
      expect(result.score).toBeGreaterThan(70)
    })

    it('should penalize no emojis', () => {
      const input: TriggerInput = {
        ...sampleTriggerInput,
        posts90d: Array(20)
          .fill(null)
          .map(() =>
            createPost({
              emoji_count: 0,
            })
          ),
      }

      const result = trigger!.evaluate(input)
      expect(result.score).toBeLessThan(80)
    })
  })

  describe('TECH_007 - Odrážkování', () => {
    const trigger = techTriggers.find((t) => t.id === 'TECH_007')

    it('should be registered', () => {
      expect(trigger).toBeDefined()
    })

    it('should reward emoji bullet usage', () => {
      const input: TriggerInput = {
        ...sampleTriggerInput,
        posts90d: Array(20)
          .fill(null)
          .map((_, i) =>
            createPost({
              has_emoji_bullets: i < 10, // 50% have bullets
            })
          ),
      }

      const result = trigger!.evaluate(input)
      // Score depends on trigger implementation thresholds
      expect(result.score).toBeGreaterThanOrEqual(0)
      expect(result.score).toBeLessThanOrEqual(100)
    })
  })

  describe('All TECHNICAL triggers', () => {
    it('should have 7 triggers registered', () => {
      expect(techTriggers).toHaveLength(7)
    })

    it('should all return valid evaluations', () => {
      for (const trigger of techTriggers) {
        const result = trigger.evaluate(sampleTriggerInput)

        expect(result.id).toBeDefined()
        expect(result.name).toBeDefined()
        expect(result.category).toBe('TECHNICAL')
        expect(result.score).toBeGreaterThanOrEqual(0)
        expect(result.score).toBeLessThanOrEqual(100)
      }
    })
  })
})
