import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { createAnalysis } from '@/lib/actions/analysis'
import { createLogger } from '@/lib/logging'
import { getRateLimiter } from '@/lib/utils/rate-limiter'
import { z } from 'zod'

const log = createLogger('api-analysis-create')

const requestSchema = z.object({
  pageId: z.string().min(1, 'ID stránky je povinné'),
  industryCode: z.string().optional().default('DEFAULT'),
})

export async function POST(request: Request) {
  try {
    // Check authentication for rate limiting
    const session = await auth()
    if (session?.user?.id) {
      // Rate limiting per user: 10 analyses per hour
      const userId = session.user.id
      const limiter = getRateLimiter(`analysis-create-${userId}`, {
        maxRequests: 10,
        windowMs: 60 * 60 * 1000, // 1 hour
      })

      if (!limiter.canProceed()) {
        const stats = limiter.getStats()
        log.warn({ user_id: userId }, 'Analysis creation rate limit exceeded')
        return NextResponse.json(
          { error: 'Příliš mnoho požadavků. Zkuste to prosím později.', code: 'RATE_LIMITED' },
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
    }

    const body = await request.json()

    const parsed = requestSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: parsed.error.issues[0]?.message || 'Neplatná data',
          code: 'VALIDATION_ERROR',
        },
        { status: 400 }
      )
    }

    const result = await createAnalysis(parsed.data.pageId, parsed.data.industryCode)

    if (!result.success) {
      const statusCode =
        result.code === 'UNAUTHORIZED'
          ? 401
          : result.code === 'PERMISSION_DENIED'
            ? 403
            : result.code === 'PAGE_NOT_FOUND' || result.code === 'FACEBOOK_NOT_CONNECTED'
              ? 400
              : 500

      return NextResponse.json(
        {
          error: result.error,
          code: result.code,
        },
        { status: statusCode }
      )
    }

    return NextResponse.json(result.data)
  } catch (error) {
    log.error({ error }, 'Unexpected error in analysis create endpoint')

    return NextResponse.json(
      {
        error: 'Neočekávaná chyba',
        code: 'INTERNAL_ERROR',
      },
      { status: 500 }
    )
  }
}
