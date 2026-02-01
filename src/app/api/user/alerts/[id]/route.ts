import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { markAlertAsRead } from '@/lib/services/alerts'
import { createLogger, logError, LogFields } from '@/lib/logging'

const log = createLogger('api-user-alert-detail')

interface Props {
  params: Promise<{ id: string }>
}

export async function PATCH(request: Request, { params }: Props) {
  let userId: string | undefined
  let alertId: string | undefined

  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Nepřihlášen', code: 'UNAUTHORIZED' }, { status: 401 })
    }

    userId = session.user.id
    const { id } = await params
    alertId = id
    const body = await request.json()

    // Mark as read
    if (body.is_read === true) {
      const success = await markAlertAsRead(id, session.user.id)

      if (!success) {
        return NextResponse.json({ error: 'Alert nenalezen', code: 'NOT_FOUND' }, { status: 404 })
      }

      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: 'Neplatná akce', code: 'INVALID_ACTION' }, { status: 400 })
  } catch (error) {
    logError(log, error, 'Failed to update alert', {
      [LogFields.userId]: userId,
      alert_id: alertId,
    })

    return NextResponse.json(
      { error: 'Neočekávaná chyba', code: 'INTERNAL_ERROR' },
      { status: 500 }
    )
  }
}
