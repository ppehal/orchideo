import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { createLogger, logError, LogFields } from '@/lib/logging'

const log = createLogger('api-competitor-group-detail')

interface Props {
  params: Promise<{ id: string }>
}

export async function GET(_request: Request, { params }: Props) {
  let userId: string | undefined
  let groupId: string | undefined

  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Nepřihlášen', code: 'UNAUTHORIZED' }, { status: 401 })
    }

    userId = session.user.id
    const { id } = await params
    groupId = id

    const group = await prisma.competitorGroup.findFirst({
      where: {
        id,
        userId: session.user.id,
      },
      include: {
        primaryPage: {
          select: { id: true, name: true, picture_url: true, fan_count: true },
        },
        competitorPages: {
          include: {
            facebookPage: {
              select: { id: true, name: true, picture_url: true, fan_count: true },
            },
          },
        },
      },
    })

    if (!group) {
      return NextResponse.json({ error: 'Skupina nenalezena', code: 'NOT_FOUND' }, { status: 404 })
    }

    return NextResponse.json({
      id: group.id,
      name: group.name,
      description: group.description,
      primaryPage: group.primaryPage,
      competitors: group.competitorPages.map((cp) => cp.facebookPage),
      createdAt: group.created_at.toISOString(),
      updatedAt: group.updated_at.toISOString(),
    })
  } catch (error) {
    logError(log, error, 'Failed to get competitor group', {
      [LogFields.userId]: userId,
      group_id: groupId,
    })

    return NextResponse.json(
      { error: 'Neočekávaná chyba', code: 'INTERNAL_ERROR' },
      { status: 500 }
    )
  }
}

export async function DELETE(_request: Request, { params }: Props) {
  let userId: string | undefined
  let groupId: string | undefined

  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Nepřihlášen', code: 'UNAUTHORIZED' }, { status: 401 })
    }

    userId = session.user.id
    const { id } = await params
    groupId = id

    // Verify ownership
    const group = await prisma.competitorGroup.findFirst({
      where: {
        id,
        userId: session.user.id,
      },
      select: { id: true },
    })

    if (!group) {
      return NextResponse.json({ error: 'Skupina nenalezena', code: 'NOT_FOUND' }, { status: 404 })
    }

    await prisma.competitorGroup.delete({
      where: { id },
    })

    log.info({ groupId: id, userId: session.user.id }, 'Competitor group deleted')

    return NextResponse.json({ success: true })
  } catch (error) {
    logError(log, error, 'Failed to delete competitor group', {
      [LogFields.userId]: userId,
      group_id: groupId,
    })

    return NextResponse.json(
      { error: 'Neočekávaná chyba', code: 'INTERNAL_ERROR' },
      { status: 500 }
    )
  }
}
