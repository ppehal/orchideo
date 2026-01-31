/**
 * Centralized timeout configuration for the application.
 *
 * All timeout values are in milliseconds.
 * Server-side timeouts can be overridden via environment variables.
 */

// ============================================================================
// Client-side timeouts (browser/React)
// ============================================================================

/** Default timeout for client-side API fetch calls (30 seconds) */
export const CLIENT_FETCH_TIMEOUT_MS = 30_000

// ============================================================================
// Server-side timeouts (configurable via env)
// ============================================================================

/** Timeout for Facebook Graph API calls */
const fbApiParsed = parseInt(process.env.FEED_TIMEOUT_MS || '', 10)
export const FB_API_TIMEOUT_MS = Number.isNaN(fbApiParsed) ? 10_000 : fbApiParsed

/** Timeout for the full analysis process */
const analysisParsed = parseInt(process.env.ANALYSIS_TIMEOUT_MS || '', 10)
export const ANALYSIS_TIMEOUT_MS = Number.isNaN(analysisParsed) ? 60_000 : analysisParsed

/** Timeout for email sending (Postmark) */
export const EMAIL_TIMEOUT_MS = 10_000

// ============================================================================
// Polling intervals
// ============================================================================

/** Polling interval for analysis status checks */
export const ANALYSIS_POLL_INTERVAL_MS = 2_500
