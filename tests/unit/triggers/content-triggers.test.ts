import { describe, it, expect } from 'vitest'
import {
  sampleTriggerInput,
  minimalTriggerInput,
  createPost,
} from '../../fixtures/sample-analysis-data'
import type { TriggerInput } from '@/lib/triggers/types'

// Import triggers to ensure they're registered
import '@/lib/triggers/rules/content'
import { getAllTriggers } from '@/lib/triggers/registry'

describe('CONTENT Triggers', () => {
  const triggers = getAllTriggers()
  const contentTriggers = triggers.filter((t) => t.category === 'CONTENT')

  describe('CONT_001 - Obsahový mix', () => {
    const trigger = contentTriggers.find((t) => t.id === 'CONT_001')

    it('should be registered', () => {
      expect(trigger).toBeDefined()
    })

    it('should return valid evaluation', () => {
      const result = trigger!.evaluate(sampleTriggerInput)

      expect(result.id).toBe('CONT_001')
      expect(result.category).toBe('CONTENT')
      expect(result.score).toBeGreaterThanOrEqual(0)
      expect(result.score).toBeLessThanOrEqual(100)
    })

    it('should penalize too much sales content', () => {
      const input: TriggerInput = {
        ...sampleTriggerInput,
        posts90d: Array(20)
          .fill(null)
          .map(() =>
            createPost({
              message: 'Koupit teď! Sleva 50%! Akce pouze dnes! Cena od 199 Kč',
            })
          ),
      }

      const result = trigger!.evaluate(input)
      expect(result.score).toBeLessThan(85)
      expect(result.recommendation).toBeDefined()
    })
  })

  describe('CONT_002 - Nejsilnější posty', () => {
    const trigger = contentTriggers.find((t) => t.id === 'CONT_002')

    it('should be registered', () => {
      expect(trigger).toBeDefined()
    })

    it('should identify top performing posts', () => {
      const result = trigger!.evaluate(sampleTriggerInput)

      expect(result.id).toBe('CONT_002')
      expect(result.details?.metrics).toBeDefined()
    })
  })

  describe('CONT_003 - Nejslabší posty', () => {
    const trigger = contentTriggers.find((t) => t.id === 'CONT_003')

    it('should be registered', () => {
      expect(trigger).toBeDefined()
    })

    it('should handle insufficient data', () => {
      const result = trigger!.evaluate(minimalTriggerInput)

      expect(result.details?.reason).toBe('INSUFFICIENT_DATA')
    })
  })

  describe('CONT_004 - Promované posty', () => {
    const trigger = contentTriggers.find((t) => t.id === 'CONT_004')

    it('should be registered', () => {
      expect(trigger).toBeDefined()
    })

    it('should handle missing paid impressions data', () => {
      const input: TriggerInput = {
        ...sampleTriggerInput,
        insights28d: null,
        posts90d: sampleTriggerInput.posts90d.map((p) => ({
          ...p,
          impressions_paid: null,
        })),
      }

      const result = trigger!.evaluate(input)
      expect(result.details?.reason).toBe('METRIC_UNAVAILABLE')
    })
  })

  describe('CONT_005 - Formáty příspěvků', () => {
    const trigger = contentTriggers.find((t) => t.id === 'CONT_005')

    it('should be registered', () => {
      expect(trigger).toBeDefined()
    })

    it('should reward diverse content formats', () => {
      const diverseInput: TriggerInput = {
        ...sampleTriggerInput,
        posts90d: [
          ...Array(10)
            .fill(null)
            .map(() => createPost({ type: 'photo' })),
          ...Array(8)
            .fill(null)
            .map(() => createPost({ type: 'video' })),
          ...Array(5)
            .fill(null)
            .map(() => createPost({ type: 'reel', is_reel: true })),
          ...Array(4)
            .fill(null)
            .map(() => createPost({ type: 'link' })),
          ...Array(3)
            .fill(null)
            .map(() => createPost({ type: 'status', has_media: false, media_type: 'none' })),
        ],
      }

      const result = trigger!.evaluate(diverseInput)
      expect(result.score).toBeGreaterThan(60)
    })
  })

  describe('CONT_006 - Prokliky dle formátu', () => {
    const trigger = contentTriggers.find((t) => t.id === 'CONT_006')

    it('should be registered', () => {
      expect(trigger).toBeDefined()
    })

    it('should use engagement proxy when clicks unavailable', () => {
      const result = trigger!.evaluate(sampleTriggerInput)

      expect(result.id).toBe('CONT_006')
      // When clicks data is not available, it uses engagement proxy
      expect(result.details?.metrics).toBeDefined()
    })
  })

  describe('All CONTENT triggers', () => {
    it('should have 6 triggers registered', () => {
      expect(contentTriggers).toHaveLength(6)
    })

    it('should all return valid evaluations', () => {
      for (const trigger of contentTriggers) {
        const result = trigger.evaluate(sampleTriggerInput)

        expect(result.id).toBeDefined()
        expect(result.name).toBeDefined()
        expect(result.category).toBe('CONTENT')
        expect(result.score).toBeGreaterThanOrEqual(0)
        expect(result.score).toBeLessThanOrEqual(100)
      }
    })
  })
})
