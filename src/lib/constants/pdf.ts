/**
 * Constants for PDF generation and caching.
 */

// Current PDF template version
// Increment when changing PDF layout/styling
export const PDF_VERSION = '1.0'

// Directory for storing generated PDFs (relative to project root)
export const PDF_STORAGE_DIR = 'storage/reports'

// Rate limiting
export const PDF_RATE_LIMIT = {
  // Max requests per token per time window
  MAX_REQUESTS_PER_WINDOW: 3,
  // Time window in milliseconds (1 hour)
  WINDOW_MS: 60 * 60 * 1000,
} as const

// Concurrency control
export const PDF_CONCURRENCY = {
  // Max concurrent PDF generations
  MAX_CONCURRENT: 2,
  // Timeout for acquiring semaphore (ms)
  ACQUIRE_TIMEOUT_MS: 30000,
} as const

// PDF generation settings
export const PDF_SETTINGS = {
  // Puppeteer page dimensions
  WIDTH: 1200,
  HEIGHT: 1697, // A4 aspect ratio at 1200px width

  // Navigation timeout (ms)
  NAVIGATION_TIMEOUT_MS: 30000,

  // Wait for network idle
  WAIT_UNTIL: 'networkidle0' as const,

  // Additional wait after page load (ms)
  RENDER_DELAY_MS: 1000,

  // PDF margins
  MARGIN: {
    top: '20mm',
    bottom: '20mm',
    left: '15mm',
    right: '15mm',
  },
} as const

// Cache TTL (how long to keep cached PDFs)
export const PDF_CACHE_TTL_DAYS = 7
