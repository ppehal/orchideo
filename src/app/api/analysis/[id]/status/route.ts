import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { createLogger } from '@/lib/logging'
import type { AnalysisStatus } from '@/generated/prisma/enums'

const log = createLogger('api-analysis-status')

interface Props {
  params: Promise<{ id: string }>
}

const STATUS_PROGRESS: Record<AnalysisStatus, number> = {
  PENDING: 5,
  COLLECTING_DATA: 40,
  ANALYZING: 75,
  COMPLETED: 100,
  FAILED: 100,
}

export async function GET(_request: Request, { params }: Props) {
  const { id } = await params

  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Nepřihlášen' }, { status: 401 })
    }

    const analysis = await prisma.analysis.findFirst({
      where: {
        id,
        userId: session.user.id,
      },
      select: {
        status: true,
        error_message: true,
        public_token: true,
      },
    })

    if (!analysis) {
      return NextResponse.json(
        { success: false, error: 'Analýza nenalezena', code: 'NOT_FOUND' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        status: analysis.status,
        progress: STATUS_PROGRESS[analysis.status],
        // Return generic error message to client, details stay in server logs
        errorMessage: analysis.status === 'FAILED' ? 'Analýza selhala. Prosím zkuste znovu.' : null,
        publicToken: analysis.public_token,
      },
    })
  } catch (error) {
    log.error({ error, analysisId: id }, 'Failed to get analysis status')
    return NextResponse.json(
      { success: false, error: 'Chyba při načítání stavu analýzy' },
      { status: 500 }
    )
  }
}
