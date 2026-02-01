import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { createLogger, logError } from '@/lib/logging'
import { ANALYSIS_STATUS_PROGRESS, getAnalysisErrorMessage } from '@/lib/constants'

const log = createLogger('api-analysis-status')

interface Props {
  params: Promise<{ id: string }>
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
        error_code: true,
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

    // Get user-friendly error message if analysis failed
    const errorInfo =
      analysis.status === 'FAILED' ? getAnalysisErrorMessage(analysis.error_code) : null

    return NextResponse.json({
      success: true,
      data: {
        status: analysis.status,
        progress: ANALYSIS_STATUS_PROGRESS[analysis.status],
        errorCode: analysis.error_code,
        errorTitle: errorInfo?.title ?? null,
        errorMessage: errorInfo?.description ?? null,
        publicToken: analysis.public_token,
      },
    })
  } catch (error) {
    logError(log, error, 'Failed to get analysis status', {
      analysis_id: id,
    })
    return NextResponse.json(
      { success: false, error: 'Chyba při načítání stavu analýzy' },
      { status: 500 }
    )
  }
}
