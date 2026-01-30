import { createLogger } from '@/lib/logging'
import { makeRequest, GRAPH_API_BASE_URL, FacebookApiError } from './client'
import type { FacebookInsightsResponse, FacebookInsight } from './types'

const log = createLogger('facebook-insights')

const INSIGHTS_TIMEOUT_MS = parseInt(process.env.FEED_TIMEOUT_MS || '10000', 10)
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

function extractReactionBreakdown(insight: FacebookInsight): Record<string, number> | null {
  const lastValue = insight.values[insight.values.length - 1]
  if (lastValue && typeof lastValue.value === 'object') {
    return lastValue.value as Record<string, number>
  }
  return null
}

export async function fetchPageInsights(
  pageId: string,
  accessToken: string,
  options: FetchInsightsOptions = {}
): Promise<PageInsights | null> {
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

    return insights as PageInsights
  } catch (error) {
    if (error instanceof FacebookApiError) {
      if (error.isPermissionDenied()) {
        log.warn({ pageId }, 'No permission to access page insights')
        return null
      }
      if (error.code === 100) {
        // Insights not available for this page
        log.warn({ pageId }, 'Insights not available for this page')
        return null
      }
    }

    log.error({ pageId, error }, 'Error fetching page insights')
    // Return null instead of throwing - insights are optional
    return null
  }
}
