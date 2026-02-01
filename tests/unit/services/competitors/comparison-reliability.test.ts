import { describe, it, expect } from 'vitest'

type ComparisonReliability = 'high' | 'medium' | 'low' | 'insufficient'

interface PageMetrics {
  pageId: string
  pageName: string
  isPrimary: boolean
  snapshotDate: string | null
  metrics: Record<string, number | null>
}

interface ComparisonReliabilityInfo {
  level: ComparisonReliability
  pageCount: number
  pagesWithSnapshots: number
  scoringVersionConsistent: boolean
  message: string
}

const SCORING_VERSION = '1.0.0'

// Re-implement assessReliability for testing since it's not exported
function assessReliability(
  pageMetrics: PageMetrics[],
  snapshots: Array<{ scoring_version: string }>
): ComparisonReliabilityInfo {
  const pageCount = pageMetrics.length
  const pagesWithSnapshots = pageMetrics.filter((p) => p.snapshotDate !== null).length
  const scoringVersionConsistent = snapshots.every((s) => s.scoring_version === SCORING_VERSION)

  if (pagesWithSnapshots < 2) {
    return {
      level: 'insufficient',
      pageCount,
      pagesWithSnapshots,
      scoringVersionConsistent,
      message: 'Nedostatek stránek s daty pro porovnání',
    }
  }

  const coverageRatio = pagesWithSnapshots / pageCount

  let level: ComparisonReliability
  let message: string

  if (coverageRatio >= 0.9 && scoringVersionConsistent) {
    level = 'high'
    message = 'Spolehlivé porovnání'
  } else if (coverageRatio >= 0.6) {
    level = 'medium'
    message = 'Částečné porovnání - některé stránky nemají data'
  } else {
    level = 'low'
    message = 'Omezené porovnání - většina stránek nemá data'
  }

  if (!scoringVersionConsistent) {
    message += ' (varování: různé verze algoritmu)'
  }

  return {
    level,
    pageCount,
    pagesWithSnapshots,
    scoringVersionConsistent,
    message,
  }
}

// Helper to create test page metrics
function createPageMetrics(overrides: Partial<PageMetrics> & { pageId: string }): PageMetrics {
  return {
    pageName: 'Test Page',
    isPrimary: false,
    snapshotDate: '2024-01-15T10:00:00Z',
    metrics: {},
    ...overrides,
  }
}

describe('assessReliability', () => {
  describe('insufficient data', () => {
    it('returns insufficient when no pages have snapshots', () => {
      const pages = [
        createPageMetrics({ pageId: 'a', snapshotDate: null }),
        createPageMetrics({ pageId: 'b', snapshotDate: null }),
      ]

      const result = assessReliability(pages, [])

      expect(result.level).toBe('insufficient')
      expect(result.pagesWithSnapshots).toBe(0)
    })

    it('returns insufficient when only 1 page has snapshot', () => {
      const pages = [
        createPageMetrics({ pageId: 'a', snapshotDate: '2024-01-15T10:00:00Z' }),
        createPageMetrics({ pageId: 'b', snapshotDate: null }),
        createPageMetrics({ pageId: 'c', snapshotDate: null }),
      ]

      const result = assessReliability(pages, [{ scoring_version: SCORING_VERSION }])

      expect(result.level).toBe('insufficient')
      expect(result.pagesWithSnapshots).toBe(1)
      expect(result.message).toContain('Nedostatek stránek')
    })
  })

  describe('high reliability', () => {
    it('returns high when coverage >= 90% and versions consistent', () => {
      const pages = [
        createPageMetrics({ pageId: 'a', snapshotDate: '2024-01-15T10:00:00Z' }),
        createPageMetrics({ pageId: 'b', snapshotDate: '2024-01-15T10:00:00Z' }),
        createPageMetrics({ pageId: 'c', snapshotDate: '2024-01-15T10:00:00Z' }),
        createPageMetrics({ pageId: 'd', snapshotDate: '2024-01-15T10:00:00Z' }),
        createPageMetrics({ pageId: 'e', snapshotDate: '2024-01-15T10:00:00Z' }),
        createPageMetrics({ pageId: 'f', snapshotDate: '2024-01-15T10:00:00Z' }),
        createPageMetrics({ pageId: 'g', snapshotDate: '2024-01-15T10:00:00Z' }),
        createPageMetrics({ pageId: 'h', snapshotDate: '2024-01-15T10:00:00Z' }),
        createPageMetrics({ pageId: 'i', snapshotDate: '2024-01-15T10:00:00Z' }),
        createPageMetrics({ pageId: 'j', snapshotDate: null }), // 1 without = 90%
      ]

      const snapshots = pages
        .filter((p) => p.snapshotDate)
        .map(() => ({ scoring_version: SCORING_VERSION }))

      const result = assessReliability(pages, snapshots)

      expect(result.level).toBe('high')
      expect(result.message).toBe('Spolehlivé porovnání')
    })

    it('returns high when 100% coverage and versions consistent', () => {
      const pages = [
        createPageMetrics({ pageId: 'a', snapshotDate: '2024-01-15T10:00:00Z' }),
        createPageMetrics({ pageId: 'b', snapshotDate: '2024-01-15T10:00:00Z' }),
      ]

      const snapshots = [{ scoring_version: SCORING_VERSION }, { scoring_version: SCORING_VERSION }]

      const result = assessReliability(pages, snapshots)

      expect(result.level).toBe('high')
      expect(result.scoringVersionConsistent).toBe(true)
    })
  })

  describe('medium reliability', () => {
    it('returns medium when coverage >= 60% but < 90%', () => {
      // 7/10 = 70%
      const pages = [
        createPageMetrics({ pageId: 'a', snapshotDate: '2024-01-15T10:00:00Z' }),
        createPageMetrics({ pageId: 'b', snapshotDate: '2024-01-15T10:00:00Z' }),
        createPageMetrics({ pageId: 'c', snapshotDate: '2024-01-15T10:00:00Z' }),
        createPageMetrics({ pageId: 'd', snapshotDate: '2024-01-15T10:00:00Z' }),
        createPageMetrics({ pageId: 'e', snapshotDate: '2024-01-15T10:00:00Z' }),
        createPageMetrics({ pageId: 'f', snapshotDate: '2024-01-15T10:00:00Z' }),
        createPageMetrics({ pageId: 'g', snapshotDate: '2024-01-15T10:00:00Z' }),
        createPageMetrics({ pageId: 'h', snapshotDate: null }),
        createPageMetrics({ pageId: 'i', snapshotDate: null }),
        createPageMetrics({ pageId: 'j', snapshotDate: null }),
      ]

      const snapshots = pages
        .filter((p) => p.snapshotDate)
        .map(() => ({ scoring_version: SCORING_VERSION }))

      const result = assessReliability(pages, snapshots)

      expect(result.level).toBe('medium')
      expect(result.message).toContain('Částečné porovnání')
    })

    it('returns medium at exactly 60% coverage', () => {
      // 3/5 = 60%
      const pages = [
        createPageMetrics({ pageId: 'a', snapshotDate: '2024-01-15T10:00:00Z' }),
        createPageMetrics({ pageId: 'b', snapshotDate: '2024-01-15T10:00:00Z' }),
        createPageMetrics({ pageId: 'c', snapshotDate: '2024-01-15T10:00:00Z' }),
        createPageMetrics({ pageId: 'd', snapshotDate: null }),
        createPageMetrics({ pageId: 'e', snapshotDate: null }),
      ]

      const snapshots = pages
        .filter((p) => p.snapshotDate)
        .map(() => ({ scoring_version: SCORING_VERSION }))

      const result = assessReliability(pages, snapshots)

      expect(result.level).toBe('medium')
    })
  })

  describe('low reliability', () => {
    it('returns low when coverage < 60%', () => {
      // 2/5 = 40%
      const pages = [
        createPageMetrics({ pageId: 'a', snapshotDate: '2024-01-15T10:00:00Z' }),
        createPageMetrics({ pageId: 'b', snapshotDate: '2024-01-15T10:00:00Z' }),
        createPageMetrics({ pageId: 'c', snapshotDate: null }),
        createPageMetrics({ pageId: 'd', snapshotDate: null }),
        createPageMetrics({ pageId: 'e', snapshotDate: null }),
      ]

      const snapshots = pages
        .filter((p) => p.snapshotDate)
        .map(() => ({ scoring_version: SCORING_VERSION }))

      const result = assessReliability(pages, snapshots)

      expect(result.level).toBe('low')
      expect(result.message).toContain('Omezené porovnání')
    })
  })

  describe('version consistency', () => {
    it('downgrades to medium when versions inconsistent (high -> medium)', () => {
      const pages = [
        createPageMetrics({ pageId: 'a', snapshotDate: '2024-01-15T10:00:00Z' }),
        createPageMetrics({ pageId: 'b', snapshotDate: '2024-01-15T10:00:00Z' }),
      ]

      const snapshots = [
        { scoring_version: SCORING_VERSION },
        { scoring_version: '0.9.0' }, // Different version
      ]

      const result = assessReliability(pages, snapshots)

      expect(result.level).toBe('medium')
      expect(result.scoringVersionConsistent).toBe(false)
      expect(result.message).toContain('různé verze algoritmu')
    })

    it('keeps medium level but adds warning for inconsistent versions', () => {
      // 3/5 = 60% - medium coverage
      const pages = [
        createPageMetrics({ pageId: 'a', snapshotDate: '2024-01-15T10:00:00Z' }),
        createPageMetrics({ pageId: 'b', snapshotDate: '2024-01-15T10:00:00Z' }),
        createPageMetrics({ pageId: 'c', snapshotDate: '2024-01-15T10:00:00Z' }),
        createPageMetrics({ pageId: 'd', snapshotDate: null }),
        createPageMetrics({ pageId: 'e', snapshotDate: null }),
      ]

      const snapshots = [
        { scoring_version: '0.8.0' },
        { scoring_version: '0.9.0' },
        { scoring_version: SCORING_VERSION },
      ]

      const result = assessReliability(pages, snapshots)

      expect(result.level).toBe('medium')
      expect(result.message).toContain('Částečné porovnání')
      expect(result.message).toContain('různé verze algoritmu')
    })

    it('adds warning to low reliability for inconsistent versions', () => {
      const pages = [
        createPageMetrics({ pageId: 'a', snapshotDate: '2024-01-15T10:00:00Z' }),
        createPageMetrics({ pageId: 'b', snapshotDate: '2024-01-15T10:00:00Z' }),
        createPageMetrics({ pageId: 'c', snapshotDate: null }),
        createPageMetrics({ pageId: 'd', snapshotDate: null }),
        createPageMetrics({ pageId: 'e', snapshotDate: null }),
      ]

      const snapshots = [{ scoring_version: '0.9.0' }, { scoring_version: SCORING_VERSION }]

      const result = assessReliability(pages, snapshots)

      expect(result.level).toBe('low')
      expect(result.message).toContain('Omezené porovnání')
      expect(result.message).toContain('různé verze algoritmu')
    })
  })

  describe('edge cases', () => {
    it('handles exactly 2 pages with snapshots (minimum for comparison)', () => {
      const pages = [
        createPageMetrics({ pageId: 'a', snapshotDate: '2024-01-15T10:00:00Z' }),
        createPageMetrics({ pageId: 'b', snapshotDate: '2024-01-15T10:00:00Z' }),
      ]

      const snapshots = [{ scoring_version: SCORING_VERSION }, { scoring_version: SCORING_VERSION }]

      const result = assessReliability(pages, snapshots)

      expect(result.level).toBe('high')
      expect(result.pagesWithSnapshots).toBe(2)
    })

    it('handles empty pages array', () => {
      const result = assessReliability([], [])

      expect(result.level).toBe('insufficient')
      expect(result.pageCount).toBe(0)
      expect(result.pagesWithSnapshots).toBe(0)
    })

    it('handles empty snapshots array with pages that have snapshot dates', () => {
      const pages = [
        createPageMetrics({ pageId: 'a', snapshotDate: '2024-01-15T10:00:00Z' }),
        createPageMetrics({ pageId: 'b', snapshotDate: '2024-01-15T10:00:00Z' }),
      ]

      // Empty snapshots array - all versions are "consistent" (vacuously true)
      const result = assessReliability(pages, [])

      expect(result.level).toBe('high')
      expect(result.scoringVersionConsistent).toBe(true)
    })
  })
})
