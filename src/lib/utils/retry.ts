/**
 * Retry utility with exponential backoff for resilient API calls.
 *
 * Note: Facebook API client already has retry built-in via makeRequest().
 * This utility is for other external API calls or general use.
 */

import { createLogger } from '@/lib/logging'

const log = createLogger('retry')

export interface RetryOptions {
  /** Maximum number of retry attempts (default: 3) */
  maxRetries?: number
  /** Base delay in milliseconds (default: 1000) */
  baseDelayMs?: number
  /** Maximum delay in milliseconds (default: 30000) */
  maxDelayMs?: number
  /** Custom function to determine if error should be retried */
  shouldRetry?: (error: unknown) => boolean
  /** Operation name for logging */
  operationName?: string
}

/**
 * Default retry predicate - retries on network errors and 5xx responses
 */
export function isRetryableError(error: unknown): boolean {
  // Network errors (fetch failures)
  if (error instanceof TypeError && error.message.includes('fetch')) {
    return true
  }

  // Timeout errors
  if (error instanceof Error && error.name === 'TimeoutError') {
    return true
  }

  // AbortError from timeouts
  if (error instanceof DOMException && error.name === 'AbortError') {
    return true
  }

  // HTTP response errors (wrapped in our custom error)
  if (error instanceof RetryableHttpError) {
    return true
  }

  // Generic error with status code (5xx)
  if (
    error instanceof Error &&
    'status' in error &&
    typeof (error as { status: unknown }).status === 'number'
  ) {
    const status = (error as { status: number }).status
    return status >= 500 && status < 600
  }

  return false
}

/**
 * Custom error for retryable HTTP responses
 */
export class RetryableHttpError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly responseBody?: string
  ) {
    super(message)
    this.name = 'RetryableHttpError'
  }
}

/**
 * Calculate delay with exponential backoff and jitter
 */
function calculateDelay(attempt: number, baseDelayMs: number, maxDelayMs: number): number {
  // Exponential backoff: baseDelay * 2^attempt
  const exponentialDelay = baseDelayMs * Math.pow(2, attempt)

  // Cap at maxDelay
  const cappedDelay = Math.min(exponentialDelay, maxDelayMs)

  // Add jitter (0-20% random variation)
  const jitter = cappedDelay * Math.random() * 0.2

  return Math.floor(cappedDelay + jitter)
}

/**
 * Sleep for specified milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Execute a function with retry logic and exponential backoff
 *
 * @example
 * ```ts
 * const result = await withRetry(
 *   () => fetch('https://api.example.com/data'),
 *   { maxRetries: 3, operationName: 'fetchData' }
 * )
 * ```
 */
export async function withRetry<T>(fn: () => Promise<T>, options?: RetryOptions): Promise<T> {
  const {
    maxRetries = 3,
    baseDelayMs = 1000,
    maxDelayMs = 30000,
    shouldRetry = isRetryableError,
    operationName = 'operation',
  } = options ?? {}

  let lastError: unknown

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error

      // Check if we should retry
      if (attempt < maxRetries && shouldRetry(error)) {
        const delay = calculateDelay(attempt, baseDelayMs, maxDelayMs)

        log.warn(
          {
            operation: operationName,
            attempt: attempt + 1,
            maxRetries,
            delayMs: delay,
            error:
              error instanceof Error ? { name: error.name, message: error.message } : String(error),
          },
          `Retry attempt ${attempt + 1}/${maxRetries} for ${operationName}`
        )

        await sleep(delay)
      } else {
        // Not retryable or max retries reached
        if (attempt > 0) {
          log.error(
            {
              operation: operationName,
              attempts: attempt + 1,
              error:
                error instanceof Error
                  ? { name: error.name, message: error.message }
                  : String(error),
            },
            `All ${attempt + 1} retry attempts failed for ${operationName}`
          )
        }
        throw error
      }
    }
  }

  // Should never reach here, but TypeScript needs it
  throw lastError
}

/**
 * Wrap fetch with retry capability
 * Throws RetryableHttpError for 5xx responses
 */
export async function fetchWithRetry(
  input: RequestInfo | URL,
  init?: RequestInit,
  retryOptions?: RetryOptions
): Promise<Response> {
  return withRetry(
    async () => {
      const response = await fetch(input, init)

      // Convert 5xx to retryable error
      if (response.status >= 500 && response.status < 600) {
        const body = await response.text().catch(() => '')
        throw new RetryableHttpError(
          `HTTP ${response.status}: ${response.statusText}`,
          response.status,
          body
        )
      }

      return response
    },
    {
      operationName:
        retryOptions?.operationName ?? (typeof input === 'string' ? input : input.toString()),
      ...retryOptions,
    }
  )
}
