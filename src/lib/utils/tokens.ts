import { randomBytes } from 'crypto'

/**
 * Generate cryptographically secure random token.
 * Uses 32 bytes (256 bits) for high entropy.
 * Returns base64url-encoded string (URL-safe, no padding).
 *
 * @returns 43-character token (32 bytes base64url)
 *
 * @example
 * const token = generateSecureToken()
 * // => "K7gNU3sdo-OL0wNhqoVWhr3g6s1xYv72ol_pe_Unols"
 */
export function generateSecureToken(): string {
  return randomBytes(32).toString('base64url')
}
