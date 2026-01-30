import { describe, it, expect } from 'vitest'
import { sampleTriggerInput } from '../../fixtures/sample-analysis-data'

// Import all triggers to ensure they're registered
import '@/lib/triggers/rules'
import { getAllTriggers } from '@/lib/triggers/registry'
import { CATEGORY_WEIGHTS } from '@/lib/triggers/types'

describe('All Triggers', () => {
  const triggers = getAllTriggers()

  it('should have exactly 27 triggers registered', () => {
    expect(triggers).toHaveLength(27)
  })

  it('should have correct number of triggers per category', () => {
    const byCategory = {
      BASIC: triggers.filter((t) => t.category === 'BASIC'),
      CONTENT: triggers.filter((t) => t.category === 'CONTENT'),
      TECHNICAL: triggers.filter((t) => t.category === 'TECHNICAL'),
      TIMING: triggers.filter((t) => t.category === 'TIMING'),
      SHARING: triggers.filter((t) => t.category === 'SHARING'),
      PAGE_SETTINGS: triggers.filter((t) => t.category === 'PAGE_SETTINGS'),
    }

    expect(byCategory.BASIC).toHaveLength(5)
    expect(byCategory.CONTENT).toHaveLength(6)
    expect(byCategory.TECHNICAL).toHaveLength(7)
    expect(byCategory.TIMING).toHaveLength(3)
    expect(byCategory.SHARING).toHaveLength(4)
    expect(byCategory.PAGE_SETTINGS).toHaveLength(2)
  })

  it('should have unique trigger IDs', () => {
    const ids = triggers.map((t) => t.id)
    const uniqueIds = new Set(ids)
    expect(uniqueIds.size).toBe(ids.length)
  })

  it('should all have required properties', () => {
    for (const trigger of triggers) {
      expect(trigger.id).toBeDefined()
      expect(trigger.name).toBeDefined()
      expect(trigger.description).toBeDefined()
      expect(trigger.category).toBeDefined()
      expect(trigger.evaluate).toBeInstanceOf(Function)
    }
  })

  it('should all return valid evaluations for sample input', () => {
    for (const trigger of triggers) {
      const result = trigger.evaluate(sampleTriggerInput)

      expect(result.id).toBe(trigger.id)
      expect(result.name).toBe(trigger.name)
      expect(result.category).toBe(trigger.category)
      expect(result.score).toBeGreaterThanOrEqual(0)
      expect(result.score).toBeLessThanOrEqual(100)
      expect(['EXCELLENT', 'GOOD', 'NEEDS_IMPROVEMENT', 'CRITICAL']).toContain(result.status)
    }
  })

  it('should never throw exceptions', () => {
    for (const trigger of triggers) {
      expect(() => trigger.evaluate(sampleTriggerInput)).not.toThrow()
    }
  })

  it('should have category weights summing to 1.0', () => {
    const totalWeight = Object.values(CATEGORY_WEIGHTS).reduce((sum, w) => sum + w, 0)
    expect(totalWeight).toBeCloseTo(1.0, 5)
  })

  describe('Trigger ID naming conventions', () => {
    it('BASIC triggers should have BASIC_XXX format', () => {
      const basicTriggers = triggers.filter((t) => t.category === 'BASIC')
      for (const trigger of basicTriggers) {
        expect(trigger.id).toMatch(/^BASIC_\d{3}$/)
      }
    })

    it('CONTENT triggers should have CONT_XXX format', () => {
      const contentTriggers = triggers.filter((t) => t.category === 'CONTENT')
      for (const trigger of contentTriggers) {
        expect(trigger.id).toMatch(/^CONT_\d{3}$/)
      }
    })

    it('TECHNICAL triggers should have TECH_XXX format', () => {
      const techTriggers = triggers.filter((t) => t.category === 'TECHNICAL')
      for (const trigger of techTriggers) {
        expect(trigger.id).toMatch(/^TECH_\d{3}$/)
      }
    })

    it('TIMING triggers should have TIME_XXX format', () => {
      const timingTriggers = triggers.filter((t) => t.category === 'TIMING')
      for (const trigger of timingTriggers) {
        expect(trigger.id).toMatch(/^TIME_\d{3}$/)
      }
    })

    it('SHARING triggers should have SHARE_XXX format', () => {
      const sharingTriggers = triggers.filter((t) => t.category === 'SHARING')
      for (const trigger of sharingTriggers) {
        expect(trigger.id).toMatch(/^SHARE_\d{3}$/)
      }
    })

    it('PAGE_SETTINGS triggers should have PAGE_XXX format', () => {
      const pageTriggers = triggers.filter((t) => t.category === 'PAGE_SETTINGS')
      for (const trigger of pageTriggers) {
        expect(trigger.id).toMatch(/^PAGE_\d{3}$/)
      }
    })
  })
})
