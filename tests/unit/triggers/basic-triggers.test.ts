import { describe, it, expect } from 'vitest'
import {
  sampleTriggerInput,
  minimalTriggerInput,
  createPost,
} from '../../fixtures/sample-analysis-data'
import type { TriggerInput } from '@/lib/triggers/types'

// Import triggers to ensure they're registered
import '@/lib/triggers/rules/basic'
import { getAllTriggers } from '@/lib/triggers/registry'

describe('BASIC Triggers', () => {
  const triggers = getAllTriggers()
  const basicTriggers = triggers.filter((t) => t.category === 'BASIC')

  describe('BASIC_001 - Interakce/post/follower', () => {
    const trigger = basicTriggers.find((t) => t.id === 'BASIC_001')

    it('should be registered', () => {
      expect(trigger).toBeDefined()
    })

    it('should return valid evaluation for normal input', () => {
      const result = trigger!.evaluate(sampleTriggerInput)

      expect(result.id).toBe('BASIC_001')
      expect(result.category).toBe('BASIC')
      expect(result.score).toBeGreaterThanOrEqual(0)
      expect(result.score).toBeLessThanOrEqual(100)
      expect(['EXCELLENT', 'GOOD', 'NEEDS_IMPROVEMENT', 'CRITICAL']).toContain(result.status)
    })

    it('should handle insufficient data gracefully', () => {
      const result = trigger!.evaluate(minimalTriggerInput)

      expect(result.score).toBeGreaterThanOrEqual(0)
      expect(result.details?.reason).toBeDefined()
    })
  })

  describe('BASIC_002 - Struktura interakcí', () => {
    const trigger = basicTriggers.find((t) => t.id === 'BASIC_002')

    it('should be registered', () => {
      expect(trigger).toBeDefined()
    })

    it('should return valid evaluation', () => {
      const result = trigger!.evaluate(sampleTriggerInput)

      expect(result.id).toBe('BASIC_002')
      expect(result.score).toBeGreaterThanOrEqual(0)
      expect(result.score).toBeLessThanOrEqual(100)
    })
  })

  describe('BASIC_003 - Struktura reakcí', () => {
    const trigger = basicTriggers.find((t) => t.id === 'BASIC_003')

    it('should be registered', () => {
      expect(trigger).toBeDefined()
    })

    it('should penalize too many likes (>90%)', () => {
      const input: TriggerInput = {
        ...sampleTriggerInput,
        posts90d: Array(20)
          .fill(null)
          .map(() =>
            createPost({
              reaction_like: 95,
              reaction_love: 2,
              reaction_wow: 1,
              reaction_haha: 1,
              reaction_sad: 0,
              reaction_angry: 1,
              reactions_count: 100,
            })
          ),
      }

      const result = trigger!.evaluate(input)
      expect(result.score).toBeLessThan(85) // Should not be EXCELLENT
    })
  })

  describe('BASIC_004 - Kvalita nových fanoušků', () => {
    const trigger = basicTriggers.find((t) => t.id === 'BASIC_004')

    it('should be registered', () => {
      expect(trigger).toBeDefined()
    })

    it('should return valid evaluation with insights', () => {
      const result = trigger!.evaluate(sampleTriggerInput)

      expect(result.id).toBe('BASIC_004')
      expect(result.score).toBeGreaterThanOrEqual(0)
    })

    it('should handle missing insights', () => {
      const input: TriggerInput = {
        ...sampleTriggerInput,
        insights28d: null,
      }

      const result = trigger!.evaluate(input)
      expect(result.details?.reason).toBeDefined()
    })
  })

  describe('BASIC_005 - Kvalita současných fanoušků', () => {
    const trigger = basicTriggers.find((t) => t.id === 'BASIC_005')

    it('should be registered', () => {
      expect(trigger).toBeDefined()
    })

    it('should return valid evaluation', () => {
      const result = trigger!.evaluate(sampleTriggerInput)

      expect(result.id).toBe('BASIC_005')
      expect(result.score).toBeGreaterThanOrEqual(0)
      expect(result.score).toBeLessThanOrEqual(100)
    })
  })

  describe('All BASIC triggers', () => {
    it('should have 5 triggers registered', () => {
      expect(basicTriggers).toHaveLength(5)
    })

    it('should all return valid evaluations', () => {
      for (const trigger of basicTriggers) {
        const result = trigger.evaluate(sampleTriggerInput)

        expect(result.id).toBeDefined()
        expect(result.name).toBeDefined()
        expect(result.category).toBe('BASIC')
        expect(result.score).toBeGreaterThanOrEqual(0)
        expect(result.score).toBeLessThanOrEqual(100)
        expect(['EXCELLENT', 'GOOD', 'NEEDS_IMPROVEMENT', 'CRITICAL']).toContain(result.status)
      }
    })
  })
})
