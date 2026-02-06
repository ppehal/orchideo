import { createLogger } from '@/lib/logging'
import { FB_API_TIMEOUT_MS } from '@/lib/config/timeouts.server'
import { makeRequest, GRAPH_API_BASE_URL, FacebookApiError } from './client'
import type { FacebookInsightsResponse, FacebookInsight } from './types'

const log = createLogger('facebook-insights')

const INSIGHTS_TIMEOUT_MS = FB_API_TIMEOUT_MS
const INSIGHTS_DAYS = 28

// Metrics that use 'day' period
const DAILY_METRICS = [
  'page_impressions',
  'page_impressions_unique',
  'page_impressions_organic',
  'page_impressions_paid',
  'page_engaged_users',
  'page_post_engagements',
  'page_fan_adds',
  'page_fan_removes',
  'page_views_total',
]

// Metrics that use 'lifetime' period
const LIFETIME_METRICS = ['page_fans']

// Metrics that use 'days_28' period
const PERIOD_28_METRICS = ['page_actions_post_reactions_total']

export interface PageInsights {
  // Aggregated metrics (sum over period)
  page_impressions: number | null
  page_impressions_unique: number | null
  page_impressions_organic: number | null
  page_impressions_paid: number | null
  page_engaged_users: number | null
  page_post_engagements: number | null
  page_views_total: number | null

  // Current values
  page_fans: number | null
  page_fan_adds: number | null
  page_fan_removes: number | null

  // Reaction breakdown
  page_actions_post_reactions_total: Record<string, number> | null

  // Daily values for trend analysis
  daily_impressions: Array<{ date: string; value: number }> | null
  daily_engaged_users: Array<{ date: string; value: number }> | null
  daily_fan_adds: Array<{ date: string; value: number }> | null
  daily_fan_removes: Array<{ date: string; value: number }> | null

  // Metadata
  period_start: string
  period_end: string
  fetched_at: string
}

export interface FetchInsightsOptions {
  daysBack?: number
}

export interface InsightsFetchResult {
  data: PageInsights | null
  error: {
    code: 'PERMISSION_DENIED' | 'NOT_SUPPORTED' | 'RATE_LIMITED' | 'UNKNOWN'
    fbErrorCode?: number
    message: string
    userMessageCz: string
  } | null
}

function sumDailyValues(insight: FacebookInsight): number {
  return insight.values.reduce((sum, v) => {
    if (typeof v.value === 'number') {
      return sum + v.value
    }
    return sum
  }, 0)
}

function extractDailyValues(insight: FacebookInsight): Array<{ date: string; value: number }> {
  return insight.values
    .filter((v) => typeof v.value === 'number' && v.end_time)
    .map((v) => ({
      date: v.end_time!,
      value: v.value as number,
    }))
}

function isReactionBreakdown(value: unknown): value is Record<string, number> {
  if (typeof value !== 'object' || value === null) return false
  return Object.values(value).every((v) => typeof v === 'number')
}

function extractReactionBreakdown(insight: FacebookInsight): Record<string, number> | null {
  const lastValue = insight.values[insight.values.length - 1]
  if (lastValue && isReactionBreakdown(lastValue.value)) {
    return lastValue.value
  }
  return null
}

export async function fetchPageInsights(
  pageId: string,
  accessToken: string,
  options: FetchInsightsOptions = {}
): Promise<InsightsFetchResult> {
  const daysBack = options.daysBack ?? INSIGHTS_DAYS

  const periodEnd = new Date()
  const periodStart = new Date()
  periodStart.setDate(periodStart.getDate() - daysBack)

  const since = Math.floor(periodStart.getTime() / 1000)
  const until = Math.floor(periodEnd.getTime() / 1000)

  log.info({ pageId, daysBack, since, until }, 'Fetching page insights')

  const insights: Partial<PageInsights> = {
    period_start: periodStart.toISOString(),
    period_end: periodEnd.toISOString(),
    fetched_at: new Date().toISOString(),
  }

  try {
    // Fetch daily metrics
    const dailyMetricsUrl = `${GRAPH_API_BASE_URL}/${pageId}/insights?metric=${DAILY_METRICS.join(',')}&period=day&since=${since}&until=${until}`

    const dailyResponse = await makeRequest<FacebookInsightsResponse>(
      dailyMetricsUrl,
      accessToken,
      {
        timeoutMs: INSIGHTS_TIMEOUT_MS,
      }
    )

    for (const metric of dailyResponse.data) {
      switch (metric.name) {
        case 'page_impressions':
          insights.page_impressions = sumDailyValues(metric)
          insights.daily_impressions = extractDailyValues(metric)
          break
        case 'page_impressions_unique':
          insights.page_impressions_unique = sumDailyValues(metric)
          break
        case 'page_impressions_organic':
          insights.page_impressions_organic = sumDailyValues(metric)
          break
        case 'page_impressions_paid':
          insights.page_impressions_paid = sumDailyValues(metric)
          break
        case 'page_engaged_users':
          insights.page_engaged_users = sumDailyValues(metric)
          insights.daily_engaged_users = extractDailyValues(metric)
          break
        case 'page_post_engagements':
          insights.page_post_engagements = sumDailyValues(metric)
          break
        case 'page_fan_adds':
          insights.page_fan_adds = sumDailyValues(metric)
          insights.daily_fan_adds = extractDailyValues(metric)
          break
        case 'page_fan_removes':
          insights.page_fan_removes = sumDailyValues(metric)
          insights.daily_fan_removes = extractDailyValues(metric)
          break
        case 'page_views_total':
          insights.page_views_total = sumDailyValues(metric)
          break
      }
    }

    // Fetch lifetime metrics (page_fans)
    try {
      const lifetimeUrl = `${GRAPH_API_BASE_URL}/${pageId}/insights?metric=${LIFETIME_METRICS.join(',')}&period=day&since=${until - 86400}&until=${until}`

      const lifetimeResponse = await makeRequest<FacebookInsightsResponse>(
        lifetimeUrl,
        accessToken,
        { timeoutMs: INSIGHTS_TIMEOUT_MS }
      )

      for (const metric of lifetimeResponse.data) {
        if (metric.name === 'page_fans') {
          // Get the latest value
          const lastValue = metric.values[metric.values.length - 1]
          if (lastValue && typeof lastValue.value === 'number') {
            insights.page_fans = lastValue.value
          }
        }
      }
    } catch (error) {
      log.debug({ pageId, error }, 'Could not fetch lifetime metrics')
    }

    // Fetch 28-day period metrics (reactions breakdown)
    try {
      const period28Url = `${GRAPH_API_BASE_URL}/${pageId}/insights?metric=${PERIOD_28_METRICS.join(',')}&period=days_28`

      const period28Response = await makeRequest<FacebookInsightsResponse>(
        period28Url,
        accessToken,
        { timeoutMs: INSIGHTS_TIMEOUT_MS }
      )

      for (const metric of period28Response.data) {
        if (metric.name === 'page_actions_post_reactions_total') {
          insights.page_actions_post_reactions_total = extractReactionBreakdown(metric)
        }
      }
    } catch (error) {
      log.debug({ pageId, error }, 'Could not fetch 28-day period metrics')
    }

    log.info(
      {
        pageId,
        impressions: insights.page_impressions,
        engaged_users: insights.page_engaged_users,
        fans: insights.page_fans,
      },
      'Page insights fetched successfully'
    )

    return {
      data: insights as PageInsights,
      error: null,
    }
  } catch (error) {
    if (error instanceof FacebookApiError) {
      // Permission denied (codes 10, 200, 230)
      if (error.isPermissionDenied()) {
        log.warn({ pageId, code: error.code }, 'Permission denied for insights')
        return {
          data: null,
          error: {
            code: 'PERMISSION_DENIED',
            fbErrorCode: error.code,
            message: 'Permission denied to access page insights',
            userMessageCz:
              'Chybí oprávnění read_insights. Přihlaste se znovu přes Facebook.',
          },
        }
      }

      // Page doesn't support insights (code 100)
      if (error.code === 100) {
        log.info({ pageId }, 'Page does not support insights API')
        return {
          data: null,
          error: {
            code: 'NOT_SUPPORTED',
            fbErrorCode: 100,
            message: 'Page does not support insights API',
            userMessageCz:
              'Tato stránka nepodporuje insights (např. příliš málo sledujících).',
          },
        }
      }

      // Rate limited
      if (error.isRateLimited()) {
        log.warn({ pageId, code: error.code }, 'Rate limited')
        return {
          data: null,
          error: {
            code: 'RATE_LIMITED',
            fbErrorCode: error.code,
            message: 'Rate limited by Facebook API',
            userMessageCz:
              'Facebook API limit překročen. Zkuste to později.',
          },
        }
      }
    }

    // Unknown error
    log.error({ pageId, error }, 'Unknown error fetching insights')
    return {
      data: null,
      error: {
        code: 'UNKNOWN',
        message: error instanceof Error ? error.message : 'Unknown error',
        userMessageCz: 'Nepodařilo se načíst insights. Zkuste to později.',
      },
    }
  }
}
