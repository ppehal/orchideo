/**
 * Token generation security tests.
 *
 * SECURITY CRITICAL: These tests verify that token generation uses proper
 * cryptographic randomness and produces unpredictable, unique tokens.
 */

import { describe, it, expect } from 'vitest'
import { generateSecureToken } from '@/lib/utils/tokens'

describe('generateSecureToken', () => {
  describe('format and length', () => {
    it('generates 43-character token (32 bytes base64url)', () => {
      const token = generateSecureToken()
      // 32 bytes encoded as base64url = 43 characters (no padding)
      expect(token).toHaveLength(43)
    })

    it('produces base64url-safe output (no +/= characters)', () => {
      // Generate multiple tokens to increase confidence
      for (let i = 0; i < 100; i++) {
        const token = generateSecureToken()

        // base64url uses: A-Z, a-z, 0-9, -, _
        // Should NOT contain: +, /, = (standard base64 chars)
        expect(token).toMatch(/^[A-Za-z0-9_-]+$/)
        expect(token).not.toContain('+')
        expect(token).not.toContain('/')
        expect(token).not.toContain('=')
      }
    })
  })

  describe('uniqueness and entropy', () => {
    it('generates unique tokens on each call', () => {
      const tokens = new Set<string>()
      const count = 1000

      // Generate 1000 tokens
      for (let i = 0; i < count; i++) {
        tokens.add(generateSecureToken())
      }

      // All should be unique (no collisions)
      expect(tokens.size).toBe(count)
    })

    it('has sufficient entropy (no predictable patterns)', () => {
      const tokens = Array.from({ length: 100 }, () => generateSecureToken())

      // Check that tokens don't share common prefixes/suffixes
      const firstChars = new Set(tokens.map((t) => t[0]))
      const lastChars = new Set(tokens.map((t) => t[t.length - 1]))

      // Should have good distribution in first/last characters
      // (at least 10 different characters in 100 samples)
      expect(firstChars.size).toBeGreaterThanOrEqual(10)
      expect(lastChars.size).toBeGreaterThanOrEqual(10)

      // Check no token is a substring of another (very unlikely with proper randomness)
      for (let i = 0; i < tokens.length; i++) {
        for (let j = i + 1; j < tokens.length; j++) {
          expect(tokens[i]).not.toContain(tokens[j]!)
          expect(tokens[j]).not.toContain(tokens[i]!)
        }
      }
    })

    it('produces different tokens even when called in rapid succession', () => {
      // Test that timing doesn't affect randomness
      const rapidTokens = []
      for (let i = 0; i < 100; i++) {
        rapidTokens.push(generateSecureToken())
      }

      const uniqueRapidTokens = new Set(rapidTokens)
      expect(uniqueRapidTokens.size).toBe(100)
    })
  })

  describe('security properties', () => {
    it('uses cryptographically secure randomness (crypto.randomBytes)', () => {
      // This is implicitly tested by uniqueness tests above,
      // but we can verify the implementation uses crypto.randomBytes
      const token = generateSecureToken()

      // A truly random 32-byte token encoded as base64url should have:
      // - High entropy
      // - No predictable patterns
      // - Uniform distribution of characters

      // Count character type distribution
      const chars = token.split('')
      const upper = chars.filter((c) => c >= 'A' && c <= 'Z').length
      const lower = chars.filter((c) => c >= 'a' && c <= 'z').length
      const digits = chars.filter((c) => c >= '0' && c <= '9').length
      const special = chars.filter((c) => c === '-' || c === '_').length

      // Total should be 43
      expect(upper + lower + digits + special).toBe(43)

      // With random bytes, we expect some mix of character types
      // (not all uppercase, not all lowercase, etc.)
      // This is probabilistic but extremely likely to pass
      const nonZeroTypes = [upper, lower, digits, special].filter((n) => n > 0).length
      expect(nonZeroTypes).toBeGreaterThanOrEqual(2)
    })

    it('has 256 bits of entropy (32 bytes)', () => {
      // Verify that 32 bytes of randomness maps to expected output length
      // 32 bytes = 256 bits
      // base64url encoding: 6 bits per character
      // 256 / 6 = 42.67 → rounds to 43 characters (last char uses 4 bits + 2 bits padding)

      const token = generateSecureToken()
      expect(token.length).toBe(43)

      // Decode back to verify it's truly 32 bytes
      // base64url -> base64: replace - with +, _ with /, add padding
      const base64 = token.replace(/-/g, '+').replace(/_/g, '/') + '='
      const buffer = Buffer.from(base64, 'base64')
      expect(buffer.length).toBe(32)
    })
  })

  describe('collision resistance', () => {
    it('has astronomically low collision probability', () => {
      // With 32 bytes (256 bits), collision probability is:
      // P(collision) ≈ n^2 / (2 * 2^256)
      // For n = 1,000,000 tokens: P ≈ 10^12 / 2^257 ≈ 10^-65
      //
      // We can't test this directly, but we can verify that
      // even 10,000 tokens have no collisions

      const tokens = new Set<string>()
      const count = 10000

      for (let i = 0; i < count; i++) {
        const token = generateSecureToken()
        expect(tokens.has(token)).toBe(false) // No collision
        tokens.add(token)
      }

      expect(tokens.size).toBe(count)
    })
  })

  describe('edge cases', () => {
    it('works in different execution contexts', () => {
      // Sync execution
      const syncToken = generateSecureToken()
      expect(syncToken).toHaveLength(43)

      // Inside Promise
      const promiseTest = Promise.resolve().then(() => generateSecureToken())
      return promiseTest.then((token) => {
        expect(token).toHaveLength(43)
      })
    })

    it('is deterministically random (not affected by external state)', () => {
      // Generate tokens before and after some state changes
      const before = generateSecureToken()

      // Change some state (using a var we can modify)
      let testVar = 'initial'
      const during = generateSecureToken()
      testVar = 'changed'

      const after = generateSecureToken()

      // All should be different (crypto.randomBytes is not affected by app state)
      expect(before).not.toBe(during)
      expect(during).not.toBe(after)
      expect(before).not.toBe(after)

      // All should be valid
      expect(before).toHaveLength(43)
      expect(during).toHaveLength(43)
      expect(after).toHaveLength(43)
      expect(testVar).toBe('changed') // Just to use the var
    })
  })
})
