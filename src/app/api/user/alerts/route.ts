import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { getAlertsForUser, markAllAlertsAsRead } from '@/lib/services/alerts'
import { createLogger } from '@/lib/logging'

const log = createLogger('api-user-alerts')

export async function GET(request: Request) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Nepřihlášen', code: 'UNAUTHORIZED' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '50', 10)
    const includeRead = searchParams.get('includeRead') !== 'false'

    const alerts = await getAlertsForUser(session.user.id, {
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
