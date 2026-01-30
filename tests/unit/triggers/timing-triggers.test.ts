import { describe, it, expect } from 'vitest'
import {
  sampleTriggerInput,
  minimalTriggerInput,
  createPostsWithHours,
  createPostsWithDays,
} from '../../fixtures/sample-analysis-data'
import type { TriggerInput } from '@/lib/triggers/types'

// Import triggers to ensure they're registered
import '@/lib/triggers/rules/timing'
import { getAllTriggers } from '@/lib/triggers/registry'

describe('TIMING Triggers', () => {
  const triggers = getAllTriggers()
  const timingTriggers = triggers.filter((t) => t.category === 'TIMING')

  describe('TIME_001 - Nejlepší hodiny', () => {
    const trigger = timingTriggers.find((t) => t.id === 'TIME_001')

    it('should be registered', () => {
      expect(trigger).toBeDefined()
    })

    it('should identify best performing hours', () => {
      const input: TriggerInput = {
        ...sampleTriggerInput,
        posts90d: createPostsWithHours([
          9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18,
          19, 20, 21,
        ]),
      }

      const result = trigger!.evaluate(input)

      expect(result.id).toBe('TIME_001')
      expect(result.category).toBe('TIMING')
      expect(result.details?.metrics).toBeDefined()
    })

    it('should handle insufficient data', () => {
      const result = trigger!.evaluate(minimalTriggerInput)

      expect(result.details?.reason).toBe('INSUFFICIENT_DATA')
    })
  })

  describe('TIME_002 - Frekvence postování', () => {
    const trigger = timingTriggers.find((t) => t.id === 'TIME_002')

    it('should be registered', () => {
      expect(trigger).toBeDefined()
    })

    it('should calculate posting frequency', () => {
      const result = trigger!.evaluate(sampleTriggerInput)

      expect(result.id).toBe('TIME_002')
      expect(result.details?.metrics?.postsPerWeek).toBeDefined()
    })

    it('should reward consistent posting', () => {
      const result = trigger!.evaluate(sampleTriggerInput)

      expect(result.score).toBeGreaterThanOrEqual(0)
      expect(result.score).toBeLessThanOrEqual(100)
    })
  })

  describe('TIME_003 - Nejlepší dny', () => {
    const trigger = timingTriggers.find((t) => t.id === 'TIME_003')

    it('should be registered', () => {
      expect(trigger).toBeDefined()
    })

    it('should identify best performing days', () => {
      const input: TriggerInput = {
        ...sampleTriggerInput,
        posts90d: createPostsWithDays([0, 1, 2, 3, 4, 5, 6, 0, 1, 2, 3, 4, 5, 6, 1, 2, 3]),
      }

      const result = trigger!.evaluate(input)

      expect(result.id).toBe('TIME_003')
      expect(result.details?.metrics).toBeDefined()
    })

    it('should handle insufficient data', () => {
      const result = trigger!.evaluate(minimalTriggerInput)

      expect(result.details?.reason).toBe('INSUFFICIENT_DATA')
    })
  })

  describe('All TIMING triggers', () => {
    it('should have 3 triggers registered', () => {
      expect(timingTriggers).toHaveLength(3)
    })

    it('should all return valid evaluations', () => {
      for (const trigger of timingTriggers) {
        const result = trigger.evaluate(sampleTriggerInput)

        expect(result.id).toBeDefined()
        expect(result.name).toBeDefined()
        expect(result.category).toBe('TIMING')
        expect(result.score).toBeGreaterThanOrEqual(0)
        expect(result.score).toBeLessThanOrEqual(100)
      }
    })
  })
})
