/**
 * Facebook API Error Classification tests.
 *
 * CRITICAL: Proper error classification drives retry behavior, which is
 * essential for handling rate limits and transient failures correctly.
 */

import { describe, it, expect } from 'vitest'
import { FacebookApiError } from '@/lib/integrations/facebook/client'

describe('FacebookApiError', () => {
  describe('error construction', () => {
    it('creates error with required fields', () => {
      const error = new FacebookApiError('Test error', 190, 'OAuthException')

      expect(error).toBeInstanceOf(Error)
      expect(error).toBeInstanceOf(FacebookApiError)
      expect(error.name).toBe('FacebookApiError')
      expect(error.message).toBe('Test error')
      expect(error.code).toBe(190)
      expect(error.type).toBe('OAuthException')
      expect(error.subcode).toBeUndefined()
      expect(error.fbtrace_id).toBeUndefined()
    })

    it('creates error with optional fields', () => {
      const error = new FacebookApiError('Detailed error', 200, 'OAuthException', 1234, 'AbC123XyZ')

      expect(error.subcode).toBe(1234)
      expect(error.fbtrace_id).toBe('AbC123XyZ')
    })

    it('creates error from Facebook response format', () => {
      const fbResponse = {
        message: 'Invalid OAuth access token',
        type: 'OAuthException',
        code: 190,
        error_subcode: 463,
        fbtrace_id: 'ABC123',
      }

      const error = FacebookApiError.fromResponse(fbResponse)

      expect(error.message).toBe('Invalid OAuth access token')
      expect(error.code).toBe(190)
      expect(error.type).toBe('OAuthException')
      expect(error.subcode).toBe(463)
      expect(error.fbtrace_id).toBe('ABC123')
    })
  })

  describe('isRateLimited', () => {
    it('returns true for code 4 (app rate limit)', () => {
      const error = new FacebookApiError('App rate limit', 4, 'OAuthException')
      expect(error.isRateLimited()).toBe(true)
    })

    it('returns true for code 17 (user rate limit)', () => {
      const error = new FacebookApiError('User rate limit', 17, 'OAuthException')
      expect(error.isRateLimited()).toBe(true)
    })

    it('returns true for code 32 (page rate limit)', () => {
      const error = new FacebookApiError('Page rate limit', 32, 'OAuthException')
      expect(error.isRateLimited()).toBe(true)
    })

    it('returns true for code 613 (rate limit reached)', () => {
      const error = new FacebookApiError('Rate limit reached', 613, 'OAuthException')
      expect(error.isRateLimited()).toBe(true)
    })

    it('returns false for other codes', () => {
      const codes = [1, 2, 10, 100, 190, 200, 230, 999]

      codes.forEach((code) => {
        const error = new FacebookApiError('Other error', code, 'OAuthException')
        expect(error.isRateLimited()).toBe(false)
      })
    })
  })

  describe('isTokenExpired', () => {
    it('returns true for code 190 (invalid/expired token)', () => {
      const error = new FacebookApiError('Token expired', 190, 'OAuthException')
      expect(error.isTokenExpired()).toBe(true)
    })

    it('returns false for other codes', () => {
      const codes = [1, 2, 4, 10, 17, 32, 100, 200, 230, 613, 999]

      codes.forEach((code) => {
        const error = new FacebookApiError('Other error', code, 'OAuthException')
        expect(error.isTokenExpired()).toBe(false)
      })
    })
  })

  describe('isPermissionDenied', () => {
    it('returns true for code 10 (permission denied)', () => {
      const error = new FacebookApiError('Permission denied', 10, 'OAuthException')
      expect(error.isPermissionDenied()).toBe(true)
    })

    it('returns true for code 200 (permission not granted)', () => {
      const error = new FacebookApiError('Permission not granted', 200, 'OAuthException')
      expect(error.isPermissionDenied()).toBe(true)
    })

    it('returns true for code 230 (permission requires approval)', () => {
      const error = new FacebookApiError('Permission requires approval', 230, 'OAuthException')
      expect(error.isPermissionDenied()).toBe(true)
    })

    it('returns false for other codes', () => {
      const codes = [1, 2, 4, 17, 32, 100, 190, 613, 999]

      codes.forEach((code) => {
        const error = new FacebookApiError('Other error', code, 'OAuthException')
        expect(error.isPermissionDenied()).toBe(false)
      })
    })
  })

  describe('isRetryable', () => {
    it('returns true for rate limit errors', () => {
      const rateLimitCodes = [4, 17, 32, 613]

      rateLimitCodes.forEach((code) => {
        const error = new FacebookApiError('Rate limited', code, 'OAuthException')
        expect(error.isRetryable()).toBe(true)
      })
    })

    it('returns true for code 1 (temporary API error)', () => {
      const error = new FacebookApiError('Temporary error', 1, 'OAuthException')
      expect(error.isRetryable()).toBe(true)
    })

    it('returns true for code 2 (temporary API error)', () => {
      const error = new FacebookApiError('Temporary error', 2, 'OAuthException')
      expect(error.isRetryable()).toBe(true)
    })

    it('returns false for token expired (190)', () => {
      const error = new FacebookApiError('Token expired', 190, 'OAuthException')
      expect(error.isRetryable()).toBe(false)
    })

    it('returns false for permission denied (10, 200, 230)', () => {
      const permissionCodes = [10, 200, 230]

      permissionCodes.forEach((code) => {
        const error = new FacebookApiError('Permission denied', code, 'OAuthException')
        expect(error.isRetryable()).toBe(false)
      })
    })

    it('returns false for unknown error codes', () => {
      const unknownCodes = [100, 999, 500, 404]

      unknownCodes.forEach((code) => {
        const error = new FacebookApiError('Unknown error', code, 'OAuthException')
        expect(error.isRetryable()).toBe(false)
      })
    })
  })

  describe('error classification combinations', () => {
    it('rate limited error is retryable but not expired/denied', () => {
      const error = new FacebookApiError('Rate limited', 4, 'OAuthException')

      expect(error.isRateLimited()).toBe(true)
      expect(error.isRetryable()).toBe(true)
      expect(error.isTokenExpired()).toBe(false)
      expect(error.isPermissionDenied()).toBe(false)
    })

    it('token expired error is not retryable', () => {
      const error = new FacebookApiError('Token expired', 190, 'OAuthException')

      expect(error.isTokenExpired()).toBe(true)
      expect(error.isRetryable()).toBe(false)
      expect(error.isRateLimited()).toBe(false)
      expect(error.isPermissionDenied()).toBe(false)
    })

    it('permission denied error is not retryable', () => {
      const error = new FacebookApiError('Permission denied', 200, 'OAuthException')

      expect(error.isPermissionDenied()).toBe(true)
      expect(error.isRetryable()).toBe(false)
      expect(error.isRateLimited()).toBe(false)
      expect(error.isTokenExpired()).toBe(false)
    })

    it('temporary error is retryable but not rate limited', () => {
      const error = new FacebookApiError('Temporary error', 1, 'OAuthException')

      expect(error.isRetryable()).toBe(true)
      expect(error.isRateLimited()).toBe(false)
      expect(error.isTokenExpired()).toBe(false)
      expect(error.isPermissionDenied()).toBe(false)
    })
  })

  describe('real-world error scenarios', () => {
    it('handles rate limit with subcode', () => {
      const error = FacebookApiError.fromResponse({
        message: 'Application request limit reached',
        type: 'OAuthException',
        code: 4,
        error_subcode: 33,
        fbtrace_id: 'ABC123',
      })

      expect(error.isRateLimited()).toBe(true)
      expect(error.isRetryable()).toBe(true)
      expect(error.subcode).toBe(33)
    })

    it('handles expired token with subcode 463', () => {
      const error = FacebookApiError.fromResponse({
        message: 'The session has been invalidated',
        type: 'OAuthException',
        code: 190,
        error_subcode: 463,
      })

      expect(error.isTokenExpired()).toBe(true)
      expect(error.isRetryable()).toBe(false)
      expect(error.subcode).toBe(463)
    })

    it('handles permission error with detailed message', () => {
      const error = FacebookApiError.fromResponse({
        message: 'Permissions error: pages_read_engagement',
        type: 'OAuthException',
        code: 200,
      })

      expect(error.isPermissionDenied()).toBe(true)
      expect(error.isRetryable()).toBe(false)
      expect(error.message).toContain('pages_read_engagement')
    })

    it('handles generic API error', () => {
      const error = FacebookApiError.fromResponse({
        message: 'Unknown error occurred',
        type: 'FacebookApiException',
        code: 1,
      })

      expect(error.isRetryable()).toBe(true)
      expect(error.type).toBe('FacebookApiException')
    })
  })

  describe('edge cases', () => {
    it('handles error with no subcode', () => {
      const error = FacebookApiError.fromResponse({
        message: 'Error',
        type: 'OAuthException',
        code: 190,
      })

      expect(error.subcode).toBeUndefined()
      expect(error.fbtrace_id).toBeUndefined()
    })

    it('handles error with empty message', () => {
      const error = new FacebookApiError('', 190, 'OAuthException')

      expect(error.message).toBe('')
      expect(error.code).toBe(190)
    })

    it('preserves stack trace', () => {
      const error = new FacebookApiError('Test', 190, 'OAuthException')

      expect(error.stack).toBeDefined()
      expect(error.stack).toContain('FacebookApiError')
    })
  })
})
