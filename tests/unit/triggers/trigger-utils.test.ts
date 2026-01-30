import { describe, it, expect } from 'vitest'
import { getStatus, createFallbackEvaluation, formatPercent } from '@/lib/triggers/utils'

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
  })
})
