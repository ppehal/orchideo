import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { getAlertsForUser, markAllAlertsAsRead } from '@/lib/services/alerts'
import { createLogger, logError, LogFields } from '@/lib/logging'
import { getRateLimiter } from '@/lib/utils/rate-limiter'
import { ApiErrors, handleApiError } from '@/lib/api/errors'

const log = createLogger('api-user-alerts')

export async function GET(request: Request) {
  let userId: string | undefined

  try {
    const session = await auth()

    if (!session?.user?.id) {
      throw ApiErrors.UNAUTHORIZED()
    }

    userId = session.user.id

    // Rate limiting: 60 requests per minute per user
    const limiter = getRateLimiter(`alerts-get-${userId}`, {
      maxRequests: 60,
      windowMs: 60 * 1000, // 1 minute
    })

    if (!limiter.canProceed()) {
      const stats = limiter.getStats()
      log.warn({ user_id: userId }, 'Alerts GET rate limit exceeded')
      throw ApiErrors.RATE_LIMIT(Math.ceil(stats.windowMs / 1000))
    }

    await limiter.acquire()

    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '50', 10)
    const includeRead = searchParams.get('includeRead') !== 'false'

    const alerts = await getAlertsForUser(userId, {
      limit: Math.min(limit, 100), // Cap at 100
      includeRead,
    })

    return NextResponse.json(alerts)
  } catch (error) {
    logError(log, error, 'Failed to get user alerts', {
      [LogFields.userId]: userId,
    })

    return handleApiError(error)
  }
}

export async function PATCH(request: Request) {
  let userId: string | undefined

  try {
    const session = await auth()

    if (!session?.user?.id) {
      throw ApiErrors.UNAUTHORIZED()
    }

    userId = session.user.id

    const body = await request.json()

    // Mark all as read
    if (body.markAllRead === true) {
      const count = await markAllAlertsAsRead(session.user.id)
      return NextResponse.json({ success: true, markedCount: count })
    }

    throw ApiErrors.VALIDATION_ERROR({ field: 'markAllRead', message: 'Neplatná akce' })
  } catch (error) {
    logError(log, error, 'Failed to update alerts', {
      [LogFields.userId]: userId,
    })

    return handleApiError(error)
  }
}
