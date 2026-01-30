import { describe, it, expect } from 'vitest'
import { sampleTriggerInput, samplePageData } from '../../fixtures/sample-analysis-data'
import type { TriggerInput } from '@/lib/triggers/types'

// Import triggers to ensure they're registered
import '@/lib/triggers/rules/page-settings'
import { getAllTriggers } from '@/lib/triggers/registry'

describe('PAGE_SETTINGS Triggers', () => {
  const triggers = getAllTriggers()
  const pageTriggers = triggers.filter((t) => t.category === 'PAGE_SETTINGS')

  describe('PAGE_001 - Profilová fotka', () => {
    const trigger = pageTriggers.find((t) => t.id === 'PAGE_001')

    it('should be registered', () => {
      expect(trigger).toBeDefined()
    })

    it('should evaluate profile picture', () => {
      const input: TriggerInput = {
        ...sampleTriggerInput,
        pageData: {
          ...samplePageData,
          picture_url: 'https://example.com/profile.jpg',
        },
      }

      const result = trigger!.evaluate(input)
      expect(result.score).toBeGreaterThanOrEqual(0)
      expect(result.score).toBeLessThanOrEqual(100)
    })

    it('should handle missing picture', () => {
      const input: TriggerInput = {
        ...sampleTriggerInput,
        pageData: {
          ...samplePageData,
          picture_url: null,
        },
      }

      const result = trigger!.evaluate(input)
      expect(result.score).toBeGreaterThanOrEqual(0)
      expect(result.score).toBeLessThanOrEqual(100)
    })
  })

  describe('PAGE_002 - Cover fotka', () => {
    const trigger = pageTriggers.find((t) => t.id === 'PAGE_002')

    it('should be registered', () => {
      expect(trigger).toBeDefined()
    })

    it('should check cover photo exists', () => {
      const result = trigger!.evaluate(sampleTriggerInput)

      expect(result.id).toBe('PAGE_002')
      expect(result.score).toBeGreaterThanOrEqual(0)
    })

    it('should handle missing cover photo', () => {
      const input: TriggerInput = {
        ...sampleTriggerInput,
        pageData: {
          ...samplePageData,
          cover_url: null,
        },
      }

      const result = trigger!.evaluate(input)
      expect(result.score).toBeGreaterThanOrEqual(0)
      expect(result.score).toBeLessThanOrEqual(100)
    })
  })

  describe('All PAGE_SETTINGS triggers', () => {
    it('should have 2 triggers registered', () => {
      expect(pageTriggers).toHaveLength(2)
    })

    it('should all return valid evaluations', () => {
      for (const trigger of pageTriggers) {
        const result = trigger.evaluate(sampleTriggerInput)

        expect(result.id).toBeDefined()
        expect(result.name).toBeDefined()
        expect(result.category).toBe('PAGE_SETTINGS')
        expect(result.score).toBeGreaterThanOrEqual(0)
        expect(result.score).toBeLessThanOrEqual(100)
      }
    })
  })
})
