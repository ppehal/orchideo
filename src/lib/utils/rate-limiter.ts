/**
 * Rate limiter utility for controlling API request frequency.
 *
 * Uses sliding window algorithm to limit requests.
 * Note: Facebook API client already handles rate limiting via retry logic,
 * but this can be used proactively to avoid hitting limits.
 */

import { createLogger } from '@/lib/logging'

const log = createLogger('rate-limiter')

export interface RateLimiterOptions {
  /** Maximum number of requests allowed in the window */
  maxRequests: number
  /** Time window in milliseconds */
  windowMs: number
  /** Name for logging */
  name?: string
}

/**
 * Simple sliding window rate limiter.
 *
 * @example
 * ```ts
 * // Allow 100 requests per minute
 * const limiter = new RateLimiter({
 *   maxRequests: 100,
 *   windowMs: 60_000,
 *   name: 'facebook-api'
 * })
 *
 * // Before making a request
 * await limiter.acquire()
 * const response = await fetch(url)
 * ```
 */
export class RateLimiter {
  private readonly maxRequests: number
  private readonly windowMs: number
  private readonly name: string
  private readonly timestamps: number[] = []

  constructor(options: RateLimiterOptions) {
    this.maxRequests = options.maxRequests
    this.windowMs = options.windowMs
    this.name = options.name ?? 'rate-limiter'
  }

  /**
   * Wait until a request slot is available.
   * Returns immediately if under the limit, otherwise waits.
   */
  async acquire(): Promise<void> {
    const now = Date.now()
    this.cleanup(now)

    if (this.timestamps.length < this.maxRequests) {
      this.timestamps.push(now)
      return
    }

    // Calculate wait time until oldest request expires
    const oldestTimestamp = this.timestamps[0]
    if (oldestTimestamp === undefined) {
      this.timestamps.push(now)
      return
    }

    const waitTime = oldestTimestamp + this.windowMs - now

    if (waitTime > 0) {
      log.debug(
        {
          limiter: this.name,
          waitMs: waitTime,
          currentRequests: this.timestamps.length,
          maxRequests: this.maxRequests,
        },
        'Rate limit reached, waiting'
      )

      await this.sleep(waitTime)
      this.cleanup(Date.now())
    }

    this.timestamps.push(Date.now())
  }

  /**
   * Check if a request can be made immediately without waiting.
   */
  canProceed(): boolean {
    this.cleanup(Date.now())
    return this.timestamps.length < this.maxRequests
  }

  /**
   * Get current usage stats.
   */
  getStats(): { current: number; max: number; windowMs: number } {
    this.cleanup(Date.now())
    return {
      current: this.timestamps.length,
      max: this.maxRequests,
      windowMs: this.windowMs,
    }
  }

  /**
   * Remove timestamps outside the current window.
   */
  private cleanup(now: number): void {
    const windowStart = now - this.windowMs
    let oldest = this.timestamps[0]
    while (oldest !== undefined && oldest < windowStart) {
      this.timestamps.shift()
      oldest = this.timestamps[0]
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }
}

/**
 * Singleton rate limiters for common use cases.
 * Initialize once, reuse across requests.
 */
const limiters = new Map<string, RateLimiter>()

/**
 * Get or create a named rate limiter.
 *
 * @example
 * ```ts
 * // Get a limiter for Facebook API (200 calls/hour)
 * const limiter = getRateLimiter('facebook', {
 *   maxRequests: 200,
 *   windowMs: 60 * 60 * 1000
 * })
 *
 * await limiter.acquire()
 * ```
 */
export function getRateLimiter(
  name: string,
  options?: Omit<RateLimiterOptions, 'name'>
): RateLimiter {
  let limiter = limiters.get(name)

  if (!limiter) {
    if (!options) {
      throw new Error(`Rate limiter "${name}" not initialized. Provide options on first call.`)
    }

    limiter = new RateLimiter({
      ...options,
      name,
    })
    limiters.set(name, limiter)

    log.info(
      {
        limiter: name,
        maxRequests: options.maxRequests,
        windowMs: options.windowMs,
      },
      'Rate limiter initialized'
    )
  }

  return limiter
}
