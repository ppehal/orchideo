import { NextRequest, NextResponse } from 'next/server'

import { prisma } from '@/lib/prisma'
import { createLogger, logError, withRequestContext } from '@/lib/logging'
import { sendReportEmail } from '@/lib/email'
import { sendReportEmailSchema } from '@/lib/validators/email'
import { getRateLimiter } from '@/lib/utils/rate-limiter'
import { auth } from '@/lib/auth'
import { env } from '@/lib/config/env'

const baseLog = createLogger('api:email:send-report')

export async function POST(request: NextRequest) {
  // Create request-scoped logger with tracing context
  const log = withRequestContext(baseLog, request)

  let analysisToken: string | undefined

  try {
    // Rate limiting - per user if authenticated, otherwise per IP
    const session = await auth()
    const userId = session?.user?.id
    const ipHeader = request.headers.get('x-forwarded-for')
    const ip = ipHeader?.split(',')[0]?.trim() || 'unknown'

    const limitKey = userId ? `email-send-user-${userId}` : `email-send-ip-${ip}`
    const maxRequests = userId ? 10 : 5 // Higher limit for authenticated users

    const limiter = getRateLimiter(limitKey, {
      maxRequests,
      windowMs: 60 * 60 * 1000, // 1 hour
    })

    if (!limiter.canProceed()) {
      const stats = limiter.getStats()
      log.warn({ limitKey, user_id: userId, ip }, 'Email send rate limit exceeded')
      return NextResponse.json(
        { error: 'Příliš mnoho požadavků. Zkuste to prosím později.', code: 'RATE_LIMIT_EXCEEDED' },
        {
          status: 429,
          headers: {
            'Retry-After': String(Math.ceil(stats.windowMs / 1000)),
            'X-RateLimit-Remaining': '0',
          },
        }
      )
    }

    await limiter.acquire()

    const body = await request.json()

    // Validate input
    const parseResult = sendReportEmailSchema.safeParse(body)
    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'Neplatný vstup', details: parseResult.error.flatten() },
        { status: 400 }
      )
    }

    const parsedData = parseResult.data
    analysisToken = parsedData.analysisToken
    const email = parsedData.email

    // Find analysis by public token
    const analysis = await prisma.analysis.findUnique({
      where: { public_token: analysisToken },
      select: {
        id: true,
        page_name: true,
        public_token: true,
        expires_at: true,
        email_sent_to: true,
      },
    })

    if (!analysis) {
      log.warn({ analysisToken }, 'Analysis not found for email send')
      return NextResponse.json({ error: 'Report nenalezen' }, { status: 404 })
    }

    // Check if report is expired
    if (analysis.expires_at && new Date(analysis.expires_at) < new Date()) {
      log.warn({ analysisId: analysis.id }, 'Attempted to send email for expired report')
      return NextResponse.json({ error: 'Report vypršel' }, { status: 410 })
    }

    // Build report URL
    const reportUrl = `${env.NEXT_PUBLIC_APP_URL}/report/${analysis.public_token}`

    // Send email
    const result = await sendReportEmail(email, reportUrl, analysis.page_name || 'Facebook stránka')

    if (!result.success) {
      log.error({ analysisId: analysis.id, error: result.error }, 'Failed to send report email')

      // Log analytics event for failure (non-critical, don't fail the request)
      try {
        await prisma.analyticsEvent.create({
          data: {
            event_type: 'email_send_error',
            analysisId: analysis.id,
            metadata: {
              error: result.error,
            },
          },
        })
      } catch (dbError) {
        logError(log, dbError, 'Failed to log email error analytics', { analysis_id: analysis.id })
      }

      return NextResponse.json(
        { error: result.error || 'Nepodařilo se odeslat email' },
        { status: 500 }
      )
    }

    // Update analysis with email recipient (non-critical, don't fail the request)
    try {
      await prisma.analysis.update({
        where: { id: analysis.id },
        data: { email_sent_to: email },
      })
    } catch (dbError) {
      logError(log, dbError, 'Failed to update email_sent_to', {
        analysis_id: analysis.id,
      })
    }

    // Log analytics events (non-critical, don't fail the request)
    try {
      await prisma.analyticsEvent.createMany({
        data: [
          {
            event_type: 'email_submitted',
            analysisId: analysis.id,
            metadata: { email_domain: email.split('@')[1] },
          },
          {
            event_type: 'email_send_success',
            analysisId: analysis.id,
            metadata: { message_id: result.messageId },
          },
        ],
      })
    } catch (dbError) {
      logError(log, dbError, 'Failed to log email success analytics', { analysis_id: analysis.id })
    }

    const maskedEmail = email.replace(/(.{2}).*@/, '$1***@')
    log.info({ analysisId: analysis.id, email: maskedEmail }, 'Report email sent successfully')

    return NextResponse.json({ success: true })
  } catch (error) {
    logError(log, error, 'Unexpected error in send-report endpoint', {
      analysis_token: analysisToken,
    })
    return NextResponse.json({ error: 'Interní chyba serveru' }, { status: 500 })
  }
}
