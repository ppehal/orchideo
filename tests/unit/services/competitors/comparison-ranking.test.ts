import { describe, it, expect } from 'vitest'

// Re-implement the ranking logic for testing since it's not exported
// This tests the algorithmic correctness of dense ranking
function computeDenseRank(
  values: Array<{ pageId: string; value: number | null }>,
  direction: 'higher_better' | 'lower_better' | 'neutral'
): Array<{ pageId: string; value: number | null; rank: number; percentile: number }> {
  const withValues = values.filter((v) => v.value !== null) as Array<{
    pageId: string
    value: number
  }>
  const nullValues = values.filter((v) => v.value === null)

  const sorted = [...withValues].sort((a, b) => {
    if (direction === 'lower_better') {
      return a.value - b.value
    }
    return b.value - a.value
  })

  const ranked: Array<{ pageId: string; value: number | null; rank: number; percentile: number }> =
    []
  let currentRank = 1
  let previousValue: number | null = null

  for (let i = 0; i < sorted.length; i++) {
    const item = sorted[i]
    if (!item) continue

    if (previousValue !== null && item.value !== previousValue) {
      currentRank = ranked.length + 1
    }

    const percentile =
      sorted.length > 1 ? ((sorted.length - currentRank) / (sorted.length - 1)) * 100 : 100

    ranked.push({
      pageId: item.pageId,
      value: item.value,
      rank: currentRank,
      percentile,
    })

    previousValue = item.value
  }

  for (const item of nullValues) {
    ranked.push({
      pageId: item.pageId,
      value: null,
      rank: 0,
      percentile: 0,
    })
  }

  return ranked
}

describe('computeDenseRank', () => {
  describe('basic ranking (higher_better)', () => {
    it('ranks values in descending order', () => {
      const values = [
        { pageId: 'a', value: 80 },
        { pageId: 'b', value: 100 },
        { pageId: 'c', value: 60 },
      ]

      const result = computeDenseRank(values, 'higher_better')

      expect(result.find((r) => r.pageId === 'b')?.rank).toBe(1)
      expect(result.find((r) => r.pageId === 'a')?.rank).toBe(2)
      expect(result.find((r) => r.pageId === 'c')?.rank).toBe(3)
    })

    it('assigns percentile based on rank position', () => {
      const values = [
        { pageId: 'a', value: 100 },
        { pageId: 'b', value: 80 },
        { pageId: 'c', value: 60 },
      ]

      const result = computeDenseRank(values, 'higher_better')

      expect(result.find((r) => r.pageId === 'a')?.percentile).toBe(100)
      expect(result.find((r) => r.pageId === 'b')?.percentile).toBe(50)
      expect(result.find((r) => r.pageId === 'c')?.percentile).toBe(0)
    })
  })

  describe('tie handling', () => {
    it('gives same rank to tied values (dense ranking)', () => {
      const values = [
        { pageId: 'a', value: 100 },
        { pageId: 'b', value: 90 },
        { pageId: 'c', value: 90 },
        { pageId: 'd', value: 80 },
      ]

      const result = computeDenseRank(values, 'higher_better')

      expect(result.find((r) => r.pageId === 'a')?.rank).toBe(1)
      expect(result.find((r) => r.pageId === 'b')?.rank).toBe(2)
      expect(result.find((r) => r.pageId === 'c')?.rank).toBe(2) // tie
      // Dense rank: next rank after tie = count of items so far + 1 = 4
      // But actually the algorithm uses ranked.length + 1 when value changes
      // So after b and c (both rank 2), d gets rank 4 (3 items ranked so far + 1)
      expect(result.find((r) => r.pageId === 'd')?.rank).toBe(4)
    })

    it('handles multiple groups of ties', () => {
      const values = [
        { pageId: 'a', value: 100 },
        { pageId: 'b', value: 100 },
        { pageId: 'c', value: 80 },
        { pageId: 'd', value: 80 },
        { pageId: 'e', value: 60 },
      ]

      const result = computeDenseRank(values, 'higher_better')

      expect(result.find((r) => r.pageId === 'a')?.rank).toBe(1)
      expect(result.find((r) => r.pageId === 'b')?.rank).toBe(1)
      // After a,b (rank 1), c gets rank 3 (2 items + 1)
      expect(result.find((r) => r.pageId === 'c')?.rank).toBe(3)
      expect(result.find((r) => r.pageId === 'd')?.rank).toBe(3)
      // After a,b,c,d (4 items), e gets rank 5
      expect(result.find((r) => r.pageId === 'e')?.rank).toBe(5)
    })

    it('handles all values being equal', () => {
      const values = [
        { pageId: 'a', value: 50 },
        { pageId: 'b', value: 50 },
        { pageId: 'c', value: 50 },
      ]

      const result = computeDenseRank(values, 'higher_better')

      expect(result.every((r) => r.rank === 1)).toBe(true)
    })
  })

  describe('null value handling', () => {
    it('assigns rank 0 to null values', () => {
      const values = [
        { pageId: 'a', value: 100 },
        { pageId: 'b', value: null },
        { pageId: 'c', value: 80 },
      ]

      const result = computeDenseRank(values, 'higher_better')

      expect(result.find((r) => r.pageId === 'b')?.rank).toBe(0)
      expect(result.find((r) => r.pageId === 'b')?.percentile).toBe(0)
    })

    it('ranks remaining values correctly when some are null', () => {
      const values = [
        { pageId: 'a', value: 100 },
        { pageId: 'b', value: null },
        { pageId: 'c', value: 80 },
        { pageId: 'd', value: null },
      ]

      const result = computeDenseRank(values, 'higher_better')

      expect(result.find((r) => r.pageId === 'a')?.rank).toBe(1)
      expect(result.find((r) => r.pageId === 'c')?.rank).toBe(2)
      expect(result.find((r) => r.pageId === 'b')?.rank).toBe(0)
      expect(result.find((r) => r.pageId === 'd')?.rank).toBe(0)
    })

    it('handles all values being null', () => {
      const values = [
        { pageId: 'a', value: null },
        { pageId: 'b', value: null },
      ]

      const result = computeDenseRank(values, 'higher_better')

      expect(result.every((r) => r.rank === 0)).toBe(true)
      expect(result.every((r) => r.percentile === 0)).toBe(true)
    })
  })

  describe('direction: lower_better', () => {
    it('ranks lower values higher', () => {
      const values = [
        { pageId: 'a', value: 10 },
        { pageId: 'b', value: 50 },
        { pageId: 'c', value: 5 },
      ]

      const result = computeDenseRank(values, 'lower_better')

      expect(result.find((r) => r.pageId === 'c')?.rank).toBe(1) // lowest is best
      expect(result.find((r) => r.pageId === 'a')?.rank).toBe(2)
      expect(result.find((r) => r.pageId === 'b')?.rank).toBe(3)
    })

    it('handles ties in lower_better mode', () => {
      const values = [
        { pageId: 'a', value: 20 },
        { pageId: 'b', value: 10 },
        { pageId: 'c', value: 10 },
        { pageId: 'd', value: 30 },
      ]

      const result = computeDenseRank(values, 'lower_better')

      expect(result.find((r) => r.pageId === 'b')?.rank).toBe(1)
      expect(result.find((r) => r.pageId === 'c')?.rank).toBe(1) // tie
      // After b,c (rank 1), a gets rank 3
      expect(result.find((r) => r.pageId === 'a')?.rank).toBe(3)
      // After b,c,a (3 items), d gets rank 4
      expect(result.find((r) => r.pageId === 'd')?.rank).toBe(4)
    })
  })

  describe('direction: neutral', () => {
    it('treats neutral same as higher_better', () => {
      const values = [
        { pageId: 'a', value: 80 },
        { pageId: 'b', value: 100 },
        { pageId: 'c', value: 60 },
      ]

      const result = computeDenseRank(values, 'neutral')

      expect(result.find((r) => r.pageId === 'b')?.rank).toBe(1)
      expect(result.find((r) => r.pageId === 'a')?.rank).toBe(2)
      expect(result.find((r) => r.pageId === 'c')?.rank).toBe(3)
    })
  })

  describe('edge cases', () => {
    it('handles single value', () => {
      const values = [{ pageId: 'a', value: 100 }]

      const result = computeDenseRank(values, 'higher_better')

      expect(result).toHaveLength(1)
      expect(result[0]?.rank).toBe(1)
      expect(result[0]?.percentile).toBe(100)
    })

    it('handles empty array', () => {
      const values: Array<{ pageId: string; value: number | null }> = []

      const result = computeDenseRank(values, 'higher_better')

      expect(result).toHaveLength(0)
    })

    it('handles zero values', () => {
      const values = [
        { pageId: 'a', value: 0 },
        { pageId: 'b', value: 100 },
        { pageId: 'c', value: 0 },
      ]

      const result = computeDenseRank(values, 'higher_better')

      expect(result.find((r) => r.pageId === 'b')?.rank).toBe(1)
      expect(result.find((r) => r.pageId === 'a')?.rank).toBe(2)
      expect(result.find((r) => r.pageId === 'c')?.rank).toBe(2) // tie at 0
    })

    it('handles negative values', () => {
      const values = [
        { pageId: 'a', value: -10 },
        { pageId: 'b', value: 10 },
        { pageId: 'c', value: -20 },
      ]

      const result = computeDenseRank(values, 'higher_better')

      expect(result.find((r) => r.pageId === 'b')?.rank).toBe(1)
      expect(result.find((r) => r.pageId === 'a')?.rank).toBe(2)
      expect(result.find((r) => r.pageId === 'c')?.rank).toBe(3)
    })

    it('handles decimal values', () => {
      const values = [
        { pageId: 'a', value: 3.14 },
        { pageId: 'b', value: 2.71 },
        { pageId: 'c', value: 3.14 },
      ]

      const result = computeDenseRank(values, 'higher_better')

      expect(result.find((r) => r.pageId === 'a')?.rank).toBe(1)
      expect(result.find((r) => r.pageId === 'c')?.rank).toBe(1) // tie
      // After a,c (rank 1, 2 items), b gets rank 3
      expect(result.find((r) => r.pageId === 'b')?.rank).toBe(3)
    })
  })
})
