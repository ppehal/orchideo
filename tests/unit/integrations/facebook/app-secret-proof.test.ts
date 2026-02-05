/**
 * App Secret Proof security tests.
 *
 * SECURITY CRITICAL: App secret proof prevents token theft by ensuring
 * requests come from the authorized app. This is required by Facebook
 * for all API calls.
 *
 * @see https://developers.facebook.com/docs/graph-api/securing-requests#appsecret_proof
 */

import { describe, it, expect } from 'vitest'
import crypto from 'crypto'
import { getAppSecretProof } from '@/lib/integrations/facebook/client'
import { env } from '@/lib/config/env'

describe('getAppSecretProof', () => {
  // NOTE: env.FACEBOOK_APP_SECRET is loaded at module import time from process.env
  // We use the actual value rather than trying to stub it
  const ACTUAL_SECRET = env.FACEBOOK_APP_SECRET
  const TEST_TOKEN = 'EAAtestToken12345'

  describe('HMAC-SHA256 signature generation', () => {
    it('generates valid HMAC-SHA256 signature', () => {
      const proof = getAppSecretProof(TEST_TOKEN)

      // Verify it's a hex string (64 characters for SHA256)
      expect(proof).toMatch(/^[a-f0-9]{64}$/)
      expect(proof.length).toBe(64)
    })

    it('produces consistent output for same token', () => {
      const proof1 = getAppSecretProof(TEST_TOKEN)
      const proof2 = getAppSecretProof(TEST_TOKEN)
      const proof3 = getAppSecretProof(TEST_TOKEN)

      // All should be identical (HMAC is deterministic)
      expect(proof1).toBe(proof2)
      expect(proof2).toBe(proof3)
    })

    it('produces different output for different tokens', () => {
      const token1 = 'EAAtokenA'
      const token2 = 'EAAtokenB'
      const token3 = 'EAAtokenC'

      const proof1 = getAppSecretProof(token1)
      const proof2 = getAppSecretProof(token2)
      const proof3 = getAppSecretProof(token3)

      // All should be different
      expect(proof1).not.toBe(proof2)
      expect(proof2).not.toBe(proof3)
      expect(proof1).not.toBe(proof3)

      // But all should be valid hex strings
      expect(proof1).toMatch(/^[a-f0-9]{64}$/)
      expect(proof2).toMatch(/^[a-f0-9]{64}$/)
      expect(proof3).toMatch(/^[a-f0-9]{64}$/)
    })

    it('generates 64-character hex string (SHA256 output)', () => {
      const proof = getAppSecretProof(TEST_TOKEN)

      // SHA256 produces 32 bytes = 64 hex characters
      expect(proof.length).toBe(64)
      expect(proof).toMatch(/^[a-f0-9]+$/)
    })
  })

  describe('matches expected HMAC output', () => {
    it('produces same result as manual HMAC calculation', () => {
      const token = 'test-access-token'

      const proof = getAppSecretProof(token)

      // Calculate expected HMAC manually using the same secret from env
      const expected = crypto.createHmac('sha256', ACTUAL_SECRET).update(token).digest('hex')

      expect(proof).toBe(expected)
    })

    it('uses lowercase hex encoding', () => {
      const proof = getAppSecretProof(TEST_TOKEN)

      // Should be lowercase (no A-F, only a-f)
      expect(proof).toBe(proof.toLowerCase())
      expect(proof).not.toMatch(/[A-F]/)
    })
  })

  describe('security properties', () => {
    it('changes completely with different secrets', () => {
      const token = 'same-token'

      // Calculate proofs with different secrets manually
      const proofA = crypto.createHmac('sha256', 'secret-A').update(token).digest('hex')
      const proofB = crypto.createHmac('sha256', 'secret-B').update(token).digest('hex')
      const proofC = crypto.createHmac('sha256', 'secret-C').update(token).digest('hex')

      // All should be different
      expect(proofA).not.toBe(proofB)
      expect(proofB).not.toBe(proofC)
      expect(proofA).not.toBe(proofC)

      // Verify avalanche effect (changing secret changes most bits)
      const diffAB = hammingDistance(proofA, proofB)
      const diffBC = hammingDistance(proofB, proofC)

      // Should have ~50% bit difference (good avalanche)
      expect(diffAB).toBeGreaterThan(25) // At least 25% different
      expect(diffBC).toBeGreaterThan(25)
    })

    it('is not reversible (cannot derive token from proof)', () => {
      const proof = getAppSecretProof(TEST_TOKEN)

      // HMAC is one-way - you cannot get the token back from proof
      // This test documents the property (we can't test non-reversibility directly)
      expect(proof).not.toContain(TEST_TOKEN)
      // SHA256 output is always 64 chars, regardless of input length
      expect(proof.length).toBe(64)
    })

    it('validates against known HMAC test case', () => {
      // Verify HMAC-SHA256 implementation produces expected output
      const knownToken = 'EAAtest'
      const knownSecret = 'abc123'

      // Calculate value manually
      const result = crypto.createHmac('sha256', knownSecret).update(knownToken).digest('hex')

      // Verify it's a valid SHA256 hex string
      expect(result).toMatch(/^[a-f0-9]{64}$/)
      expect(result).toBe('14f2fb23fed8bf472ee15dce7b6a7ca844c8e17a69db28212a76299b2b993f3d')
    })
  })

  describe('edge cases', () => {
    it('handles empty token', () => {
      const proof = getAppSecretProof('')

      // Should still produce valid HMAC (HMAC can hash empty string)
      expect(proof).toMatch(/^[a-f0-9]{64}$/)
      expect(proof.length).toBe(64)
    })

    it('handles very long tokens', () => {
      const longToken = 'A'.repeat(10000)
      const proof = getAppSecretProof(longToken)

      // HMAC output is always same length regardless of input length
      expect(proof.length).toBe(64)
      expect(proof).toMatch(/^[a-f0-9]{64}$/)
    })

    it('handles tokens with special characters', () => {
      const specialToken = 'token-with-!@#$%^&*()_+-=[]{}|;:",.<>?/~`'
      const proof = getAppSecretProof(specialToken)

      expect(proof.length).toBe(64)
      expect(proof).toMatch(/^[a-f0-9]{64}$/)
    })

    it('handles Unicode in token', () => {
      const unicodeToken = 'token-with-emoji-🔒-and-中文'
      const proof = getAppSecretProof(unicodeToken)

      expect(proof.length).toBe(64)
      expect(proof).toMatch(/^[a-f0-9]{64}$/)

      // Should be deterministic
      expect(getAppSecretProof(unicodeToken)).toBe(proof)
    })
  })

  describe('environment dependency', () => {
    it('uses FACEBOOK_APP_SECRET from environment', () => {
      const token = 'test-token'

      // getAppSecretProof uses env.FACEBOOK_APP_SECRET
      const proof = getAppSecretProof(token)

      // Calculate expected value with ACTUAL_SECRET from env
      const expected = crypto.createHmac('sha256', ACTUAL_SECRET).update(token).digest('hex')

      expect(proof).toBe(expected)
    })
  })
})

/**
 * Calculate Hamming distance between two hex strings (for avalanche effect test)
 */
function hammingDistance(hex1: string, hex2: string): number {
  if (hex1.length !== hex2.length) {
    throw new Error('Hex strings must be same length')
  }

  let distance = 0
  for (let i = 0; i < hex1.length; i++) {
    const byte1 = parseInt(hex1[i]!, 16)
    const byte2 = parseInt(hex2[i]!, 16)
    const xor = byte1 ^ byte2

    // Count set bits
    for (let bit = 0; bit < 4; bit++) {
      if (xor & (1 << bit)) {
        distance++
      }
    }
  }

  return distance
}
