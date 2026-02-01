/**
 * Wrappers for server actions to reduce boilerplate.
 * DRY: Eliminates repeated auth checks and try-catch patterns.
 *
 * Adapted from Invix patterns for Orchideo's simpler auth model.
 */

import { auth } from '@/lib/auth'
import { createLogger, logError } from '@/lib/logging'
import type { Session } from 'next-auth'

const log = createLogger('action-wrapper')

// ============================================================================
// Types
// ============================================================================

/**
 * Standard result type for server actions.
 *
 * Usage patterns:
 * - Create: return success({ id: record.id })
 * - Update: return success()
 * - Delete: return success()
 * - Error: return failure("message")
 */
export interface ActionResult<T = unknown> {
  success: boolean
  data?: T
  error?: string
  code?: string
}

type ActionFn<T> = () => Promise<T>
type AuthenticatedActionFn<T> = (session: Session) => Promise<T>

// ============================================================================
// Result Helpers
// ============================================================================

/**
 * Creates a successful ActionResult with optional data.
 *
 * @example
 * // Create operation - return new ID
 * return success({ id: record.id })
 *
 * // Update/Delete - no data needed
 * return success()
 *
 * // Return computed data
 * return success({ count: 5, items: [...] })
 */
export function success<T = void>(data?: T): ActionResult<T> {
  return data !== undefined ? { success: true, data } : { success: true }
}

/**
 * Creates a failed ActionResult with error message.
 *
 * @example
 * return failure("Záznam nebyl nalezen")
 * return failure("Chyba při zpracování", "PROCESSING_ERROR")
 */
export function failure(error: string, code?: string): ActionResult<never> {
  return code ? { success: false, error, code } : { success: false, error }
}

/**
 * Returns a "not found" error result.
 *
 * @example
 * const analysis = await prisma.analysis.findUnique({ where: { id } })
 * if (!analysis) return notFound("Analýza")
 */
export function notFound(entityLabel: string): ActionResult<never> {
  return { success: false, error: `${entityLabel} nebyla nalezena`, code: 'NOT_FOUND' }
}

/**
 * Returns an "unauthorized" error result.
 */
export function unauthorized(): ActionResult<never> {
  return { success: false, error: 'Nepřihlášen', code: 'UNAUTHORIZED' }
}

// ============================================================================
// Error Handling Wrapper
// ============================================================================

/**
 * Wraps an async action with try-catch error handling.
 * Logs errors and returns a standardized ActionResult.
 *
 * @example
 * export async function deleteAnalysis(id: string): Promise<ActionResult> {
 *   return wrapAction(
 *     async () => {
 *       await prisma.analysis.delete({ where: { id } })
 *       return success()
 *     },
 *     "Nepodařilo se smazat analýzu",
 *     { id }
 *   )
 * }
 */
export async function wrapAction<T extends ActionResult>(
  action: ActionFn<T>,
  errorMessage: string,
  context?: Record<string, unknown>
): Promise<T | ActionResult<never>> {
  try {
    return await action()
  } catch (error) {
    logError(log, error, `wrapAction: ${errorMessage}`, context)
    return { success: false, error: errorMessage, code: 'INTERNAL_ERROR' }
  }
}

// ============================================================================
// Auth + Error Handling Wrapper
// ============================================================================

/**
 * Wraps an action with auth check and error handling.
 * Returns auth error if not authenticated.
 *
 * @example
 * export async function createAnalysis(pageId: string): Promise<ActionResult> {
 *   return withAuth(async (session) => {
 *     const analysis = await prisma.analysis.create({
 *       data: { pageId, userId: session.user.id }
 *     })
 *     return success({ id: analysis.id })
 *   }, "Nepodařilo se vytvořit analýzu", { pageId })
 * }
 */
export async function withAuth<T extends ActionResult>(
  action: AuthenticatedActionFn<T>,
  errorMessage: string,
  context?: Record<string, unknown>
): Promise<T | ActionResult<never>> {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return unauthorized()
    }
    return await action(session)
  } catch (error) {
    logError(log, error, `withAuth: ${errorMessage}`, context)
    return { success: false, error: errorMessage, code: 'INTERNAL_ERROR' }
  }
}
