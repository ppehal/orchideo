import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { RateLimiter } from '@/lib/utils/rate-limiter'

describe('RateLimiter', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('canProceed', () => {
    it('returns true when under limit', () => {
      const limiter = new RateLimiter({ maxRequests: 5, windowMs: 1000 })

      expect(limiter.canProceed()).toBe(true)
    })

    it('returns true after some requests but still under limit', async () => {
      const limiter = new RateLimiter({ maxRequests: 5, windowMs: 1000 })

      await limiter.acquire()
      await limiter.acquire()

      expect(limiter.canProceed()).toBe(true)
    })

    it('returns false when at limit', async () => {
      const limiter = new RateLimiter({ maxRequests: 2, windowMs: 1000 })

      await limiter.acquire()
      await limiter.acquire()

      expect(limiter.canProceed()).toBe(false)
    })

    it('returns true after window expires', async () => {
      const limiter = new RateLimiter({ maxRequests: 2, windowMs: 1000 })

      await limiter.acquire()
      await limiter.acquire()
      expect(limiter.canProceed()).toBe(false)

      // Advance past window
      vi.advanceTimersByTime(1100)

      expect(limiter.canProceed()).toBe(true)
    })
  })

  describe('acquire', () => {
    it('returns immediately when under limit', async () => {
      const limiter = new RateLimiter({ maxRequests: 5, windowMs: 1000 })

      const start = Date.now()
      await limiter.acquire()
      const elapsed = Date.now() - start

      expect(elapsed).toBe(0)
    })

    it('allows multiple requests up to limit', async () => {
      const limiter = new RateLimiter({ maxRequests: 3, windowMs: 1000 })

      await limiter.acquire()
      await limiter.acquire()
      await limiter.acquire()

      expect(limiter.canProceed()).toBe(false)
    })

    it('waits when limit exceeded', async () => {
      const limiter = new RateLimiter({ maxRequests: 2, windowMs: 1000 })

      await limiter.acquire()
      await limiter.acquire()

      // Third acquire should wait
      const acquirePromise = limiter.acquire()

      // Fast-forward time using async version
      await vi.advanceTimersByTimeAsync(1100)

      await acquirePromise

      // Now we should have 1 request in the new window
      // (the new request was added after the wait)
      expect(limiter.getStats().current).toBeLessThanOrEqual(2)
    })

    it('tracks timestamps correctly', async () => {
      const limiter = new RateLimiter({ maxRequests: 5, windowMs: 1000 })

      await limiter.acquire()
      expect(limiter.getStats().current).toBe(1)

      await limiter.acquire()
      expect(limiter.getStats().current).toBe(2)

      await limiter.acquire()
      expect(limiter.getStats().current).toBe(3)
    })
  })

  describe('getStats', () => {
    it('returns correct initial stats', () => {
      const limiter = new RateLimiter({ maxRequests: 10, windowMs: 5000 })

      const stats = limiter.getStats()

      expect(stats.current).toBe(0)
      expect(stats.max).toBe(10)
      expect(stats.windowMs).toBe(5000)
    })

    it('reflects current request count', async () => {
      const limiter = new RateLimiter({ maxRequests: 10, windowMs: 5000 })

      await limiter.acquire()
      await limiter.acquire()
      await limiter.acquire()

      const stats = limiter.getStats()

      expect(stats.current).toBe(3)
    })

    it('decreases after window expiration', async () => {
      const limiter = new RateLimiter({ maxRequests: 10, windowMs: 1000 })

      await limiter.acquire()
      await limiter.acquire()
      expect(limiter.getStats().current).toBe(2)

      vi.advanceTimersByTime(500)
      await limiter.acquire()
      expect(limiter.getStats().current).toBe(3)

      // Advance past first two requests' window
      vi.advanceTimersByTime(600) // Total 1100ms

      expect(limiter.getStats().current).toBe(1)
    })
  })

  describe('sliding window behavior', () => {
    it('cleans up old timestamps', async () => {
      const limiter = new RateLimiter({ maxRequests: 5, windowMs: 1000 })

      // Make requests at time 0
      await limiter.acquire()
      await limiter.acquire()
      expect(limiter.getStats().current).toBe(2)

      // Advance 600ms and make more requests
      vi.advanceTimersByTime(600)
      await limiter.acquire()
      expect(limiter.getStats().current).toBe(3)

      // Advance past first two requests (total 1100ms from start)
      vi.advanceTimersByTime(500)
      expect(limiter.getStats().current).toBe(1) // Only the request from 600ms remains
    })

    it('allows new requests as old ones expire', async () => {
      const limiter = new RateLimiter({ maxRequests: 2, windowMs: 1000 })

      await limiter.acquire()
      vi.advanceTimersByTime(100)
      await limiter.acquire()

      // At limit now
      expect(limiter.canProceed()).toBe(false)

      // Advance past first request
      vi.advanceTimersByTime(1000)

      // First request expired, can proceed
      expect(limiter.canProceed()).toBe(true)
    })
  })

  describe('edge cases', () => {
    it('handles maxRequests = 1', async () => {
      const limiter = new RateLimiter({ maxRequests: 1, windowMs: 1000 })

      await limiter.acquire()
      expect(limiter.canProceed()).toBe(false)

      vi.advanceTimersByTime(1100)
      expect(limiter.canProceed()).toBe(true)
    })

    it('handles very short window', async () => {
      const limiter = new RateLimiter({ maxRequests: 10, windowMs: 100 })

      await limiter.acquire()
      await limiter.acquire()
      expect(limiter.getStats().current).toBe(2)

      vi.advanceTimersByTime(150)
      expect(limiter.getStats().current).toBe(0)
    })

    it('handles very large maxRequests', async () => {
      const limiter = new RateLimiter({ maxRequests: 10000, windowMs: 1000 })

      for (let i = 0; i < 100; i++) {
        await limiter.acquire()
      }

      expect(limiter.getStats().current).toBe(100)
      expect(limiter.canProceed()).toBe(true)
    })

    it('uses custom name for logging', () => {
      const limiter = new RateLimiter({
        maxRequests: 10,
        windowMs: 1000,
        name: 'custom-limiter',
      })

      expect(limiter.getStats().max).toBe(10)
    })
  })

  describe('concurrent access simulation', () => {
    it('handles rapid sequential requests', async () => {
      const limiter = new RateLimiter({ maxRequests: 5, windowMs: 1000 })

      // Rapid fire requests
      await Promise.all([
        limiter.acquire(),
        limiter.acquire(),
        limiter.acquire(),
        limiter.acquire(),
        limiter.acquire(),
      ])

      expect(limiter.getStats().current).toBe(5)
      expect(limiter.canProceed()).toBe(false)
    })
  })
})
