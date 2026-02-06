/**
 * Client-side timeout configuration.
 *
 * This file is safe to import in client components.
 * All timeout values are in milliseconds.
 */

// ============================================================================
// Client-side timeouts (browser/React)
// ============================================================================

/** Default timeout for client-side API fetch calls (30 seconds) */
export const CLIENT_FETCH_TIMEOUT_MS = 30_000

// ============================================================================
// Polling intervals
// ============================================================================

/** Polling interval for analysis status checks */
export const ANALYSIS_POLL_INTERVAL_MS = 2_500
