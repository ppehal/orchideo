import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getOrGeneratePdf } from '@/lib/services/pdf'
import { PDF_RATE_LIMIT } from '@/lib/constants/pdf'
import { createLogger, logError } from '@/lib/logging'
import { env } from '@/lib/config/env'

const log = createLogger('api-report-pdf')

// Simple in-memory rate limiter (per token)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>()
let lastCleanup = Date.now()
const CLEANUP_INTERVAL_MS = 60 * 60 * 1000 // 1 hour

/**
 * Clean up expired rate limit entries to prevent memory leak.
 */
function cleanupExpiredEntries(): void {
  const now = Date.now()
  if (now - lastCleanup < CLEANUP_INTERVAL_MS) {
    return
  }

  lastCleanup = now
  let cleaned = 0

  for (const [token, entry] of rateLimitMap.entries()) {
    if (now > entry.resetAt) {
      rateLimitMap.delete(token)
      cleaned++
    }
  }

  if (cleaned > 0) {
    log.debug({ cleaned, remaining: rateLimitMap.size }, 'Cleaned up expired rate limit entries')
  }
}

function checkRateLimit(token: string): { allowed: boolean; remaining: number; resetAt: number } {
  // Periodically clean up expired entries
  cleanupExpiredEntries()

  const now = Date.now()
  const entry = rateLimitMap.get(token)

  if (!entry || now > entry.resetAt) {
    // Reset or create new entry
    const resetAt = now + PDF_RATE_LIMIT.WINDOW_MS
    rateLimitMap.set(token, { count: 1, resetAt })
    return {
      allowed: true,
      remaining: PDF_RATE_LIMIT.MAX_REQUESTS_PER_WINDOW - 1,
      resetAt,
    }
  }

  if (entry.count >= PDF_RATE_LIMIT.MAX_REQUESTS_PER_WINDOW) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: entry.resetAt,
    }
  }

  entry.count++
  return {
    allowed: true,
    remaining: PDF_RATE_LIMIT.MAX_REQUESTS_PER_WINDOW - entry.count,
    resetAt: entry.resetAt,
  }
}

interface Props {
  params: Promise<{ token: string }>
}

export async function POST(request: Request, { params }: Props) {
  const startTime = Date.now()
  let token: string | undefined

  try {
    const resolvedParams = await params
    token = resolvedParams.token

    // Rate limiting
    const rateLimit = checkRateLimit(token)
    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          error: 'Příliš mnoho požadavků na PDF',
          code: 'RATE_LIMITED',
          retryAfter: Math.ceil((rateLimit.resetAt - Date.now()) / 1000),
        },
        {
          status: 429,
          headers: {
            'Retry-After': String(Math.ceil((rateLimit.resetAt - Date.now()) / 1000)),
            'X-RateLimit-Remaining': String(rateLimit.remaining),
            'X-RateLimit-Reset': String(Math.floor(rateLimit.resetAt / 1000)),
          },
        }
      )
    }

    // Find analysis by token
    const analysis = await prisma.analysis.findUnique({
      where: { public_token: token },
      select: {
        id: true,
        status: true,
        expires_at: true,
        company_name: true,
        hide_orchideo_branding: true,
      },
    })

    if (!analysis) {
      return NextResponse.json({ error: 'Report nenalezen', code: 'NOT_FOUND' }, { status: 404 })
    }

    // Check if report has expired
    if (analysis.expires_at && analysis.expires_at < new Date()) {
      return NextResponse.json({ error: 'Report vypršel', code: 'EXPIRED' }, { status: 410 })
    }

    // Check if analysis is completed
    if (analysis.status !== 'COMPLETED') {
      return NextResponse.json(
        { error: 'Analýza není dokončena', code: 'NOT_READY' },
        { status: 400 }
      )
    }

    // Parse request body for optional parameters
    let body: { includeBranding?: boolean; companyName?: string } = {}
    try {
      body = await request.json()
    } catch {
      // Empty body is fine
    }

    // Get base URL from environment
    const baseUrl = env.NEXT_PUBLIC_APP_URL

    // Generate or retrieve cached PDF
    const result = await getOrGeneratePdf(
      analysis.id,
      {
        token,
        includeBranding: body.includeBranding ?? !analysis.hide_orchideo_branding,
        companyName: body.companyName ?? analysis.company_name ?? undefined,
      },
      baseUrl
    )

    const elapsedMs = Date.now() - startTime
    log.info({ token, cached: result.cached, elapsedMs }, 'PDF served')

    // Return PDF as downloadable file
    return new NextResponse(new Uint8Array(result.buffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="report-${token}.pdf"`,
        'Content-Length': String(result.buffer.length),
        'X-Cache': result.cached ? 'HIT' : 'MISS',
        'X-RateLimit-Remaining': String(rateLimit.remaining),
        'X-RateLimit-Reset': String(Math.floor(rateLimit.resetAt / 1000)),
      },
    })
  } catch (error) {
    logError(log, error, 'PDF generation failed', {
      token: token || 'unknown',
    })

    if (error instanceof Error && error.message === 'Semaphore acquire timeout') {
      return NextResponse.json(
        { error: 'Server je vytížen, zkuste to později', code: 'BUSY' },
        { status: 503 }
      )
    }

    return NextResponse.json(
      { error: 'Nepodařilo se vygenerovat PDF', code: 'GENERATION_ERROR' },
      { status: 500 }
    )
  }
}
