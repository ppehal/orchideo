/**
 * Types for historical trends and alert functionality.
 */

/**
 * Direction of a trend
 */
export type TrendDirection = 'up' | 'down' | 'stable'

/**
 * Reliability level of trend data
 */
export type TrendReliability = 'high' | 'medium' | 'low' | 'insufficient'

/**
 * Single data point in a trend series
 */
export interface TrendDataPoint {
  date: string // ISO date string
  value: number
  analysisId: string
}

/**
 * Trend data for a single metric
 */
export interface TrendData {
  metricName: string
  currentValue: number | null
  previousValue: number | null
  changeAbsolute: number | null
  changePercent: number | null
  direction: TrendDirection
  isSignificant: boolean
  dataPoints: TrendDataPoint[]
}

/**
 * Reliability assessment of trend calculations
 */
export interface TrendReliabilityInfo {
  level: TrendReliability
  snapshotCount: number
  oldestSnapshotDate: string | null
  newestSnapshotDate: string | null
  scoringVersionConsistent: boolean
  message: string
}

/**
 * Full trend response for a page
 */
export interface TrendResponse {
  pageId: string
  pageName: string
  reliability: TrendReliabilityInfo
  trends: {
    overallScore: TrendData
    engagementRate: TrendData
    postsPerWeek: TrendData
    avgReactions: TrendData
    avgComments: TrendData
    avgShares: TrendData
  }
  meta: {
    scoringVersion: string
    benchmarkVersion: string
    calculatedAt: string
  }
}

/**
 * Alert from trend analysis
 */
export interface TrendAlertData {
  id: string
  type: string
  severity: number
  previousValue: number
  currentValue: number
  changePct: number
  message: string
  isRead: boolean
  pageName: string
  pageId: string
  createdAt: string
}

/**
 * Response for user alerts endpoint
 */
export interface UserAlertsResponse {
  alerts: TrendAlertData[]
  unreadCount: number
  total: number
}
