import { NextRequest, NextResponse } from 'next/server'

import { prisma } from '@/lib/prisma'
import { createLogger } from '@/lib/logging'
import { sendReportEmail } from '@/lib/email'
import { sendReportEmailSchema } from '@/lib/validators/email'

const log = createLogger('api:email:send-report')

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Validate input
    const parseResult = sendReportEmailSchema.safeParse(body)
    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'Neplatný vstup', details: parseResult.error.flatten() },
        { status: 400 }
      )
    }

    const { email, analysisToken } = parseResult.data

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
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const reportUrl = `${appUrl}/report/${analysis.public_token}`

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
        log.error(
          { error: dbError, analysisId: analysis.id },
          'Failed to log email error analytics'
        )
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
      log.error({ error: dbError, analysisId: analysis.id }, 'Failed to update email_sent_to')
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
      log.error(
        { error: dbError, analysisId: analysis.id },
        'Failed to log email success analytics'
      )
    }

    const maskedEmail = email.replace(/(.{2}).*@/, '$1***@')
    log.info({ analysisId: analysis.id, email: maskedEmail }, 'Report email sent successfully')

    return NextResponse.json({ success: true })
  } catch (error) {
    log.error({ error }, 'Unexpected error in send-report endpoint')
    return NextResponse.json({ error: 'Interní chyba serveru' }, { status: 500 })
  }
}
