import { NextResponse } from 'next/server'
import { auth, getFacebookAccessToken } from '@/lib/auth'
import { getManagedPagesWithTokens, FacebookApiError } from '@/lib/integrations/facebook'
import { createLogger } from '@/lib/logging'

const log = createLogger('api-facebook-pages')

export async function GET() {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Nepřihlášen' }, { status: 401 })
    }

    const accessToken = await getFacebookAccessToken(session.user.id)

    if (!accessToken) {
      return NextResponse.json(
        {
          error: 'Facebook účet není propojen',
          code: 'FACEBOOK_NOT_CONNECTED',
        },
        { status: 400 }
      )
    }

    log.info({ user_id: session.user.id }, 'Fetching Facebook pages')

    const pages = await getManagedPagesWithTokens(accessToken)

    log.info({ user_id: session.user.id, page_count: pages.length }, 'Facebook pages fetched')

    return NextResponse.json({
      pages: pages.map((p) => ({
        id: p.id,
        name: p.name,
        category: p.category,
        picture_url: p.picture_url,
        tasks: p.tasks,
        // Don't expose access_token to client
      })),
    })
  } catch (error) {
    if (error instanceof FacebookApiError) {
      log.error({ error_code: error.code, error_type: error.type }, error.message)

      if (error.isTokenExpired()) {
        return NextResponse.json(
          {
            error: 'Facebook token vypršel, prosím přihlaste se znovu',
            code: 'TOKEN_EXPIRED',
          },
          { status: 401 }
        )
      }

      if (error.isPermissionDenied()) {
        return NextResponse.json(
          {
            error: 'Nemáte oprávnění pro přístup k Facebook stránkám',
            code: 'PERMISSION_DENIED',
          },
          { status: 403 }
        )
      }

      return NextResponse.json(
        {
          error: 'Chyba při komunikaci s Facebook API',
          code: 'FACEBOOK_API_ERROR',
        },
        { status: 502 }
      )
    }

    log.error({ error }, 'Unexpected error fetching Facebook pages')

    return NextResponse.json(
      {
        error: 'Neočekávaná chyba',
        code: 'INTERNAL_ERROR',
      },
      { status: 500 }
    )
  }
}
