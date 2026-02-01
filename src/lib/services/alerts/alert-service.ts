import { prisma } from '@/lib/prisma'
import { createLogger, logError, LogFields } from '@/lib/logging'
import { ALERT_THRESHOLDS, ALERT_SEVERITY } from '@/lib/constants/versions'
import type { TrendAlertType } from '@/generated/prisma/enums'
import type { TrendAlertData, UserAlertsResponse } from '@/types/trends'

const log = createLogger('alert-service')

interface AlertCandidate {
  type: TrendAlertType
  severity: number
  previousValue: number
  currentValue: number
  changePct: number
  message: string
}

/**
 * Check for significant changes and create alerts if thresholds are exceeded.
 * Should be called after a new snapshot is created.
 */
export async function checkAndCreateAlerts(analysisId: string, fbPageId: string): Promise<void> {
  try {
    // Get the latest two snapshots for this page
    const snapshots = await prisma.analysisSnapshot.findMany({
      where: { fb_page_id: fbPageId },
      orderBy: { created_at: 'desc' },
      take: 2,
      select: {
        overall_score: true,
        engagement_rate: true,
        posts_per_week: true,
        created_at: true,
      },
    })

    if (snapshots.length < 2) {
      log.debug({ fbPageId }, 'Not enough snapshots for alert comparison')
      return
    }

    const current = snapshots[0]
    const previous = snapshots[1]

    if (!current || !previous) {
      log.debug({ fbPageId }, 'Missing snapshot data')
      return
    }

    const alerts: AlertCandidate[] = []

    // Get page info for user lookup
    const page = await prisma.facebookPage.findUnique({
      where: { id: fbPageId },
      select: { userId: true, name: true },
    })

    if (!page) {
      log.warn({ fbPageId }, 'Page not found for alert creation')
      return
    }

    // Check overall score changes
    if (current.overall_score !== null && previous.overall_score !== null) {
      const scoreDiff = current.overall_score - previous.overall_score

      if (scoreDiff <= -ALERT_THRESHOLDS.SCORE_DROP_CRITICAL) {
        alerts.push({
          type: 'SCORE_DROP_SIGNIFICANT',
          severity: ALERT_SEVERITY.CRITICAL,
          previousValue: previous.overall_score,
          currentValue: current.overall_score,
          changePct: (scoreDiff / previous.overall_score) * 100,
          message: `Celkové skóre stránky "${page.name}" výrazně kleslo o ${Math.abs(scoreDiff)} bodů`,
        })
      } else if (scoreDiff <= -ALERT_THRESHOLDS.SCORE_DROP_WARNING) {
        alerts.push({
          type: 'SCORE_DROP_SIGNIFICANT',
          severity: ALERT_SEVERITY.WARNING,
          previousValue: previous.overall_score,
          currentValue: current.overall_score,
          changePct: (scoreDiff / previous.overall_score) * 100,
          message: `Celkové skóre stránky "${page.name}" kleslo o ${Math.abs(scoreDiff)} bodů`,
        })
      } else if (scoreDiff >= ALERT_THRESHOLDS.SCORE_IMPROVEMENT) {
        alerts.push({
          type: 'SCORE_IMPROVEMENT',
          severity: ALERT_SEVERITY.INFO,
          previousValue: previous.overall_score,
          currentValue: current.overall_score,
          changePct: (scoreDiff / previous.overall_score) * 100,
          message: `Skvělé! Skóre stránky "${page.name}" se zlepšilo o ${scoreDiff} bodů`,
        })
      }
    }

    // Check engagement rate changes
    if (
      current.engagement_rate !== null &&
      previous.engagement_rate !== null &&
      previous.engagement_rate > 0
    ) {
      const engagementChangePct =
        ((current.engagement_rate - previous.engagement_rate) / previous.engagement_rate) * 100

      if (engagementChangePct <= -ALERT_THRESHOLDS.ENGAGEMENT_DROP_CRITICAL) {
        alerts.push({
          type: 'ENGAGEMENT_DROP',
          severity: ALERT_SEVERITY.CRITICAL,
          previousValue: previous.engagement_rate,
          currentValue: current.engagement_rate,
          changePct: engagementChangePct,
          message: `Engagement rate stránky "${page.name}" výrazně klesl o ${Math.abs(engagementChangePct).toFixed(0)}%`,
        })
      } else if (engagementChangePct <= -ALERT_THRESHOLDS.ENGAGEMENT_DROP_WARNING) {
        alerts.push({
          type: 'ENGAGEMENT_DROP',
          severity: ALERT_SEVERITY.WARNING,
          previousValue: previous.engagement_rate,
          currentValue: current.engagement_rate,
          changePct: engagementChangePct,
          message: `Engagement rate stránky "${page.name}" klesl o ${Math.abs(engagementChangePct).toFixed(0)}%`,
        })
      } else if (engagementChangePct >= ALERT_THRESHOLDS.ENGAGEMENT_IMPROVEMENT) {
        alerts.push({
          type: 'ENGAGEMENT_IMPROVEMENT',
          severity: ALERT_SEVERITY.INFO,
          previousValue: previous.engagement_rate,
          currentValue: current.engagement_rate,
          changePct: engagementChangePct,
          message: `Engagement rate stránky "${page.name}" vzrostl o ${engagementChangePct.toFixed(0)}%`,
        })
      }
    }

    // Check posting frequency changes
    if (
      current.posts_per_week !== null &&
      previous.posts_per_week !== null &&
      previous.posts_per_week > 0
    ) {
      const postingChangePct =
        ((current.posts_per_week - previous.posts_per_week) / previous.posts_per_week) * 100

      if (postingChangePct <= -ALERT_THRESHOLDS.POSTING_DROP_WARNING) {
        alerts.push({
          type: 'POSTING_FREQUENCY_DROP',
          severity: ALERT_SEVERITY.WARNING,
          previousValue: previous.posts_per_week,
          currentValue: current.posts_per_week,
          changePct: postingChangePct,
          message: `Frekvence příspěvků stránky "${page.name}" klesla o ${Math.abs(postingChangePct).toFixed(0)}%`,
        })
      } else if (postingChangePct >= ALERT_THRESHOLDS.POSTING_INCREASE) {
        alerts.push({
          type: 'POSTING_FREQUENCY_INCREASE',
          severity: ALERT_SEVERITY.INFO,
          previousValue: previous.posts_per_week,
          currentValue: current.posts_per_week,
          changePct: postingChangePct,
          message: `Frekvence příspěvků stránky "${page.name}" vzrostla o ${postingChangePct.toFixed(0)}%`,
        })
      }
    }

    // Create alerts in database
    if (alerts.length > 0) {
      await prisma.trendAlert.createMany({
        data: alerts.map((alert) => ({
          type: alert.type,
          severity: alert.severity,
          previous_value: alert.previousValue,
          current_value: alert.currentValue,
          change_pct: alert.changePct,
          message: alert.message,
          userId: page.userId,
          fb_page_id: fbPageId,
        })),
      })

      log.info(
        {
          fbPageId,
          alertsCreated: alerts.length,
          types: alerts.map((a) => a.type),
        },
        'Alerts created'
      )
    }
  } catch (error) {
    logError(log, error, 'Failed to check and create alerts', {
      [LogFields.analysisId]: analysisId,
      [LogFields.fbPageId]: fbPageId,
    })
    // Don't throw - alert creation should not fail the analysis
  }
}

/**
 * Get alerts for a user with pagination.
 */
export async function getAlertsForUser(
  userId: string,
  options: { limit?: number; includeRead?: boolean } = {}
): Promise<UserAlertsResponse> {
  const { limit = 50, includeRead = true } = options

  const whereClause = {
    userId,
    ...(includeRead ? {} : { is_read: false }),
  }

  const [alerts, unreadCount, total] = await Promise.all([
    prisma.trendAlert.findMany({
      where: whereClause,
      orderBy: { created_at: 'desc' },
      take: limit,
      include: {
        facebookPage: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    }),
    prisma.trendAlert.count({
      where: { userId, is_read: false },
    }),
    prisma.trendAlert.count({
      where: whereClause,
    }),
  ])

  return {
    alerts: alerts.map(
      (alert): TrendAlertData => ({
        id: alert.id,
        type: alert.type,
        severity: alert.severity,
        previousValue: alert.previous_value,
        currentValue: alert.current_value,
        changePct: alert.change_pct,
        message: alert.message,
        isRead: alert.is_read,
        pageName: alert.facebookPage.name,
        pageId: alert.facebookPage.id,
        createdAt: alert.created_at.toISOString(),
      })
    ),
    unreadCount,
    total,
  }
}

/**
 * Mark an alert as read.
 */
export async function markAlertAsRead(alertId: string, userId: string): Promise<boolean> {
  const result = await prisma.trendAlert.updateMany({
    where: {
      id: alertId,
      userId, // Ensure user owns the alert
    },
    data: {
      is_read: true,
    },
  })

  return result.count > 0
}

/**
 * Mark all alerts as read for a user.
 */
export async function markAllAlertsAsRead(userId: string): Promise<number> {
  const result = await prisma.trendAlert.updateMany({
    where: {
      userId,
      is_read: false,
    },
    data: {
      is_read: true,
    },
  })

  return result.count
}
