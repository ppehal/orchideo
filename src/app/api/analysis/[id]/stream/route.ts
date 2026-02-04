import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { createLogger, logError, withRequestContext } from '@/lib/logging'
import { ANALYSIS_STATUS_PROGRESS, getAnalysisErrorMessage } from '@/lib/constants'

const baseLog = createLogger('api-analysis-stream')

/**
 * Server-Sent Events endpoint for real-time analysis status updates
 * Replaces polling with push-based updates
 */

interface Props {
  params: Promise<{ id: string }>
}

export const dynamic = 'force-dynamic'

export async function GET(request: Request, { params }: Props) {
  const log = withRequestContext(baseLog, request)
  const { id } = await params

  try {
    const session = await auth()

    if (!session?.user?.id) {
      return new Response(
        JSON.stringify({ error: 'Nepřihlášen', code: 'UNAUTHORIZED' }),
        {
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        }
      )
    }

    // Verify ownership
    const analysis = await prisma.analysis.findFirst({
      where: {
        id,
        userId: session.user.id,
      },
      select: {
        id: true,
        status: true,
      },
    })

    if (!analysis) {
      return new Response(
        JSON.stringify({ error: 'Analýza nenalezena', code: 'NOT_FOUND' }),
        {
          status: 404,
          headers: { 'Content-Type': 'application/json' }
        }
      )
    }

    // If analysis already completed/failed, return immediately
    if (analysis.status === 'COMPLETED' || analysis.status === 'FAILED') {
      const currentData = await prisma.analysis.findUnique({
        where: { id },
        select: {
          status: true,
          error_code: true,
          error_message: true,
          public_token: true,
        },
      })

      if (currentData) {
        const errorInfo =
          currentData.status === 'FAILED' ? getAnalysisErrorMessage(currentData.error_code) : null

        // Send single event and close
        const event = {
          status: currentData.status,
          progress: ANALYSIS_STATUS_PROGRESS[currentData.status],
          errorCode: currentData.error_code,
          errorTitle: errorInfo?.title ?? null,
          errorMessage: errorInfo?.description ?? null,
          publicToken: currentData.public_token,
        }

        return new Response(
          `data: ${JSON.stringify(event)}\n\n`,
          {
            headers: {
              'Content-Type': 'text/event-stream',
              'Cache-Control': 'no-cache',
              'Connection': 'keep-alive',
            },
          }
        )
      }
    }

    // Create readable stream for SSE
    const encoder = new TextEncoder()

    const stream = new ReadableStream({
      async start(controller) {
        const sendEvent = (data: unknown) => {
          const message = `data: ${JSON.stringify(data)}\n\n`
          controller.enqueue(encoder.encode(message))
        }

        // Send initial status
        try {
          const current = await prisma.analysis.findUnique({
            where: { id },
            select: {
              status: true,
              error_code: true,
              error_message: true,
              public_token: true,
            },
          })

          if (current) {
            const errorInfo =
              current.status === 'FAILED' ? getAnalysisErrorMessage(current.error_code) : null

            sendEvent({
              status: current.status,
              progress: ANALYSIS_STATUS_PROGRESS[current.status],
              errorCode: current.error_code,
              errorTitle: errorInfo?.title ?? null,
              errorMessage: errorInfo?.description ?? null,
              publicToken: current.public_token,
            })

            // If already done, close stream
            if (current.status === 'COMPLETED' || current.status === 'FAILED') {
              controller.close()
              return
            }
          }
        } catch (error) {
          log.error({ error, analysis_id: id }, 'Error sending initial SSE event')
        }

        // Poll database for changes (server-side polling, but only once per analysis)
        const pollInterval = setInterval(async () => {
          try {
            const current = await prisma.analysis.findUnique({
              where: { id },
              select: {
                status: true,
                error_code: true,
                error_message: true,
                public_token: true,
              },
            })

            if (current) {
              const errorInfo =
                current.status === 'FAILED' ? getAnalysisErrorMessage(current.error_code) : null

              sendEvent({
                status: current.status,
                progress: ANALYSIS_STATUS_PROGRESS[current.status],
                errorCode: current.error_code,
                errorTitle: errorInfo?.title ?? null,
                errorMessage: errorInfo?.description ?? null,
                publicToken: current.public_token,
              })

              // Stop streaming when analysis completes
              if (current.status === 'COMPLETED' || current.status === 'FAILED') {
                clearInterval(pollInterval)
                controller.close()
              }
            }
          } catch (error) {
            logError(log, error, 'Error in SSE stream poll', { analysis_id: id })
            clearInterval(pollInterval)
            controller.close()
          }
        }, 2000) // Poll DB every 2 seconds (but only once for this analysis, not N clients)

        // Cleanup on client disconnect
        const cleanup = () => {
          clearInterval(pollInterval)
          controller.close()
        }

        // Handle client disconnect
        request.signal.addEventListener('abort', cleanup)
      },
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no', // Disable nginx buffering
      },
    })
  } catch (error) {
    logError(log, error, 'Failed to create SSE stream', { analysis_id: id })
    return new Response(
      JSON.stringify({ error: 'Chyba při streamování stavu analýzy' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    )
  }
}
