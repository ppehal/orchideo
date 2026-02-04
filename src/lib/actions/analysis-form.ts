'use server'

import { z } from 'zod'
import { createAnalysis, type CreateAnalysisResult } from './analysis'
import { failure, type ActionResult } from './action-wrapper'
import { getRateLimiter } from '@/lib/utils/rate-limiter'
import { auth } from '@/lib/auth'
import { createLogger } from '@/lib/logging'

const log = createLogger('action-analysis-form')

// Validation schema for form data
const createAnalysisSchema = z.object({
  pageId: z.string().min(1, 'ID stránky je povinné'),
  industryCode: z.string().min(1).default('DEFAULT'),
})

export type CreateAnalysisFormState = ActionResult<CreateAnalysisResult>

/**
 * Server Action for creating analysis from form submission.
 * Compatible with React 19's useActionState hook.
 *
 * @param _prevState - Previous state (unused, required by useActionState)
 * @param formData - Form data from the form submission
 * @returns ActionResult with analysis ID or error
 */
export async function createAnalysisFormAction(
  _prevState: CreateAnalysisFormState | null,
  formData: FormData
): Promise<CreateAnalysisFormState> {
  try {
    // Rate limiting check
    const session = await auth()
    if (session?.user?.id) {
      const userId = session.user.id
      const limiter = getRateLimiter(`analysis-create-${userId}`, {
        maxRequests: 10,
        windowMs: 60 * 60 * 1000, // 1 hour
      })

      if (!limiter.canProceed()) {
        log.warn({ user_id: userId }, 'Analysis creation rate limit exceeded')
        return failure('Příliš mnoho požadavků. Zkuste to prosím později.', 'RATE_LIMITED')
      }

      await limiter.acquire()
    }

    // Extract and validate form data
    const rawData = {
      pageId: formData.get('pageId'),
      industryCode: formData.get('industryCode') || 'DEFAULT',
    }

    const parsed = createAnalysisSchema.safeParse(rawData)

    if (!parsed.success) {
      const firstError = parsed.error.issues[0]
      return failure(firstError?.message || 'Neplatná data', 'VALIDATION_ERROR')
    }

    // Call existing server action
    const result = await createAnalysis(parsed.data.pageId, parsed.data.industryCode)

    return result
  } catch (error) {
    log.error({ error }, 'Unexpected error in createAnalysisFormAction')
    return failure('Neočekávaná chyba při vytváření analýzy', 'INTERNAL_ERROR')
  }
}
