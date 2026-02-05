import { z } from 'zod'

/**
 * Environment Variable Validation Schema
 *
 * This file provides centralized, type-safe access to environment variables
 * with runtime validation using Zod.
 *
 * Usage:
 *   import { env } from '@/lib/config/env'
 *   const dbUrl = env.DATABASE_URL
 *
 * Validation happens once at module initialization, failing fast if config is invalid.
 */

// =============================================================================
// Schema Definition
// =============================================================================

const envSchema = z.object({
  // ────────────────────────────────────────────────────────────────────────────
  // Node.js Environment
  // ────────────────────────────────────────────────────────────────────────────
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  NEXT_PUBLIC_ENV: z.enum(['development', 'production']).optional(),

  // ────────────────────────────────────────────────────────────────────────────
  // Database (PostgreSQL)
  // ────────────────────────────────────────────────────────────────────────────
  DATABASE_URL: z
    .string()
    .url()
    .startsWith('postgresql://', 'DATABASE_URL must be a PostgreSQL connection string'),

  // ────────────────────────────────────────────────────────────────────────────
  // Auth.js (NextAuth v5)
  // ────────────────────────────────────────────────────────────────────────────
  NEXTAUTH_URL: z.string().url('NEXTAUTH_URL must be a valid URL'),
  NEXTAUTH_SECRET: z
    .string()
    .min(32, 'NEXTAUTH_SECRET must be at least 32 characters (use: openssl rand -base64 32)'),

  // ────────────────────────────────────────────────────────────────────────────
  // Facebook OAuth
  // ────────────────────────────────────────────────────────────────────────────
  FACEBOOK_APP_ID: z.string().min(1, 'FACEBOOK_APP_ID is required'),
  FACEBOOK_APP_SECRET: z.string().min(1, 'FACEBOOK_APP_SECRET is required'),
  FACEBOOK_CONFIG_ID: z.string().min(1, 'FACEBOOK_CONFIG_ID is required'),

  // ────────────────────────────────────────────────────────────────────────────
  // Email (Postmark)
  // ────────────────────────────────────────────────────────────────────────────
  POSTMARK_API_TOKEN: z.string().min(1, 'POSTMARK_API_TOKEN is required'),
  POSTMARK_FROM_EMAIL: z.string().email('POSTMARK_FROM_EMAIL must be a valid email'),

  // ────────────────────────────────────────────────────────────────────────────
  // App Configuration
  // ────────────────────────────────────────────────────────────────────────────
  NEXT_PUBLIC_APP_URL: z.string().url('NEXT_PUBLIC_APP_URL must be a valid URL'),
  REPORT_EXPIRATION_DAYS: z.coerce
    .number()
    .int()
    .min(1, 'Report expiration must be at least 1 day')
    .max(365, 'Report expiration must not exceed 1 year')
    .default(30),

  // ────────────────────────────────────────────────────────────────────────────
  // Security (Encryption)
  // ────────────────────────────────────────────────────────────────────────────
  ENCRYPTION_KEY: z
    .string()
    .min(32, 'ENCRYPTION_KEY must be at least 32 characters')
    .refine(
      (val) => {
        try {
          const buf = Buffer.from(val, 'base64')
          return buf.length === 32
        } catch {
          return false
        }
      },
      'ENCRYPTION_KEY must be a base64-encoded 32-byte key (use: openssl rand -base64 32)'
    ),

  // ────────────────────────────────────────────────────────────────────────────
  // Analysis Configuration
  // ────────────────────────────────────────────────────────────────────────────
  MAX_FEED_POSTS: z.coerce.number().int().positive().max(500).default(300),
  MAX_FEED_PAGES: z.coerce.number().int().positive().max(20).default(5),
  FEED_TIMEOUT_MS: z.coerce.number().int().positive().max(60000).default(10000),
  ANALYSIS_TIMEOUT_MS: z.coerce.number().int().positive().max(300000).default(60000),

  // ────────────────────────────────────────────────────────────────────────────
  // Logging
  // ────────────────────────────────────────────────────────────────────────────
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),

  // ────────────────────────────────────────────────────────────────────────────
  // Debug Features (Development)
  // ────────────────────────────────────────────────────────────────────────────
  SHOW_DEBUG_FORMULAS: z
    .enum(['true', 'false'])
    .default('false')
    .transform((val) => val === 'true'),

  // ────────────────────────────────────────────────────────────────────────────
  // Optional: Admin Emails
  // ────────────────────────────────────────────────────────────────────────────
  ADMIN_EMAILS: z
    .string()
    .optional()
    .transform((val) => (val ? val.split(',').map((email) => email.trim()) : []))
    .refine(
      (emails) => emails.every((e) => z.string().email().safeParse(e).success),
      'All ADMIN_EMAILS must be valid email addresses'
    ),

  // ────────────────────────────────────────────────────────────────────────────
  // Optional: Google OAuth
  // ────────────────────────────────────────────────────────────────────────────
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),

  // ────────────────────────────────────────────────────────────────────────────
  // Optional: Puppeteer
  // ────────────────────────────────────────────────────────────────────────────
  PUPPETEER_EXECUTABLE_PATH: z.string().optional(),
})

// =============================================================================
// Validation & Export
// =============================================================================

/**
 * Validate environment variables at module initialization.
 *
 * This ensures the application fails fast with clear error messages
 * if configuration is invalid, rather than failing at runtime.
 */
function validateEnv() {
  const parsed = envSchema.safeParse(process.env)

  if (!parsed.success) {
    console.error('❌ Invalid environment variables:')
    console.error(JSON.stringify(parsed.error.format(), null, 2))
    throw new Error('Environment validation failed. Check .env file and fix the errors above.')
  }

  return parsed.data
}

/**
 * Validated environment variables.
 *
 * Use this instead of process.env for type-safe, validated access.
 *
 * @example
 * import { env } from '@/lib/config/env'
 * const dbUrl = env.DATABASE_URL // Type-safe and validated!
 */
export const env = validateEnv()

/**
 * Type of validated environment variables.
 * Use this type when passing env as a parameter.
 */
export type Env = z.infer<typeof envSchema>

/**
 * Check if current environment is production.
 */
export const isProduction = env.NODE_ENV === 'production'

/**
 * Check if current environment is development.
 */
export const isDevelopment = env.NODE_ENV === 'development'

/**
 * Check if current environment is test.
 */
export const isTest = env.NODE_ENV === 'test'
