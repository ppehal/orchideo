import { describe, it, expect } from 'vitest'
import {
  getStatus,
  createFallbackEvaluation,
  formatPercent,
  normalizeScore,
  calculateAverageScore,
  calculateCategoryScore,
  calculateOverallScore,
  calculatePercentage,
  scoreFromPercentage,
  formatNumber,
} from '@/lib/triggers/utils'
import type { TriggerEvaluation } from '@/lib/triggers/types'

// Helper to create minimal TriggerEvaluation for testing
function createTriggerEvaluation(overrides: Partial<TriggerEvaluation> = {}): TriggerEvaluation {
  return {
    id: 'TEST_001',
    name: 'Test Trigger',
    description: 'Test Description',
    category: 'BASIC',
    score: 50,
    status: 'NEEDS_IMPROVEMENT',
    ...overrides,
  }
}

describe('Trigger Utils', () => {
  describe('getStatus', () => {
    it('returns EXCELLENT for scores >= 85', () => {
      expect(getStatus(85)).toBe('EXCELLENT')
      expect(getStatus(90)).toBe('EXCELLENT')
      expect(getStatus(100)).toBe('EXCELLENT')
    })

    it('returns GOOD for scores 70-84', () => {
      expect(getStatus(70)).toBe('GOOD')
      expect(getStatus(75)).toBe('GOOD')
      expect(getStatus(84)).toBe('GOOD')
    })

    it('returns NEEDS_IMPROVEMENT for scores 40-69', () => {
      expect(getStatus(40)).toBe('NEEDS_IMPROVEMENT')
      expect(getStatus(50)).toBe('NEEDS_IMPROVEMENT')
      expect(getStatus(69)).toBe('NEEDS_IMPROVEMENT')
    })

    it('returns CRITICAL for scores < 40', () => {
      expect(getStatus(0)).toBe('CRITICAL')
      expect(getStatus(20)).toBe('CRITICAL')
      expect(getStatus(39)).toBe('CRITICAL')
    })

    describe('boundary values', () => {
      it.each([
        [39.4, 'CRITICAL'],
        [39.5, 'CRITICAL'],
        [39.9, 'CRITICAL'],
        [40, 'NEEDS_IMPROVEMENT'],
        [69.4, 'NEEDS_IMPROVEMENT'],
        [69.5, 'NEEDS_IMPROVEMENT'],
        [69.9, 'NEEDS_IMPROVEMENT'],
        [70, 'GOOD'],
        [84.4, 'GOOD'],
        [84.5, 'GOOD'],
        [84.9, 'GOOD'],
        [85, 'EXCELLENT'],
      ] as const)('score %d returns status %s', (score, expected) => {
        expect(getStatus(score)).toBe(expected)
      })
    })

    it('handles negative scores as CRITICAL', () => {
      expect(getStatus(-10)).toBe('CRITICAL')
      expect(getStatus(-1)).toBe('CRITICAL')
    })

    it('handles scores above 100 as EXCELLENT', () => {
      expect(getStatus(101)).toBe('EXCELLENT')
      expect(getStatus(150)).toBe('EXCELLENT')
    })
  })

  describe('formatPercent', () => {
    it('formats percentage correctly', () => {
      expect(formatPercent(50, 0)).toBe('50%')
      expect(formatPercent(33.333, 1)).toBe('33.3%')
      expect(formatPercent(0, 0)).toBe('0%')
      expect(formatPercent(100, 0)).toBe('100%')
    })
  })

  describe('createFallbackEvaluation', () => {
    it('creates fallback evaluation with INSUFFICIENT_DATA reason', () => {
      const result = createFallbackEvaluation(
        'TEST_001',
        'Test Trigger',
        'Test Description',
        'BASIC',
        'INSUFFICIENT_DATA',
        'Not enough data'
      )

      expect(result.id).toBe('TEST_001')
      expect(result.name).toBe('Test Trigger')
      expect(result.score).toBe(50)
      expect(result.status).toBe('NEEDS_IMPROVEMENT')
      expect(result.details?.reason).toBe('INSUFFICIENT_DATA')
      expect(result.details?.context).toBe('Not enough data')
    })

    it('creates fallback evaluation with METRIC_UNAVAILABLE reason', () => {
      const result = createFallbackEvaluation(
        'TEST_002',
        'Test Trigger 2',
        'Test Description 2',
        'TECHNICAL',
        'METRIC_UNAVAILABLE',
        'Metric not available'
      )

      expect(result.details?.reason).toBe('METRIC_UNAVAILABLE')
    })

    it('creates fallback evaluation with NOT_APPLICABLE reason', () => {
      const result = createFallbackEvaluation(
        'TEST_003',
        'Test Trigger 3',
        'Test Description 3',
        'CONTENT',
        'NOT_APPLICABLE'
      )

      expect(result.details?.reason).toBe('NOT_APPLICABLE')
      expect(result.details?.context).toBe('Tento trigger není pro tuto stránku relevantní')
    })

    it('uses default context when not provided', () => {
      const result = createFallbackEvaluation(
        'TEST_004',
        'Test Trigger 4',
        'Test Description 4',
        'SHARING',
        'INSUFFICIENT_DATA'
      )

      expect(result.details?.context).toBe('Nedostatek dat pro přesné vyhodnocení')
    })
  })

  describe('normalizeScore', () => {
    it('normalizes value within range to 0-100 scale', () => {
      expect(normalizeScore(50, 0, 100)).toBe(50)
      expect(normalizeScore(0, 0, 100)).toBe(0)
      expect(normalizeScore(100, 0, 100)).toBe(100)
    })

    it('handles custom min/max ranges', () => {
      expect(normalizeScore(5, 0, 10)).toBe(50)
      expect(normalizeScore(25, 0, 50)).toBe(50)
      expect(normalizeScore(75, 50, 100)).toBe(50)
    })

    it('clamps values below minimum to 0', () => {
      expect(normalizeScore(-10, 0, 100)).toBe(0)
      expect(normalizeScore(0, 10, 100)).toBe(0)
    })

    it('clamps values above maximum to 100', () => {
      expect(normalizeScore(150, 0, 100)).toBe(100)
      expect(normalizeScore(110, 0, 100)).toBe(100)
    })

    it('inverts score when invert=true', () => {
      expect(normalizeScore(0, 0, 100, true)).toBe(100)
      expect(normalizeScore(100, 0, 100, true)).toBe(0)
      expect(normalizeScore(25, 0, 100, true)).toBe(75)
      expect(normalizeScore(75, 0, 100, true)).toBe(25)
    })

    it('rounds result to integer', () => {
      expect(normalizeScore(33, 0, 100)).toBe(33)
      expect(normalizeScore(1, 0, 3)).toBe(33) // 33.33... rounded
    })
  })

  describe('calculateAverageScore', () => {
    it('calculates average score correctly', () => {
      const triggers = [
        createTriggerEvaluation({ score: 80 }),
        createTriggerEvaluation({ score: 60 }),
        createTriggerEvaluation({ score: 100 }),
      ]
      expect(calculateAverageScore(triggers)).toBe(80)
    })

    it('returns 0 for empty array', () => {
      expect(calculateAverageScore([])).toBe(0)
    })

    it('handles single trigger', () => {
      const triggers = [createTriggerEvaluation({ score: 75 })]
      expect(calculateAverageScore(triggers)).toBe(75)
    })

    it('rounds result to integer', () => {
      const triggers = [
        createTriggerEvaluation({ score: 33 }),
        createTriggerEvaluation({ score: 33 }),
        createTriggerEvaluation({ score: 34 }),
      ]
      expect(calculateAverageScore(triggers)).toBe(33) // 33.33... rounded
    })
  })

  describe('calculateCategoryScore', () => {
    it('calculates average for triggers in category', () => {
      const triggers = [
        createTriggerEvaluation({ category: 'BASIC', score: 80 }),
        createTriggerEvaluation({ category: 'BASIC', score: 60 }),
        createTriggerEvaluation({ category: 'CONTENT', score: 90 }),
      ]
      expect(calculateCategoryScore(triggers, 'BASIC')).toBe(70)
    })

    it('returns 0 when no triggers in category', () => {
      const triggers = [createTriggerEvaluation({ category: 'CONTENT', score: 80 })]
      expect(calculateCategoryScore(triggers, 'BASIC')).toBe(0)
    })

    it('handles all categories correctly', () => {
      const triggers = [
        createTriggerEvaluation({ category: 'BASIC', score: 80 }),
        createTriggerEvaluation({ category: 'CONTENT', score: 70 }),
        createTriggerEvaluation({ category: 'TECHNICAL', score: 60 }),
        createTriggerEvaluation({ category: 'TIMING', score: 50 }),
        createTriggerEvaluation({ category: 'SHARING', score: 40 }),
        createTriggerEvaluation({ category: 'PAGE_SETTINGS', score: 30 }),
      ]
      expect(calculateCategoryScore(triggers, 'BASIC')).toBe(80)
      expect(calculateCategoryScore(triggers, 'CONTENT')).toBe(70)
      expect(calculateCategoryScore(triggers, 'TECHNICAL')).toBe(60)
      expect(calculateCategoryScore(triggers, 'TIMING')).toBe(50)
      expect(calculateCategoryScore(triggers, 'SHARING')).toBe(40)
      expect(calculateCategoryScore(triggers, 'PAGE_SETTINGS')).toBe(30)
    })
  })

  describe('calculateOverallScore', () => {
    it('returns 0 for empty triggers array', () => {
      expect(calculateOverallScore([])).toBe(0)
    })

    it('calculates weighted average based on category weights', () => {
      // BASIC: 0.35, CONTENT: 0.30, TECHNICAL: 0.20, TIMING: 0.05, SHARING: 0.05, PAGE_SETTINGS: 0.05
      const triggers = [
        createTriggerEvaluation({ category: 'BASIC', score: 100 }),
        createTriggerEvaluation({ category: 'CONTENT', score: 100 }),
        createTriggerEvaluation({ category: 'TECHNICAL', score: 100 }),
        createTriggerEvaluation({ category: 'TIMING', score: 100 }),
        createTriggerEvaluation({ category: 'SHARING', score: 100 }),
        createTriggerEvaluation({ category: 'PAGE_SETTINGS', score: 100 }),
      ]
      expect(calculateOverallScore(triggers)).toBe(100)
    })

    it('applies category weights correctly', () => {
      // Only BASIC (0.35 weight) at 100, should result in 100
      const triggers = [createTriggerEvaluation({ category: 'BASIC', score: 100 })]
      expect(calculateOverallScore(triggers)).toBe(100)
    })

    it('calculates weighted average with mixed scores', () => {
      // BASIC: 80 * 0.35 = 28
      // CONTENT: 60 * 0.30 = 18
      // Total weight: 0.65
      // Score: (28 + 18) / 0.65 = 70.77 -> 71
      const triggers = [
        createTriggerEvaluation({ category: 'BASIC', score: 80 }),
        createTriggerEvaluation({ category: 'CONTENT', score: 60 }),
      ]
      expect(calculateOverallScore(triggers)).toBe(71)
    })

    it('handles multiple triggers in same category', () => {
      // BASIC avg: (80 + 60) / 2 = 70, weighted: 70 * 0.35 = 24.5
      // CONTENT: 90 * 0.30 = 27
      // Total weight: 0.65
      // Score: (24.5 + 27) / 0.65 = 79.23 -> 79
      const triggers = [
        createTriggerEvaluation({ category: 'BASIC', score: 80 }),
        createTriggerEvaluation({ category: 'BASIC', score: 60 }),
        createTriggerEvaluation({ category: 'CONTENT', score: 90 }),
      ]
      expect(calculateOverallScore(triggers)).toBe(79)
    })

    it('handles all zero scores', () => {
      const triggers = [
        createTriggerEvaluation({ category: 'BASIC', score: 0 }),
        createTriggerEvaluation({ category: 'CONTENT', score: 0 }),
      ]
      expect(calculateOverallScore(triggers)).toBe(0)
    })
  })

  describe('calculatePercentage', () => {
    it('calculates percentage of matching items', () => {
      const items = [{ value: 10 }, { value: 20 }, { value: 30 }, { value: 40 }]
      const result = calculatePercentage(items, (item) => (item.value as number) > 25)
      expect(result).toBe(50) // 2 of 4
    })

    it('returns 0 for empty array', () => {
      expect(calculatePercentage([], () => true)).toBe(0)
    })

    it('returns 100 when all match', () => {
      const items = [{ active: true }, { active: true }]
      expect(calculatePercentage(items, (item) => item.active === true)).toBe(100)
    })

    it('returns 0 when none match', () => {
      const items = [{ active: false }, { active: false }]
      expect(calculatePercentage(items, (item) => item.active === true)).toBe(0)
    })

    it('rounds result to integer', () => {
      const items = [{ v: 1 }, { v: 2 }, { v: 3 }]
      expect(calculatePercentage(items, (item) => (item.v as number) === 1)).toBe(33) // 33.33...
    })
  })

  describe('scoreFromPercentage', () => {
    const thresholds = {
      excellent: 80,
      good: 60,
      needsImprovement: 40,
    }

    it('returns 95 for excellent percentage', () => {
      expect(scoreFromPercentage(80, thresholds)).toBe(95)
      expect(scoreFromPercentage(90, thresholds)).toBe(95)
      expect(scoreFromPercentage(100, thresholds)).toBe(95)
    })

    it('returns 80 for good percentage', () => {
      expect(scoreFromPercentage(60, thresholds)).toBe(80)
      expect(scoreFromPercentage(70, thresholds)).toBe(80)
      expect(scoreFromPercentage(79, thresholds)).toBe(80)
    })

    it('returns 55 for needs improvement percentage', () => {
      expect(scoreFromPercentage(40, thresholds)).toBe(55)
      expect(scoreFromPercentage(50, thresholds)).toBe(55)
      expect(scoreFromPercentage(59, thresholds)).toBe(55)
    })

    it('returns 30 for critical percentage', () => {
      expect(scoreFromPercentage(0, thresholds)).toBe(30)
      expect(scoreFromPercentage(20, thresholds)).toBe(30)
      expect(scoreFromPercentage(39, thresholds)).toBe(30)
    })

    it('inverts when invert=true (lower is better)', () => {
      // 20% -> inverted to 80% -> excellent
      expect(scoreFromPercentage(20, thresholds, true)).toBe(95)
      // 80% -> inverted to 20% -> critical
      expect(scoreFromPercentage(80, thresholds, true)).toBe(30)
    })

    it('handles boundary values correctly', () => {
      expect(scoreFromPercentage(79.9, thresholds)).toBe(80) // just below excellent
      expect(scoreFromPercentage(59.9, thresholds)).toBe(55) // just below good
      expect(scoreFromPercentage(39.9, thresholds)).toBe(30) // just below needs improvement
    })
  })

  describe('formatNumber', () => {
    it('formats number with Czech locale', () => {
      // Czech uses space as thousand separator
      expect(formatNumber(1000)).toMatch(/1\s?000/)
      expect(formatNumber(1000000)).toMatch(/1\s?000\s?000/)
    })

    it('handles zero', () => {
      expect(formatNumber(0)).toBe('0')
    })

    it('handles negative numbers', () => {
      expect(formatNumber(-1000)).toMatch(/-1\s?000/)
    })

    it('handles decimal numbers', () => {
      const result = formatNumber(1234.56)
      expect(result).toContain('1')
      expect(result).toContain('234')
    })
  })
})
