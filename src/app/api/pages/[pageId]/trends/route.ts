import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getTrendsForPage } from '@/lib/services/trends'
import { createLogger } from '@/lib/logging'

const log = createLogger('api-page-trends')

interface Props {
  params: Promise<{ pageId: string }>
}

export async function GET(_request: Request, { params }: Props) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Nepřihlášen', code: 'UNAUTHORIZED' }, { status: 401 })
    }

    const { pageId } = await params

    // Verify user owns this page
    const page = await prisma.facebookPage.findFirst({
      where: {
        id: pageId,
        userId: session.user.id,
      },
      select: { id: true },
    })

    if (!page) {
      return NextResponse.json({ error: 'Stránka nenalezena', code: 'NOT_FOUND' }, { status: 404 })
    }

    const trends = await getTrendsForPage(pageId)

    if (!trends) {
      return NextResponse.json(
        { error: 'Nepodařilo se načíst trendy', code: 'INTERNAL_ERROR' },
        { status: 500 }
      )
    }

    return NextResponse.json(trends)
  } catch (error) {
    log.error({ error }, 'Failed to get page trends')

    return NextResponse.json(
      { error: 'Neočekávaná chyba', code: 'INTERNAL_ERROR' },
      { status: 500 }
    )
  }
}
