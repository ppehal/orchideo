import { describe, it, expect, vi } from 'vitest'
import { isRetryableError, RetryableHttpError, withRetry } from '@/lib/utils/retry'

describe('isRetryableError', () => {
  describe('network errors', () => {
    it('returns true for fetch TypeError', () => {
      const error = new TypeError('fetch failed')
      expect(isRetryableError(error)).toBe(true)
    })

    it('returns true for network fetch error', () => {
      const error = new TypeError('Failed to fetch')
      expect(isRetryableError(error)).toBe(true)
    })

    it('returns false for non-fetch TypeError', () => {
      const error = new TypeError('Cannot read property of undefined')
      expect(isRetryableError(error)).toBe(false)
    })
  })

  describe('timeout errors', () => {
    it('returns true for TimeoutError', () => {
      const error = new Error('Timeout')
      error.name = 'TimeoutError'
      expect(isRetryableError(error)).toBe(true)
    })

    it('returns true for AbortError (from timeout)', () => {
      const error = new DOMException('Aborted', 'AbortError')
      expect(isRetryableError(error)).toBe(true)
    })
  })

  describe('HTTP status errors', () => {
    it('returns true for RetryableHttpError', () => {
      const error = new RetryableHttpError('Server error', 500)
      expect(isRetryableError(error)).toBe(true)
    })

    it('returns true for 500 status', () => {
      const error = new Error('Internal Server Error') as Error & { status: number }
      error.status = 500
      expect(isRetryableError(error)).toBe(true)
    })

    it('returns true for 502 status', () => {
      const error = new Error('Bad Gateway') as Error & { status: number }
      error.status = 502
      expect(isRetryableError(error)).toBe(true)
    })

    it('returns true for 503 status', () => {
      const error = new Error('Service Unavailable') as Error & { status: number }
      error.status = 503
      expect(isRetryableError(error)).toBe(true)
    })

    it('returns true for 599 status (edge of 5xx)', () => {
      const error = new Error('Network error') as Error & { status: number }
      error.status = 599
      expect(isRetryableError(error)).toBe(true)
    })

    it('returns false for 400 status', () => {
      const error = new Error('Bad Request') as Error & { status: number }
      error.status = 400
      expect(isRetryableError(error)).toBe(false)
    })

    it('returns false for 401 status', () => {
      const error = new Error('Unauthorized') as Error & { status: number }
      error.status = 401
      expect(isRetryableError(error)).toBe(false)
    })

    it('returns false for 404 status', () => {
      const error = new Error('Not Found') as Error & { status: number }
      error.status = 404
      expect(isRetryableError(error)).toBe(false)
    })

    it('returns false for 429 status (rate limit)', () => {
      const error = new Error('Too Many Requests') as Error & { status: number }
      error.status = 429
      expect(isRetryableError(error)).toBe(false)
    })

    it('returns false for 600 status (outside 5xx)', () => {
      const error = new Error('Error') as Error & { status: number }
      error.status = 600
      expect(isRetryableError(error)).toBe(false)
    })
  })

  describe('non-retryable errors', () => {
    it('returns false for generic Error', () => {
      const error = new Error('Something went wrong')
      expect(isRetryableError(error)).toBe(false)
    })

    it('returns false for string error', () => {
      expect(isRetryableError('error')).toBe(false)
    })

    it('returns false for null', () => {
      expect(isRetryableError(null)).toBe(false)
    })

    it('returns false for undefined', () => {
      expect(isRetryableError(undefined)).toBe(false)
    })
  })
})

describe('RetryableHttpError', () => {
  it('creates error with status', () => {
    const error = new RetryableHttpError('Server error', 500)

    expect(error.name).toBe('RetryableHttpError')
    expect(error.message).toBe('Server error')
    expect(error.status).toBe(500)
  })

  it('creates error with response body', () => {
    const error = new RetryableHttpError('Error', 503, '{"error": "service unavailable"}')

    expect(error.responseBody).toBe('{"error": "service unavailable"}')
  })

  it('is instance of Error', () => {
    const error = new RetryableHttpError('Test', 500)

    expect(error instanceof Error).toBe(true)
    expect(error instanceof RetryableHttpError).toBe(true)
  })
})

describe('withRetry', () => {
  it('returns result on first success', async () => {
    const fn = vi.fn().mockResolvedValue('success')

    const result = await withRetry(fn)

    expect(result).toBe('success')
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('throws immediately on non-retryable error', async () => {
    const error = new Error('Not retryable')
    const fn = vi.fn().mockRejectedValue(error)

    await expect(withRetry(fn)).rejects.toThrow('Not retryable')
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('respects maxRetries = 0', async () => {
    const error = new RetryableHttpError('Error', 500)
    const fn = vi.fn().mockRejectedValue(error)

    await expect(withRetry(fn, { maxRetries: 0 })).rejects.toBeInstanceOf(RetryableHttpError)
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('retries on retryable error and succeeds (real timing)', async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new RetryableHttpError('Error', 500))
      .mockResolvedValueOnce('success')

    const result = await withRetry(fn, {
      maxRetries: 3,
      baseDelayMs: 10, // Very short for testing
      maxDelayMs: 50,
    })

    expect(result).toBe('success')
    expect(fn).toHaveBeenCalledTimes(2)
  }, 1000)

  it('uses custom shouldRetry predicate (real timing)', async () => {
    const customError = new Error('Custom error')
    const fn = vi.fn().mockRejectedValueOnce(customError).mockResolvedValueOnce('success')

    const result = await withRetry(fn, {
      maxRetries: 3,
      baseDelayMs: 10,
      maxDelayMs: 50,
      shouldRetry: (err) => err instanceof Error && err.message === 'Custom error',
    })

    expect(result).toBe('success')
    expect(fn).toHaveBeenCalledTimes(2)
  }, 1000)

  it('throws after max retries exceeded (real timing)', async () => {
    const error = new RetryableHttpError('Error', 500)
    const fn = vi.fn().mockRejectedValue(error)

    await expect(
      withRetry(fn, {
        maxRetries: 2,
        baseDelayMs: 5,
        maxDelayMs: 20,
      })
    ).rejects.toBeInstanceOf(RetryableHttpError)

    expect(fn).toHaveBeenCalledTimes(3) // Initial + 2 retries
  }, 1000)
})

describe('exponential backoff (conceptual tests)', () => {
  it('calculates exponential delay correctly', () => {
    // Testing the exponential growth pattern
    const baseDelay = 1000
    const maxDelay = 30000

    const calculateDelay = (attempt: number) => {
      const exponentialDelay = baseDelay * Math.pow(2, attempt)
      return Math.min(exponentialDelay, maxDelay)
    }

    expect(calculateDelay(0)).toBe(1000) // 1000 * 2^0 = 1000
    expect(calculateDelay(1)).toBe(2000) // 1000 * 2^1 = 2000
    expect(calculateDelay(2)).toBe(4000) // 1000 * 2^2 = 4000
    expect(calculateDelay(3)).toBe(8000) // 1000 * 2^3 = 8000
    expect(calculateDelay(4)).toBe(16000) // 1000 * 2^4 = 16000
    expect(calculateDelay(5)).toBe(30000) // Capped at maxDelay
    expect(calculateDelay(10)).toBe(30000) // Still capped
  })

  it('caps at maximum delay', () => {
    const baseDelay = 1000
    const maxDelay = 5000

    const calculateDelay = (attempt: number) => {
      const exponentialDelay = baseDelay * Math.pow(2, attempt)
      return Math.min(exponentialDelay, maxDelay)
    }

    expect(calculateDelay(0)).toBe(1000)
    expect(calculateDelay(1)).toBe(2000)
    expect(calculateDelay(2)).toBe(4000)
    expect(calculateDelay(3)).toBe(5000) // Capped
    expect(calculateDelay(4)).toBe(5000) // Still capped
  })
})
