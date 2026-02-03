/**
 * Runtime validation utilities for IndustryCode
 * Addresses type system vs database mismatch
 */

import { INDUSTRIES, type IndustryCode } from './fb-category-map'

/**
 * Validates and sanitizes industry code to ensure it's a valid IndustryCode
 * Use this when reading from database or external sources
 *
 * @param code - Potentially invalid industry code string
 * @returns Valid IndustryCode, defaults to 'DEFAULT' if invalid
 */
export function sanitizeIndustryCode(code: string | null | undefined): IndustryCode {
  if (!code?.trim()) return 'DEFAULT'

  const trimmed = code.trim()

  // Check if code exists in INDUSTRIES enum
  if (trimmed in INDUSTRIES) {
    return trimmed as IndustryCode
  }

  console.warn(`[sanitizeIndustryCode] Invalid industry code: "${trimmed}", using DEFAULT`)
  return 'DEFAULT'
}

/**
 * Type guard to check if a string is a valid IndustryCode
 *
 * @param code - String to validate
 * @returns true if code is a valid IndustryCode
 */
export function isValidIndustryCode(code: string): code is IndustryCode {
  return code in INDUSTRIES
}

/**
 * Gets industry name safely, with fallback
 *
 * @param code - Industry code to look up
 * @returns Industry name or 'Obecný obor' for invalid codes
 */
export function getIndustryNameSafe(code: string | null | undefined): string {
  const sanitized = sanitizeIndustryCode(code)
  return INDUSTRIES[sanitized].name
}
