import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import {
  computeComparison,
  saveComparisonSnapshot,
  getComparisonHistory,
} from '@/lib/services/competitors'
import { createLogger } from '@/lib/logging'

const log = createLogger('api-competitor-comparison')

interface Props {
  params: Promise<{ id: string }>
}

/**
 * GET - Compute comparison without saving (read-only)
 */
export async function GET(_request: Request, { params }: Props) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Nepřihlášen', code: 'UNAUTHORIZED' }, { status: 401 })
    }

    const { id } = await params

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

    const comparison = await computeComparison(id)

    if (!comparison) {
      return NextResponse.json(
        { error: 'Nepodařilo se vypočítat porovnání', code: 'COMPUTATION_ERROR' },
        { status: 500 }
      )
    }

    return NextResponse.json(comparison)
  } catch (error) {
    log.error({ error }, 'Failed to compute comparison')

    return NextResponse.json(
      { error: 'Neočekávaná chyba', code: 'INTERNAL_ERROR' },
      { status: 500 }
    )
  }
}

/**
 * POST - Save a comparison snapshot
 */
export async function POST(_request: Request, { params }: Props) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Nepřihlášen', code: 'UNAUTHORIZED' }, { status: 401 })
    }

    const { id } = await params

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

    // Compute and save
    const comparison = await computeComparison(id)

    if (!comparison) {
      return NextResponse.json(
        { error: 'Nepodařilo se vypočítat porovnání', code: 'COMPUTATION_ERROR' },
        { status: 500 }
      )
    }

    const snapshotId = await saveComparisonSnapshot(id, comparison)

    return NextResponse.json(
      {
        id: snapshotId,
        comparison,
      },
      { status: 201 }
    )
  } catch (error) {
    log.error({ error }, 'Failed to save comparison snapshot')

    return NextResponse.json(
      { error: 'Neočekávaná chyba', code: 'INTERNAL_ERROR' },
      { status: 500 }
    )
  }
}

/**
 * GET /history - Get historical comparisons
 * Using query param: ?history=true
 */
export async function getComparisonHistoryHandler(
  groupId: string,
  userId: string
): Promise<NextResponse> {
  // Verify ownership
  const group = await prisma.competitorGroup.findFirst({
    where: {
      id: groupId,
      userId,
    },
    select: { id: true },
  })

  if (!group) {
    return NextResponse.json({ error: 'Skupina nenalezena', code: 'NOT_FOUND' }, { status: 404 })
  }

  const history = await getComparisonHistory(groupId)

  return NextResponse.json({ history })
}
