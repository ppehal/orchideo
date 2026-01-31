import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { createLogger } from '@/lib/logging'
import { z } from 'zod'

const log = createLogger('api-competitor-groups')

const createGroupSchema = z.object({
  name: z.string().min(1, 'Název je povinný').max(100),
  description: z.string().max(500).optional(),
  primaryPageId: z.string().min(1, 'ID primární stránky je povinné'),
  competitorPageIds: z.array(z.string()).min(1, 'Alespoň jeden konkurent je vyžadován').max(10),
})

export async function GET() {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Nepřihlášen', code: 'UNAUTHORIZED' }, { status: 401 })
    }

    const groups = await prisma.competitorGroup.findMany({
      where: { userId: session.user.id },
      include: {
        primaryPage: {
          select: { id: true, name: true, picture_url: true },
        },
        competitorPages: {
          include: {
            facebookPage: {
              select: { id: true, name: true, picture_url: true },
            },
          },
        },
        _count: {
          select: { comparisons: true },
        },
      },
      orderBy: { created_at: 'desc' },
    })

    return NextResponse.json({
      groups: groups.map((g) => ({
        id: g.id,
        name: g.name,
        description: g.description,
        primaryPage: g.primaryPage,
        competitors: g.competitorPages.map((cp) => cp.facebookPage),
        comparisonsCount: g._count.comparisons,
        createdAt: g.created_at.toISOString(),
        updatedAt: g.updated_at.toISOString(),
      })),
    })
  } catch (error) {
    log.error({ error }, 'Failed to get competitor groups')

    return NextResponse.json(
      { error: 'Neočekávaná chyba', code: 'INTERNAL_ERROR' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Nepřihlášen', code: 'UNAUTHORIZED' }, { status: 401 })
    }

    const body = await request.json()
    const parsed = createGroupSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: parsed.error.issues[0]?.message || 'Neplatná data',
          code: 'VALIDATION_ERROR',
        },
        { status: 400 }
      )
    }

    const {
      name,
      description,
      primaryPageId,
      competitorPageIds: rawCompetitorPageIds,
    } = parsed.data

    // Deduplicate competitor page IDs
    const competitorPageIds = [...new Set(rawCompetitorPageIds)]

    // Verify all pages belong to user
    const allPageIds = [primaryPageId, ...competitorPageIds]
    const pages = await prisma.facebookPage.findMany({
      where: {
        id: { in: allPageIds },
        userId: session.user.id,
      },
      select: { id: true },
    })

    if (pages.length !== allPageIds.length) {
      return NextResponse.json(
        {
          error: 'Některé stránky nebyly nalezeny nebo k nim nemáte přístup',
          code: 'INVALID_PAGES',
        },
        { status: 400 }
      )
    }

    // Check for duplicate page in competitors
    if (competitorPageIds.includes(primaryPageId)) {
      return NextResponse.json(
        { error: 'Primární stránka nemůže být zároveň konkurentem', code: 'DUPLICATE_PAGE' },
        { status: 400 }
      )
    }

    // Create group with competitors in a transaction
    const group = await prisma.$transaction(async (tx) => {
      const newGroup = await tx.competitorGroup.create({
        data: {
          name,
          description,
          userId: session.user.id,
          primary_page_id: primaryPageId,
        },
      })

      await tx.competitorPage.createMany({
        data: competitorPageIds.map((pageId) => ({
          group_id: newGroup.id,
          fb_page_id: pageId,
        })),
      })

      return newGroup
    })

    log.info({ groupId: group.id, userId: session.user.id }, 'Competitor group created')

    return NextResponse.json({ id: group.id }, { status: 201 })
  } catch (error) {
    log.error({ error }, 'Failed to create competitor group')

    return NextResponse.json(
      { error: 'Neočekávaná chyba', code: 'INTERNAL_ERROR' },
      { status: 500 }
    )
  }
}
