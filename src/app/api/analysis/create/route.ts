import { NextResponse } from 'next/server'
import { createAnalysis } from '@/lib/actions/analysis'
import { createLogger } from '@/lib/logging'
import { z } from 'zod'

const log = createLogger('api-analysis-create')

const requestSchema = z.object({
  pageId: z.string().min(1, 'ID stránky je povinné'),
})

export async function POST(request: Request) {
  try {
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

    const result = await createAnalysis(parsed.data.pageId)

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
