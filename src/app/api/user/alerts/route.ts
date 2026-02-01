import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { getAlertsForUser, markAllAlertsAsRead } from '@/lib/services/alerts'
import { createLogger } from '@/lib/logging'
import { getRateLimiter } from '@/lib/utils/rate-limiter'

const log = createLogger('api-user-alerts')

export async function GET(request: Request) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Nepřihlášen', code: 'UNAUTHORIZED' }, { status: 401 })
    }

    const userId = session.user.id

    // Rate limiting: 60 requests per minute per user
    const limiter = getRateLimiter(`alerts-get-${userId}`, {
      maxRequests: 60,
      windowMs: 60 * 1000, // 1 minute
    })

    if (!limiter.canProceed()) {
      const stats = limiter.getStats()
      log.warn({ user_id: userId }, 'Alerts GET rate limit exceeded')
      return NextResponse.json(
        { error: 'Příliš mnoho požadavků. Zkuste to prosím později.', code: 'RATE_LIMITED' },
        {
          status: 429,
          headers: {
            'Retry-After': String(Math.ceil(stats.windowMs / 1000)),
            'X-RateLimit-Remaining': '0',
          },
        }
      )
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
    log.error({ error }, 'Failed to get user alerts')

    return NextResponse.json(
      { error: 'Neočekávaná chyba', code: 'INTERNAL_ERROR' },
      { status: 500 }
    )
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Nepřihlášen', code: 'UNAUTHORIZED' }, { status: 401 })
    }

    const body = await request.json()

    // Mark all as read
    if (body.markAllRead === true) {
      const count = await markAllAlertsAsRead(session.user.id)
      return NextResponse.json({ success: true, markedCount: count })
    }

    return NextResponse.json({ error: 'Neplatná akce', code: 'INVALID_ACTION' }, { status: 400 })
  } catch (error) {
    log.error({ error }, 'Failed to update alerts')

    return NextResponse.json(
      { error: 'Neočekávaná chyba', code: 'INTERNAL_ERROR' },
      { status: 500 }
    )
  }
}
