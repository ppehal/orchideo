import { env } from './env'

/**
 * Server-side timeout configuration.
 *
 * DO NOT import this file in client components!
 * Use timeouts.client.ts for client-safe constants.
 *
 * All timeout values are in milliseconds and configurable via environment variables.
 */

// ============================================================================
// Server-side timeouts (configurable via env)
// ============================================================================

/** Timeout for Facebook Graph API calls */
export const FB_API_TIMEOUT_MS = env.FEED_TIMEOUT_MS

/** Timeout for the full analysis process */
export const ANALYSIS_TIMEOUT_MS = env.ANALYSIS_TIMEOUT_MS

/** Timeout for email sending (Postmark) */
export const EMAIL_TIMEOUT_MS = 10_000
