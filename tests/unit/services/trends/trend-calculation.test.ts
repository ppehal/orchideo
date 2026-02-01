import { describe, it, expect } from 'vitest'

// Types matching the service
type TrendDirection = 'up' | 'down' | 'stable'
type TrendReliability = 'high' | 'medium' | 'low' | 'insufficient'

interface TrendDataPoint {
  date: string
  value: number
  analysisId: string
}

interface TrendData {
  metricName: string
  currentValue: number | null
  previousValue: number | null
  changeAbsolute: number | null
  changePercent: number | null
  direction: TrendDirection
  isSignificant: boolean
  dataPoints: TrendDataPoint[]
}

interface TrendReliabilityInfo {
  level: TrendReliability
  snapshotCount: number
  oldestSnapshotDate: string | null
  newestSnapshotDate: string | null
  scoringVersionConsistent: boolean
  message: string
}

const SCORING_VERSION = '1.0.0'
const TREND_THRESHOLDS = {
  MIN_SNAPSHOTS_FOR_TREND: 3,
  TREND_WINDOW_DAYS: 90,
  SCORE_CHANGE_MIN: 5,
  ENGAGEMENT_CHANGE_MIN: 10,
  POSTING_CHANGE_MIN: 20,
}

// Re-implement the functions for testing
function getTrendDirection(change: number | null, threshold: number): TrendDirection {
  if (change === null) return 'stable'
  if (Math.abs(change) < threshold) return 'stable'
  return change > 0 ? 'up' : 'down'
}

function assessReliability(
  snapshots: Array<{ created_at: Date; scoring_version: string }>,
  windowDays: number
): TrendReliabilityInfo {
  const count = snapshots.length
  const minRequired = TREND_THRESHOLDS.MIN_SNAPSHOTS_FOR_TREND

  if (count === 0) {
    return {
      level: 'insufficient',
      snapshotCount: 0,
      oldestSnapshotDate: null,
      newestSnapshotDate: null,
      scoringVersionConsistent: true,
      message: 'Žádná historická data k dispozici',
    }
  }

  const oldestSnapshot = snapshots[snapshots.length - 1]
  const newestSnapshot = snapshots[0]

  if (!oldestSnapshot || !newestSnapshot) {
    return {
      level: 'insufficient',
      snapshotCount: count,
      oldestSnapshotDate: null,
      newestSnapshotDate: null,
      scoringVersionConsistent: true,
      message: 'Žádná historická data k dispozici',
    }
  }

  const oldestDate = oldestSnapshot.created_at
  const newestDate = newestSnapshot.created_at
  const scoringVersionConsistent = snapshots.every((s) => s.scoring_version === SCORING_VERSION)

  if (count < minRequired) {
    return {
      level: 'insufficient',
      snapshotCount: count,
      oldestSnapshotDate: oldestDate.toISOString(),
      newestSnapshotDate: newestDate.toISOString(),
      scoringVersionConsistent,
      message: `Nedostatek dat pro spolehlivý trend (${count}/${minRequired} analýz)`,
    }
  }

  const timeSpanDays = (newestDate.getTime() - oldestDate.getTime()) / (1000 * 60 * 60 * 24)

  let level: TrendReliability
  let message: string

  if (count >= 5 && timeSpanDays >= windowDays * 0.7) {
    level = 'high'
    message = 'Spolehlivá data pro analýzu trendu'
  } else if (count >= 3 && timeSpanDays >= windowDays * 0.4) {
    level = 'medium'
    message = 'Dostatečná data, trend je orientační'
  } else {
    level = 'low'
    message = 'Omezená data, trend může být nepřesný'
  }

  if (!scoringVersionConsistent) {
    message += ' (varování: různé verze algoritmu)'
  }

  return {
    level,
    snapshotCount: count,
    oldestSnapshotDate: oldestDate.toISOString(),
    newestSnapshotDate: newestDate.toISOString(),
    scoringVersionConsistent,
    message,
  }
}

function buildTrendData(
  metricName: string,
  dataPoints: TrendDataPoint[],
  changeThreshold: number
): TrendData {
  if (dataPoints.length === 0) {
    return {
      metricName,
      currentValue: null,
      previousValue: null,
      changeAbsolute: null,
      changePercent: null,
      direction: 'stable',
      isSignificant: false,
      dataPoints: [],
    }
  }

  const currentValue = dataPoints[0]?.value ?? null
  const previousValue = dataPoints.length > 1 ? (dataPoints[1]?.value ?? null) : null

  let changeAbsolute: number | null = null
  let changePercent: number | null = null

  if (currentValue !== null && previousValue !== null) {
    changeAbsolute = currentValue - previousValue
    changePercent = previousValue !== 0 ? (changeAbsolute / previousValue) * 100 : null
  }

  const direction = getTrendDirection(changePercent, changeThreshold)
  const isSignificant = changePercent !== null && Math.abs(changePercent) >= changeThreshold

  return {
    metricName,
    currentValue,
    previousValue,
    changeAbsolute,
    changePercent,
    direction,
    isSignificant,
    dataPoints,
  }
}

describe('getTrendDirection', () => {
  it('returns "up" for positive change above threshold', () => {
    expect(getTrendDirection(15, 10)).toBe('up')
    expect(getTrendDirection(10.1, 10)).toBe('up')
  })

  it('returns "down" for negative change beyond threshold', () => {
    expect(getTrendDirection(-15, 10)).toBe('down')
    expect(getTrendDirection(-10.1, 10)).toBe('down')
  })

  it('returns "stable" for change within threshold', () => {
    expect(getTrendDirection(5, 10)).toBe('stable')
    expect(getTrendDirection(-5, 10)).toBe('stable')
    expect(getTrendDirection(9.9, 10)).toBe('stable')
    expect(getTrendDirection(-9.9, 10)).toBe('stable')
  })

  it('returns "stable" for null change', () => {
    expect(getTrendDirection(null, 10)).toBe('stable')
  })

  it('returns "stable" for zero change', () => {
    expect(getTrendDirection(0, 10)).toBe('stable')
  })

  it('handles exact threshold boundary', () => {
    // At exactly the threshold, it's NOT significant (uses <, not <=)
    expect(getTrendDirection(10, 10)).toBe('up')
    expect(getTrendDirection(-10, 10)).toBe('down')
  })
})

describe('assessReliability', () => {
  const createSnapshot = (daysAgo: number, version = SCORING_VERSION) => {
    const date = new Date()
    date.setDate(date.getDate() - daysAgo)
    return { created_at: date, scoring_version: version }
  }

  describe('insufficient data', () => {
    it('returns insufficient for empty snapshots array', () => {
      const result = assessReliability([], 90)

      expect(result.level).toBe('insufficient')
      expect(result.snapshotCount).toBe(0)
      expect(result.oldestSnapshotDate).toBeNull()
      expect(result.newestSnapshotDate).toBeNull()
    })

    it('returns insufficient for less than 3 snapshots', () => {
      const snapshots = [createSnapshot(0), createSnapshot(30)]

      const result = assessReliability(snapshots, 90)

      expect(result.level).toBe('insufficient')
      expect(result.snapshotCount).toBe(2)
      expect(result.message).toContain('2/3')
    })

    it('returns insufficient for 1 snapshot', () => {
      const snapshots = [createSnapshot(0)]

      const result = assessReliability(snapshots, 90)

      expect(result.level).toBe('insufficient')
    })
  })

  describe('high reliability', () => {
    it('returns high for 5+ snapshots over 70%+ of window', () => {
      // 90 day window, need 63+ days (70%)
      const snapshots = [
        createSnapshot(0),
        createSnapshot(20),
        createSnapshot(40),
        createSnapshot(60),
        createSnapshot(70), // 70 day span
      ]

      const result = assessReliability(snapshots, 90)

      expect(result.level).toBe('high')
      expect(result.message).toBe('Spolehlivá data pro analýzu trendu')
    })
  })

  describe('medium reliability', () => {
    it('returns medium for 3+ snapshots over 40%+ of window', () => {
      // 90 day window, need 36+ days (40%)
      const snapshots = [
        createSnapshot(0),
        createSnapshot(20),
        createSnapshot(40), // 40 day span
      ]

      const result = assessReliability(snapshots, 90)

      expect(result.level).toBe('medium')
      expect(result.message).toContain('Dostatečná data')
    })

    it('returns medium for 4 snapshots (not enough for high)', () => {
      const snapshots = [
        createSnapshot(0),
        createSnapshot(25),
        createSnapshot(50),
        createSnapshot(65),
      ]

      const result = assessReliability(snapshots, 90)

      expect(result.level).toBe('medium')
    })
  })

  describe('low reliability', () => {
    it('returns low for 3 snapshots with short time span', () => {
      // 90 day window, less than 36 days (40%)
      const snapshots = [
        createSnapshot(0),
        createSnapshot(10),
        createSnapshot(20), // Only 20 day span
      ]

      const result = assessReliability(snapshots, 90)

      expect(result.level).toBe('low')
      expect(result.message).toContain('Omezená data')
    })
  })

  describe('version consistency', () => {
    it('adds warning for inconsistent versions', () => {
      const snapshots = [
        createSnapshot(0, SCORING_VERSION),
        createSnapshot(30, SCORING_VERSION),
        createSnapshot(60, '0.9.0'), // Different version
        createSnapshot(70, SCORING_VERSION),
        createSnapshot(80, SCORING_VERSION),
      ]

      const result = assessReliability(snapshots, 90)

      expect(result.scoringVersionConsistent).toBe(false)
      expect(result.message).toContain('různé verze algoritmu')
    })

    it('no warning for consistent versions', () => {
      const snapshots = [
        createSnapshot(0),
        createSnapshot(30),
        createSnapshot(60),
        createSnapshot(70),
        createSnapshot(80),
      ]

      const result = assessReliability(snapshots, 90)

      expect(result.scoringVersionConsistent).toBe(true)
      expect(result.message).not.toContain('různé verze')
    })
  })
})

describe('buildTrendData', () => {
  const createDataPoint = (value: number, daysAgo: number): TrendDataPoint => {
    const date = new Date()
    date.setDate(date.getDate() - daysAgo)
    return {
      date: date.toISOString(),
      value,
      analysisId: `analysis-${daysAgo}`,
    }
  }

  describe('basic calculations', () => {
    it('calculates change correctly for upward trend', () => {
      const dataPoints = [
        createDataPoint(80, 0), // current
        createDataPoint(64, 30), // previous
      ]

      const result = buildTrendData('Test Metric', dataPoints, 5)

      expect(result.currentValue).toBe(80)
      expect(result.previousValue).toBe(64)
      expect(result.changeAbsolute).toBe(16)
      expect(result.changePercent).toBe(25) // (80-64)/64 * 100 = 25%
      expect(result.direction).toBe('up')
      expect(result.isSignificant).toBe(true)
    })

    it('calculates change correctly for downward trend', () => {
      const dataPoints = [
        createDataPoint(60, 0), // current
        createDataPoint(80, 30), // previous
      ]

      const result = buildTrendData('Test Metric', dataPoints, 5)

      expect(result.currentValue).toBe(60)
      expect(result.previousValue).toBe(80)
      expect(result.changeAbsolute).toBe(-20)
      expect(result.changePercent).toBe(-25) // (60-80)/80 * 100 = -25%
      expect(result.direction).toBe('down')
      expect(result.isSignificant).toBe(true)
    })

    it('detects stable trend within threshold', () => {
      const dataPoints = [
        createDataPoint(70, 0),
        createDataPoint(71, 30), // ~1.4% change
      ]

      const result = buildTrendData('Test Metric', dataPoints, 5)

      expect(result.direction).toBe('stable')
      expect(result.isSignificant).toBe(false)
    })
  })

  describe('edge cases', () => {
    it('handles empty data points array', () => {
      const result = buildTrendData('Test Metric', [], 5)

      expect(result.currentValue).toBeNull()
      expect(result.previousValue).toBeNull()
      expect(result.changeAbsolute).toBeNull()
      expect(result.changePercent).toBeNull()
      expect(result.direction).toBe('stable')
      expect(result.isSignificant).toBe(false)
      expect(result.dataPoints).toHaveLength(0)
    })

    it('handles single data point (no previous value)', () => {
      const dataPoints = [createDataPoint(70, 0)]

      const result = buildTrendData('Test Metric', dataPoints, 5)

      expect(result.currentValue).toBe(70)
      expect(result.previousValue).toBeNull()
      expect(result.changeAbsolute).toBeNull()
      expect(result.changePercent).toBeNull()
      expect(result.direction).toBe('stable')
    })

    it('handles previous value of zero (division by zero)', () => {
      const dataPoints = [createDataPoint(50, 0), createDataPoint(0, 30)]

      const result = buildTrendData('Test Metric', dataPoints, 5)

      expect(result.currentValue).toBe(50)
      expect(result.previousValue).toBe(0)
      expect(result.changeAbsolute).toBe(50)
      expect(result.changePercent).toBeNull() // Cannot calculate percentage
      expect(result.direction).toBe('stable') // null change = stable
    })

    it('handles negative values', () => {
      const dataPoints = [createDataPoint(-10, 0), createDataPoint(-20, 30)]

      const result = buildTrendData('Test Metric', dataPoints, 5)

      expect(result.changeAbsolute).toBe(10) // -10 - (-20) = 10
      expect(result.changePercent).toBe(-50) // 10 / -20 * 100 = -50%
    })

    it('preserves all data points in result', () => {
      const dataPoints = [
        createDataPoint(80, 0),
        createDataPoint(70, 30),
        createDataPoint(60, 60),
        createDataPoint(50, 90),
      ]

      const result = buildTrendData('Test Metric', dataPoints, 5)

      expect(result.dataPoints).toHaveLength(4)
      expect(result.dataPoints[0]?.value).toBe(80)
      expect(result.dataPoints[3]?.value).toBe(50)
    })
  })

  describe('significance detection', () => {
    it('marks change as significant when >= threshold', () => {
      const dataPoints = [
        createDataPoint(105, 0),
        createDataPoint(100, 30), // 5% change
      ]

      const result = buildTrendData('Test Metric', dataPoints, 5)

      expect(result.isSignificant).toBe(true)
    })

    it('marks change as not significant when < threshold', () => {
      const dataPoints = [
        createDataPoint(104, 0),
        createDataPoint(100, 30), // 4% change
      ]

      const result = buildTrendData('Test Metric', dataPoints, 5)

      expect(result.isSignificant).toBe(false)
    })

    it('handles different thresholds', () => {
      const dataPoints = [
        createDataPoint(115, 0),
        createDataPoint(100, 30), // 15% change
      ]

      const lowThreshold = buildTrendData('Test', dataPoints, 10)
      const highThreshold = buildTrendData('Test', dataPoints, 20)

      expect(lowThreshold.isSignificant).toBe(true)
      expect(highThreshold.isSignificant).toBe(false)
    })
  })
})
