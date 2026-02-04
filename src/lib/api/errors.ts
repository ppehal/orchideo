import { NextResponse } from 'next/server'

/**
 * Custom API Error class for standardized error handling
 * Extends Error to support standard error properties
 */
export class ApiError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly code: string,
    message: string,
    public readonly details?: unknown
  ) {
    super(message)
    this.name = 'ApiError'

    // Maintains proper stack trace for where error was thrown (V8 only)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ApiError)
    }
  }

  /**
   * Convert error to JSON response format
   */
  toJSON() {
    const result: { error: string; code: string; details?: unknown } = {
      error: this.message,
      code: this.code,
    }
    if (this.details !== undefined) {
      result.details = this.details
    }
    return result
  }
}

/**
 * Pre-defined API errors with standardized messages
 * Use these instead of creating ApiError directly for consistency
 */
export const ApiErrors = {
  /**
   * 401 Unauthorized - User not authenticated
   */
  UNAUTHORIZED: () => new ApiError(401, 'UNAUTHORIZED', 'Nepřihlášen'),

  /**
   * 403 Forbidden - User authenticated but lacks permission
   */
  FORBIDDEN: (resource?: string) =>
    new ApiError(
      403,
      'FORBIDDEN',
      resource ? `Nemáte oprávnění k ${resource}` : 'Nemáte oprávnění'
    ),

  /**
   * 404 Not Found - Resource doesn't exist
   */
  NOT_FOUND: (resource?: string) =>
    new ApiError(
      404,
      'NOT_FOUND',
      resource ? `${resource} nenalezen` : 'Nenalezeno'
    ),

  /**
   * 400 Bad Request - Invalid input data
   */
  VALIDATION_ERROR: (details?: unknown) =>
    new ApiError(400, 'VALIDATION_ERROR', 'Neplatná data', details),

  /**
   * 429 Too Many Requests - Rate limit exceeded
   */
  RATE_LIMIT: (retryAfter?: number) =>
    new ApiError(
      429,
      'RATE_LIMIT_EXCEEDED',
      'Příliš mnoho požadavků. Zkuste to prosím později.',
      retryAfter ? { retryAfter } : undefined
    ),

  /**
   * 409 Conflict - Resource already exists or conflict state
   */
  CONFLICT: (message?: string) =>
    new ApiError(409, 'CONFLICT', message || 'Konflikt při vytváření zdroje'),

  /**
   * 410 Gone - Resource expired or permanently deleted
   */
  GONE: (resource?: string) =>
    new ApiError(
      410,
      'GONE',
      resource ? `${resource} vypršel` : 'Zdroj vypršel'
    ),

  /**
   * 500 Internal Server Error - Generic server error
   */
  INTERNAL_ERROR: (details?: string) =>
    new ApiError(
      500,
      'INTERNAL_ERROR',
      details || 'Interní chyba serveru'
    ),

  /**
   * 503 Service Unavailable - External service unavailable
   */
  SERVICE_UNAVAILABLE: (service?: string) =>
    new ApiError(
      503,
      'SERVICE_UNAVAILABLE',
      service ? `Služba ${service} není dostupná` : 'Služba není dostupná'
    ),
} as const

/**
 * Global error handler for API routes
 * Converts any error to standardized JSON response
 *
 * Usage:
 * ```typescript
 * try {
 *   // ... route logic
 * } catch (error) {
 *   return handleApiError(error)
 * }
 * ```
 */
export function handleApiError(error: unknown): Response {
  // Handle known ApiError instances
  if (error instanceof ApiError) {
    const headers: HeadersInit = {}

    // Add Retry-After header for rate limit errors
    if (error.code === 'RATE_LIMIT_EXCEEDED' && error.details) {
      const details = error.details as { retryAfter?: number }
      if (details.retryAfter) {
        headers['Retry-After'] = String(details.retryAfter)
      }
    }

    return NextResponse.json(error.toJSON(), {
      status: error.statusCode,
      headers,
    })
  }

  // Handle standard Error instances
  if (error instanceof Error) {
    // Log unexpected errors (ApiErrors are expected)
    console.error('[API] Unhandled error:', error)

    return NextResponse.json(
      {
        error: 'Interní chyba serveru',
        code: 'INTERNAL_ERROR',
      },
      { status: 500 }
    )
  }

  // Handle unknown error types
  console.error('[API] Unknown error type:', error)
  return NextResponse.json(
    {
      error: 'Interní chyba serveru',
      code: 'INTERNAL_ERROR',
    },
    { status: 500 }
  )
}

/**
 * Type guard to check if error is an ApiError
 */
export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError
}
