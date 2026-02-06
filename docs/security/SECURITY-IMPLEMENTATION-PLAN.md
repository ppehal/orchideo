# Orchideo - Security Implementation Plan

**Datum:** 2026-01-31
**Priorita:** Immediate → Short-Term → Medium-Term
**Development-Friendly:** ✅ Všechny změny jsou kompatibilní s development workflow

---

## 🎯 Overview

Tento plán obsahuje **konkrétní kódové změny** pro opravu bezpečnostních problémů identifikovaných v Security Audit Report.

**Klíčové principy:**

- ✅ Žádné breaking changes
- ✅ Development workflow zůstává stejný
- ✅ Hot reload stále funguje
- ✅ Lokální testování bez dodatečné infrastruktury
- ✅ Production-ready s minimal config

---

## 🔥 IMMEDIATE (Tento Týden)

### 1. Odstranit Account Takeover Vulnerability (5 minut)

**Severity:** 🔴 CRITICAL
**Effort:** 5 minut
**Breaking:** ❌ Ne

**File:** `src/lib/auth.ts`

```diff
  Facebook({
    clientId: process.env.FACEBOOK_APP_ID,
    clientSecret: process.env.FACEBOOK_APP_SECRET,
    authorization: {
      url: 'https://www.facebook.com/v21.0/dialog/oauth',
      params: {
        config_id: process.env.FACEBOOK_CONFIG_ID,
        response_type: 'code',
        override_default_response_type: 'true',
      },
    },
-   allowDangerousEmailAccountLinking: true,
  }),
```

**Testing:**

```bash
# Restart dev server
npm run dev

# Test login flow - should work exactly the same for new users
# Existing users with both Google + Facebook will continue working
```

**Rollout:** Lze nasadit okamžitě, žádný impact na existující uživatele.

---

### 2. Přidat Security Headers Middleware (30 minut)

**Severity:** 🔴 CRITICAL
**Effort:** 30 minut
**Breaking:** ❌ Ne

**Vytvořit:** `middleware.ts` v root projektu

```typescript
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const response = NextResponse.next()

  // Security Headers
  const headers = response.headers

  // Prevent XSS attacks
  headers.set('X-Content-Type-Options', 'nosniff')

  // Prevent clickjacking
  headers.set('X-Frame-Options', 'DENY')

  // Force HTTPS
  if (process.env.NODE_ENV === 'production') {
    headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload')
  }

  // Referrer policy
  headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')

  // Permissions policy (disable unnecessary features)
  headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=()')

  // XSS Protection (legacy browsers)
  headers.set('X-XSS-Protection', '1; mode=block')

  // Content Security Policy
  const csp = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'", // Next.js requires unsafe-inline/eval
    "style-src 'self' 'unsafe-inline'", // Tailwind requires unsafe-inline
    "img-src 'self' data: https://platform-lookaside.fbsbx.com https://*.fbcdn.net", // Facebook images
    "font-src 'self' data:",
    "connect-src 'self' https://graph.facebook.com https://www.facebook.com",
    'frame-src https://www.facebook.com', // Facebook OAuth popup
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    'upgrade-insecure-requests',
  ].join('; ')

  headers.set('Content-Security-Policy', csp)

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
```

**Testing:**

```bash
npm run dev

# Check headers
curl -I http://localhost:3001

# Expected:
# X-Content-Type-Options: nosniff
# X-Frame-Options: DENY
# Content-Security-Policy: ...
```

**Development Impact:** ✅ Žádný - CSP je nastaveno tak, aby Next.js dev server fungoval.

---

### 3. Přidat Rate Limiting Middleware (1 hodina)

**Severity:** 🔴 CRITICAL
**Effort:** 1 hodina
**Breaking:** ❌ Ne

**Vytvořit:** `src/lib/rate-limit.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server'

interface RateLimitEntry {
  count: number
  resetAt: number
}

// In-memory store (OK pro development a single-server production)
const store = new Map<string, RateLimitEntry>()

// Cleanup interval
let lastCleanup = Date.now()
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000 // 5 minutes

function cleanup() {
  const now = Date.now()
  if (now - lastCleanup < CLEANUP_INTERVAL_MS) return

  lastCleanup = now
  let cleaned = 0

  for (const [key, entry] of store.entries()) {
    if (now > entry.resetAt) {
      store.delete(key)
      cleaned++
    }
  }

  if (cleaned > 0) {
    console.log(`[rate-limit] Cleaned ${cleaned} expired entries`)
  }
}

export interface RateLimitConfig {
  /** Max requests per window */
  maxRequests: number
  /** Window duration in milliseconds */
  windowMs: number
  /** Identifier extractor */
  keyExtractor?: (req: NextRequest) => string
}

export function createRateLimiter(config: RateLimitConfig) {
  const { maxRequests, windowMs } = config
  const extractKey = config.keyExtractor || ((req) => req.ip || 'unknown')

  return function rateLimit(req: NextRequest): NextResponse | null {
    cleanup()

    const key = extractKey(req)
    const now = Date.now()
    const entry = store.get(key)

    if (!entry || now > entry.resetAt) {
      // Reset or create new entry
      const resetAt = now + windowMs
      store.set(key, { count: 1, resetAt })
      return null // Allow
    }

    if (entry.count >= maxRequests) {
      // Rate limited
      return NextResponse.json(
        {
          error: 'Příliš mnoho požadavků, zkuste to později',
          code: 'RATE_LIMITED',
          retryAfter: Math.ceil((entry.resetAt - now) / 1000),
        },
        {
          status: 429,
          headers: {
            'Retry-After': String(Math.ceil((entry.resetAt - now) / 1000)),
            'X-RateLimit-Limit': String(maxRequests),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': String(Math.floor(entry.resetAt / 1000)),
          },
        }
      )
    }

    entry.count++
    return null // Allow
  }
}

// Predefined rate limiters
export const apiRateLimit = createRateLimiter({
  maxRequests: 100, // 100 requests
  windowMs: 60 * 1000, // per minute
})

export const strictApiRateLimit = createRateLimiter({
  maxRequests: 10, // 10 requests
  windowMs: 60 * 1000, // per minute
})
```

**Použití v API routes:**

```typescript
// src/app/api/analysis/create/route.ts

import { strictApiRateLimit } from '@/lib/rate-limit'

export async function POST(request: Request) {
  // Rate limiting
  const rateLimitResponse = strictApiRateLimit(request as any)
  if (rateLimitResponse) {
    return rateLimitResponse
  }

  // ... rest of handler
}
```

**Testing:**

```bash
# Spustit dev server
npm run dev

# Test rate limit (curl nebo Postman)
for i in {1..12}; do curl -X POST http://localhost:3001/api/analysis/create; done

# Expected: První 10 requests OK, 11. a 12. vrátí 429
```

**Production Note:** Pro multi-server production doporučujeme Redis-based rate limiting, ale in-memory je **OK pro single-server VPS**.

---

## 📅 SHORT-TERM (Tento Měsíc)

### 4. Secure Public Tokens (15 minut)

**Severity:** 🟠 HIGH
**Effort:** 15 minut
**Breaking:** ❌ Ne (existující tokeny stále fungují)

**Vytvořit:** `src/lib/utils/tokens.ts`

```typescript
import { randomBytes } from 'crypto'

/**
 * Generate cryptographically secure token.
 *
 * @param length - Number of random bytes (default: 32 = 256 bits)
 * @returns base64url encoded token
 */
export function generateSecureToken(length: number = 32): string {
  return randomBytes(length).toString('base64url')
}
```

**Použití:**

```typescript
// src/lib/actions/analysis.ts (nebo kde se vytváří Analysis)

import { generateSecureToken } from '@/lib/utils/tokens'

const analysis = await prisma.analysis.create({
  data: {
    // ... other fields
    public_token: generateSecureToken(32), // 256 bits entropy
  },
})
```

**Migration:** Není potřeba - existující `cuid()` tokeny stále fungují, nové budou secure.

---

### 5. Zkrátit Session Lifetime (2 minuty)

**Severity:** 🟠 HIGH
**Effort:** 2 minuty
**Breaking:** ❌ Ne

**File:** `src/lib/auth.ts`

```diff
  session: {
    strategy: 'database',
-   maxAge: 30 * 24 * 60 * 60, // 30 days
+   maxAge: process.env.NODE_ENV === 'production'
+     ? 7 * 24 * 60 * 60   // 7 days in production
+     : 30 * 24 * 60 * 60, // 30 days in development
  },
```

**Testing:**

```bash
# Development - session expirace 30 dní (bez změny)
NODE_ENV=development npm run dev

# Production - session expirace 7 dní
NODE_ENV=production npm run build && npm start
```

---

### 6. Input Sanitization Utility (30 minut)

**Severity:** 🟠 HIGH
**Effort:** 30 minut
**Breaking:** ❌ Ne

**Vytvořit:** `src/lib/utils/sanitize.ts`

```typescript
/**
 * Sanitize string input to prevent XSS and injection attacks.
 */
export function sanitizeString(input: string, maxLength: number = 1000): string {
  if (typeof input !== 'string') {
    return ''
  }

  return (
    input
      .trim()
      .slice(0, maxLength)
      // Remove null bytes
      .replace(/\0/g, '')
      // Normalize whitespace
      .replace(/\s+/g, ' ')
  )
}

/**
 * Sanitize email address.
 */
export function sanitizeEmail(email: string): string {
  return sanitizeString(email, 320) // Max email length per RFC
    .toLowerCase()
}

/**
 * Sanitize Facebook Page ID (should be numeric).
 */
export function sanitizePageId(pageId: string): string {
  // Facebook page IDs are numeric
  const sanitized = pageId.replace(/[^0-9]/g, '')

  if (!sanitized) {
    throw new Error('Invalid page ID format')
  }

  return sanitized
}

/**
 * Sanitize industry code (alphanumeric + underscore only).
 */
export function sanitizeIndustryCode(code: string): string {
  const sanitized = code.replace(/[^A-Z0-9_]/g, '').toUpperCase()

  if (!sanitized) {
    return 'DEFAULT'
  }

  return sanitized.slice(0, 50)
}
```

**Použití v API routes:**

```diff
  // src/app/api/analysis/create/route.ts

+ import { sanitizePageId, sanitizeIndustryCode } from '@/lib/utils/sanitize'

  const requestSchema = z.object({
    pageId: z.string().min(1, 'ID stránky je povinné'),
    industryCode: z.string().optional().default('DEFAULT'),
  })

  const parsed = requestSchema.safeParse(body)
  if (!parsed.success) { /* ... */ }

+ // Sanitize inputs
+ const sanitized = {
+   pageId: sanitizePageId(parsed.data.pageId),
+   industryCode: sanitizeIndustryCode(parsed.data.industryCode),
+ }

- const result = await createAnalysis(parsed.data.pageId, parsed.data.industryCode)
+ const result = await createAnalysis(sanitized.pageId, sanitized.industryCode)
```

---

### 7. Audit CompetitorGroup Access Control (1 hodina)

**Severity:** 🟠 HIGH (pokud chybí)
**Effort:** 1 hodina (audit + fix)
**Breaking:** ❌ Ne

**Audit těchto endpoints:**

```
/api/competitor-groups/route.ts (GET, POST)
/api/competitor-groups/[id]/route.ts (GET, PUT, DELETE)
/api/competitor-groups/[id]/comparison/route.ts (GET, POST)
```

**Template pro správný access control:**

```typescript
// src/app/api/competitor-groups/[id]/route.ts

import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

interface Props {
  params: Promise<{ id: string }>
}

export async function GET(request: Request, { params }: Props) {
  try {
    // 1. Authentication
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    // 2. Fetch resource
    const group = await prisma.competitorGroup.findUnique({
      where: { id },
      include: {
        primaryPage: true,
        competitorPages: {
          include: {
            facebookPage: true,
          },
        },
      },
    })

    if (!group) {
      return NextResponse.json({ error: 'Skupina nenalezena' }, { status: 404 })
    }

    // 3. ✅ CRITICAL: Authorization check
    if (group.userId !== session.user.id) {
      return NextResponse.json({ error: 'Nemáte oprávnění k této skupině' }, { status: 403 })
    }

    // 4. Return data
    return NextResponse.json({ group })
  } catch (error) {
    console.error('[competitor-groups] Error:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

// Similar for PUT, DELETE
```

**Testing:**

```bash
# Create 2 users, create groups for each
# Try to access User A's group with User B's session
# Expected: 403 Forbidden
```

---

### 8. CORS Middleware (15 minut)

**Severity:** 🟠 MEDIUM-HIGH
**Effort:** 15 minut
**Breaking:** ❌ Ne

**Přidat do:** `middleware.ts` (rozšířit existující)

```typescript
// middleware.ts

export function middleware(request: NextRequest) {
  const response = NextResponse.next()
  const headers = response.headers

  // ... existing security headers

  // CORS Headers (pouze pokud je potřeba)
  const allowedOrigins = ['https://orchideo.ppsys.eu', 'https://app.orchideo.ppsys.eu']

  if (process.env.NODE_ENV === 'development') {
    allowedOrigins.push('http://localhost:3001')
    allowedOrigins.push('http://localhost:3000')
  }

  const origin = request.headers.get('origin')

  if (origin && allowedOrigins.includes(origin)) {
    headers.set('Access-Control-Allow-Origin', origin)
    headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
    headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
    headers.set('Access-Control-Max-Age', '86400') // 24 hours
  }

  // Handle preflight requests
  if (request.method === 'OPTIONS') {
    return new NextResponse(null, { status: 204, headers })
  }

  return response
}
```

**Note:** CORS je často **NEPOTŘEBNÝ** pro same-origin aplikace (frontend + backend na stejné doméně).

---

## 📆 MEDIUM-TERM (Q1 2026)

### 9. Token Refresh Logic (2 hodiny)

**File:** `src/lib/integrations/facebook.ts`

```typescript
import { prisma } from '@/lib/prisma'
import { decrypt, encrypt } from '@/lib/utils/encryption'
import { createLogger } from '@/lib/logging'

const log = createLogger('facebook-token-refresh')

/**
 * Check if Facebook access token needs refresh and refresh if needed.
 *
 * Facebook tokens:
 * - User access tokens: 60-90 days
 * - Page access tokens: No expiry (long-lived)
 *
 * @returns Decrypted access token (refreshed if needed)
 */
export async function getRefreshedAccessToken(userId: string): Promise<string> {
  const account = await prisma.account.findFirst({
    where: {
      userId,
      provider: 'facebook',
    },
  })

  if (!account?.access_token) {
    throw new Error('No Facebook account connected')
  }

  const now = Date.now()
  const expiresAt = account.expires_at ? account.expires_at * 1000 : null

  // If token expires within 7 days, refresh it
  const REFRESH_THRESHOLD_MS = 7 * 24 * 60 * 60 * 1000 // 7 days

  if (expiresAt && expiresAt < now + REFRESH_THRESHOLD_MS) {
    log.info({ userId, expiresAt: new Date(expiresAt) }, 'Refreshing Facebook token')

    try {
      // Refresh token using Facebook Graph API
      const currentToken = decrypt(account.access_token)

      const response = await fetch(
        `https://graph.facebook.com/v21.0/oauth/access_token?` +
          `grant_type=fb_exchange_token&` +
          `client_id=${process.env.FACEBOOK_APP_ID}&` +
          `client_secret=${process.env.FACEBOOK_APP_SECRET}&` +
          `fb_exchange_token=${currentToken}`
      )

      if (!response.ok) {
        throw new Error(`Facebook API error: ${response.status}`)
      }

      const data = await response.json()

      // Update token in database
      await prisma.account.update({
        where: {
          provider_providerAccountId: {
            provider: 'facebook',
            providerAccountId: account.providerAccountId,
          },
        },
        data: {
          access_token: encrypt(data.access_token),
          expires_at: data.expires_in ? Math.floor(now / 1000) + data.expires_in : null,
        },
      })

      log.info({ userId }, 'Facebook token refreshed successfully')

      return data.access_token
    } catch (error) {
      log.error({ userId, error }, 'Failed to refresh Facebook token')
      // Return current token as fallback
      return decrypt(account.access_token)
    }
  }

  return decrypt(account.access_token)
}
```

**Použití:**

```diff
  // src/lib/auth.ts

- export async function getFacebookAccessToken(userId: string): Promise<string | null> {
+ export async function getFacebookAccessToken(
+   userId: string,
+   options: { refresh?: boolean } = {}
+ ): Promise<string | null> {
+   if (options.refresh) {
+     try {
+       return await getRefreshedAccessToken(userId)
+     } catch (error) {
+       // Fallback to current token
+     }
+   }

    const account = await prisma.account.findFirst({
      where: { userId, provider: 'facebook' },
      select: { access_token: true },
    })

-   return account?.access_token ?? null
+   return account?.access_token ? decrypt(account.access_token) : null
  }
```

---

### 10. Log Redaction (1 hodina)

**Vytvořit:** `src/lib/logging.ts` (rozšířit existující)

```typescript
import pino from 'pino'

/**
 * Redact sensitive data from logs.
 */
function redactSensitive(obj: any): any {
  if (typeof obj !== 'object' || obj === null) {
    return obj
  }

  const redacted = { ...obj }

  // Redact email
  if (redacted.email && typeof redacted.email === 'string') {
    const [, domain] = redacted.email.split('@')
    redacted.email = `***@${domain || 'redacted'}`
  }

  // Redact access tokens
  if (redacted.access_token) {
    redacted.access_token = '[REDACTED]'
  }

  // Redact IP addresses (partially)
  if (redacted.ip_address && typeof redacted.ip_address === 'string') {
    const parts = redacted.ip_address.split('.')
    redacted.ip_address = `${parts[0]}.${parts[1]}.***.**`
  }

  // Redact user agent (keep first 50 chars)
  if (redacted.user_agent && typeof redacted.user_agent === 'string') {
    redacted.user_agent = redacted.user_agent.slice(0, 50) + '...'
  }

  // Recursively redact nested objects
  for (const key in redacted) {
    if (typeof redacted[key] === 'object') {
      redacted[key] = redactSensitive(redacted[key])
    }
  }

  return redacted
}

export function createLogger(name: string) {
  return pino({
    name,
    level: process.env.LOG_LEVEL || 'info',
    // Redact sensitive fields
    redact: {
      paths: [
        'access_token',
        'refresh_token',
        'password',
        'secret',
        '*.access_token',
        '*.refresh_token',
        '*.password',
      ],
      remove: true,
    },
    // Custom serializers
    serializers: {
      req: (req) => ({
        method: req.method,
        url: req.url,
        // Don't log full headers (may contain tokens)
        headers: {
          'user-agent': req.headers['user-agent']?.slice(0, 50),
        },
      }),
      res: (res) => ({
        statusCode: res.statusCode,
      }),
      err: pino.stdSerializers.err,
      // Custom redaction for objects
      user: (user: any) => redactSensitive(user),
      account: (account: any) => redactSensitive(account),
    },
  })
}
```

---

### 11. CSRF Protection (1 hodina)

**Přidat do:** `middleware.ts`

```typescript
import { getToken } from 'next-auth/jwt'

export async function middleware(request: NextRequest) {
  // ... existing code

  // CSRF protection for state-changing operations
  if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(request.method)) {
    // Skip for NextAuth routes (has built-in CSRF protection)
    if (request.nextUrl.pathname.startsWith('/api/auth/')) {
      return response
    }

    const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET })

    if (token) {
      // Verify Origin or Referer matches app domain
      const origin = request.headers.get('origin')
      const referer = request.headers.get('referer')

      const allowedOrigins = [process.env.NEXT_PUBLIC_APP_URL || '', 'https://orchideo.ppsys.eu']

      if (process.env.NODE_ENV === 'development') {
        allowedOrigins.push('http://localhost:3001')
      }

      const isValidOrigin = origin && allowedOrigins.some((allowed) => origin.startsWith(allowed))
      const isValidReferer =
        referer && allowedOrigins.some((allowed) => referer.startsWith(allowed))

      if (!isValidOrigin && !isValidReferer) {
        return NextResponse.json({ error: 'Invalid origin', code: 'CSRF_ERROR' }, { status: 403 })
      }
    }
  }

  return response
}
```

---

### 12. Environment Variable Validation (30 minut)

**Vytvořit:** `src/lib/env.ts`

```typescript
import { z } from 'zod'

const envSchema = z.object({
  // Node
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

  // Database
  DATABASE_URL: z.string().url(),

  // NextAuth
  NEXTAUTH_URL: z.string().url(),
  NEXTAUTH_SECRET: z.string().min(32, 'NEXTAUTH_SECRET must be at least 32 characters'),

  // Facebook
  FACEBOOK_APP_ID: z.string().min(1),
  FACEBOOK_APP_SECRET: z.string().min(1),
  FACEBOOK_CONFIG_ID: z.string().min(1),

  // Google (optional)
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),

  // Email
  POSTMARK_API_TOKEN: z.string().optional(),
  POSTMARK_FROM_EMAIL: z.string().email().optional(),

  // Encryption
  ENCRYPTION_KEY: z
    .string()
    .length(44, 'ENCRYPTION_KEY must be base64-encoded 32 bytes (44 chars)'),

  // App
  NEXT_PUBLIC_APP_URL: z.string().url().optional(),

  // Logging
  LOG_LEVEL: z.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal']).default('info'),
})

export const env = envSchema.parse(process.env)

// Type-safe access
// import { env } from '@/lib/env'
// const dbUrl = env.DATABASE_URL
```

**Použití:**

```typescript
// V kterémkoli souboru místo process.env:

import { env } from '@/lib/env'

const apiKey = env.FACEBOOK_APP_ID // Type-safe!
```

---

## 📋 Testing Checklist

### Po každé změně:

- [ ] `npm run dev` funguje
- [ ] Hot reload funguje
- [ ] Login flow funguje (Facebook + Google)
- [ ] API endpoints fungují
- [ ] No console errors
- [ ] `npm run build` projde
- [ ] `npm run lint` projde bez warnings

### Security-specific:

- [ ] Security headers jsou přítomné (`curl -I`)
- [ ] Rate limiting funguje (test s curl loop)
- [ ] CSRF protection funguje (test s curl bez Origin)
- [ ] Public tokens jsou cryptographically secure
- [ ] Sessions expirují správně (7d prod, 30d dev)

---

## 🚀 Deployment

### Development

```bash
# Žádné změny nutné
npm run dev
```

### Production

```bash
# Ensure environment variables jsou nastavené
# - NEXTAUTH_SECRET (unique per environment)
# - ENCRYPTION_KEY (same as dev for data compatibility)
# - NODE_ENV=production

npm run build
npm start
```

---

## 📞 Support

**Security Issues:** `security@invix.cz`

**Implementation Questions:** Viz komentáře v kódu nebo tento dokument

---

**Version:** 1.0
**Last Updated:** 2026-01-31
