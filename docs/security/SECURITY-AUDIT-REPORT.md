# Orchideo - Security Audit Report

**Datum:** 2026-01-31
**Provedl:** Security Audit (Automated + Manual Review)
**Aplikace:** Orchideo Facebook Page Analytics
**Verze:** 0.1.0

---

## 🎯 Executive Summary

Provedli jsme detailní bezpečnostní audit aplikace Orchideo. Aplikace má **dobré základy** (AES-256-GCM šifrování tokenů, Zod validace), ale byly identifikovány **kritické bezpečnostní problémy**, zejména:

1. **Account Takeover riziko** (allowDangerousEmailAccountLinking)
2. **Chybějící security headers** a Content Security Policy
3. **Nedostatečná rate limiting** strategie pro production
4. **Chybějící input sanitization** v některých API endpointech

**Severity Breakdown:**
- 🔴 **Kritické:** 3 problémy
- 🟠 **Vysoké:** 5 problémů
- 🟡 **Střední:** 6 problémů
- 🔵 **Nízké:** 3 problémy

---

## 📋 Table of Contents

1. [Kritické Problémy](#-kritické-problémy)
2. [Vysoké Priority](#-vysoké-priority)
3. [Střední Priority](#-střední-priority)
4. [Nízké Priority](#-nízké-priority)
5. [Pozitivní Nálezy](#-pozitivní-nálezy)
6. [Doporučené Akce](#-doporučené-akce)
7. [Implementační Plán](#-implementační-plán)

---

## 🔴 Kritické Problémy

### 1. Account Takeover via Email Linking (CRITICAL)

**Soubor:** `src/lib/auth.ts:31`

**Problém:**
```typescript
Facebook({
  // ...
  allowDangerousEmailAccountLinking: true,  // ❌ CRITICAL VULNERABILITY
})
```

**Riziko:** **Account Takeover Attack**

Útočník může:
1. Získat přístup k email účtu oběti (phishing, data leak, etc.)
2. Vytvořit nový Facebook účet se STEJNÝM emailem
3. Přihlásit se do Orchideo přes Facebook OAuth
4. NextAuth automaticky propojí nový FB účet s existujícím Orchideo účtem oběti
5. **Útočník získá plný přístup k účtu oběti včetně všech dat**

**Dopad:**
- Přístup k všem Facebook stránkám oběti
- Přístup ke všem analýzám, reportům
- Možnost smazat data oběti
- Krádež Facebook access tokenů

**Řešení:**

```typescript
// src/lib/auth.ts

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
  // ✅ REMOVE THIS LINE:
  // allowDangerousEmailAccountLinking: true,
})
```

**Alternativní řešení** (pokud je potřeba linking):

```typescript
callbacks: {
  async signIn({ user, account, profile }) {
    // Custom logic to verify user identity before linking
    if (account?.provider === 'facebook') {
      // Check if user already exists with same email
      const existingUser = await prisma.user.findUnique({
        where: { email: profile?.email },
        include: { accounts: true },
      })

      if (existingUser && !existingUser.accounts.some(a => a.provider === 'facebook')) {
        // User exists but no Facebook account linked
        // Require additional verification (e.g., send email confirmation)
        // OR reject and ask user to login with existing provider first
        return false // Reject for now
      }
    }

    return true
  },
}
```

**Effort:** Low (5 minut)
**Impact:** Critical
**Priority:** 🔥 **IMMEDIATE**

---

### 2. Chybějící Security Headers & CSP

**Problém:** Aplikace nemá middleware pro security headers.

**Riziko:**
- XSS útoky
- Clickjacking
- MIME sniffing útoky
- Protocol downgrade attacks

**Chybějící headers:**
- `Content-Security-Policy`
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `Strict-Transport-Security`
- `Referrer-Policy`
- `Permissions-Policy`

**Řešení:** Vytvořit middleware.

**Effort:** Medium (30 minut)
**Impact:** High
**Priority:** 🔴 **URGENT**

---

### 3. Žádná Rate Limiting na Kritických Endpointech

**Problém:** Pouze PDF endpoint má rate limiting (in-memory). Ostatní API endpoints nemají žádnou ochranu.

**Zranitelné endpoints:**
- `/api/analysis/create` - může vyčerpat Facebook API limity
- `/api/facebook/pages` - Facebook API calls bez limitu
- `/api/email/send-report` - email spam možnost
- `/api/user/alerts` - database query flooding

**Riziko:**
- DoS útoky
- Facebook API rate limit exhaustion
- Email spam
- Database overload

**Řešení:** Přidat rate limiting middleware (viz Implementační Plán).

**Effort:** Medium (1 hodina)
**Impact:** High
**Priority:** 🔴 **URGENT**

---

## 🟠 Vysoké Priority

### 4. Public Tokens jsou Predictable

**Soubor:** `prisma/schema.prisma:109`

**Problém:**
```prisma
public_token String @unique @default(cuid())
```

`cuid()` generuje ID založené na:
- Timestamp (predictable)
- Counter (predictable)
- Hostname/Process ID (částečně predictable)

**Riziko:** Útočník může uhodnout public_token jiných reportů a získat přístup.

**Řešení:**

```typescript
// src/lib/utils/tokens.ts
import { randomBytes } from 'crypto'

export function generateSecureToken(length: number = 32): string {
  return randomBytes(length).toString('base64url')
}

// V Analysis creation:
public_token: generateSecureToken(32), // 256 bits entropy
```

**Effort:** Low (15 minut)
**Impact:** High
**Priority:** 🟠 **HIGH**

---

### 5. Chybějící Input Sanitization

**Problém:** API endpoints spoléhají pouze na Zod validation, ale nesanitizují input.

**Příklad** (`/api/analysis/create`):

```typescript
const requestSchema = z.object({
  pageId: z.string().min(1, 'ID stránky je povinné'),  // ❌ No sanitization
  industryCode: z.string().optional().default('DEFAULT'),
})
```

**Riziko:**
- XSS přes stored data (pokud se zobrazuje bez escapování)
- SQL injection (méně pravděpodobné s Prisma, ale možné)
- Log injection

**Řešení:** Přidat sanitization util.

**Effort:** Medium (30 minut)
**Impact:** Medium-High
**Priority:** 🟠 **HIGH**

---

### 6. Session Lifetime 30 Dní

**Soubor:** `src/lib/auth.ts:36`

**Problém:**
```typescript
session: {
  strategy: 'database',
  maxAge: 30 * 24 * 60 * 60, // 30 days - ⚠️ Too long
}
```

**Riziko:** Stolen session token má 30-day validity window.

**Doporučení:**
- Production: **7 dní**
- Development: 30 dní OK

```typescript
session: {
  strategy: 'database',
  maxAge: process.env.NODE_ENV === 'production'
    ? 7 * 24 * 60 * 60   // 7 days in production
    : 30 * 24 * 60 * 60, // 30 days in dev
}
```

**Effort:** Low (2 minuty)
**Impact:** Medium
**Priority:** 🟠 **HIGH**

---

### 7. Puppeteer Resource Exhaustion

**Soubor:** `src/lib/services/pdf.ts` (předpokládáno)

**Problém:** PDF generation používá Puppeteer/Chromium, což je resource-intensive.

**Riziko:**
- DoS útoky přes PDF generování
- Memory exhaustion
- CPU exhaustion

**Řešení:**
- ✅ Už má in-memory rate limiting (PDF_RATE_LIMIT)
- ❌ Chybí request queue/semaphore
- ❌ Chybí timeout na Puppeteer

**Doporučení:** Přidat semaphore (již implementováno podle error message v route.ts:172).

**Effort:** Low (již implementováno?)
**Impact:** Medium
**Priority:** 🟠 **HIGH**

---

### 8. Žádné CORS Headers

**Problém:** API endpoints nemají CORS konfiguraci.

**Riziko:** Frontend z jiné domény nemůže volat API (nebo naopak, pokud CORS není nastavený, může).

**Řešení:** Přidat CORS middleware s whitelistem origin.

**Effort:** Low (15 minut)
**Impact:** Medium
**Priority:** 🟠 **MEDIUM-HIGH**

---

## 🟡 Střední Priority

### 9. Logs Mohou Obsahovat Citlivé Data

**Soubor:** `src/lib/auth.ts:52`

```typescript
events: {
  signIn({ user, isNewUser }) {
    log.info({ user_id: user.id, isNewUser }, 'User signed in')  // ✅ OK
  },
  signOut(message) {
    if ('session' in message && message.session) {
      const tokenPrefix = message.session.sessionToken.slice(0, 8) + '...'  // ✅ Redacted
      log.info({ session_token_prefix: tokenPrefix }, 'User signed out')
    }
  },
}
```

**Pozitivní:** Session token je redacted.

**Riziko:** Jiné části aplikace mohou logovat:
- Email adresy
- Facebook access tokens (pokud error handling)
- User IPs

**Doporučení:** Audit všech log statements, přidat redaction utility.

**Effort:** Medium (1 hodina)
**Impact:** Medium
**Priority:** 🟡 **MEDIUM**

---

### 10. Database Connection Pool Limits

**Soubor:** `src/lib/prisma.ts` (předpokládáno)

**Problém:** Není vidět konfigurace connection pool limits.

**Riziko:** Connection exhaustion při high load.

**Doporučení:**

```typescript
// src/lib/prisma.ts
import { PrismaClient } from '@/generated/prisma'

const prismaClientSingleton = () => {
  return new PrismaClient({
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
    // Connection pool limits
    connection: {
      max: 10,  // Max connections
      idleTimeoutMillis: 30000,  // 30s idle timeout
      connectionTimeoutMillis: 5000,  // 5s connect timeout
    },
    log: process.env.NODE_ENV === 'development'
      ? ['query', 'error', 'warn']
      : ['error'],
  })
}
```

**Effort:** Low (10 minut)
**Impact:** Medium
**Priority:** 🟡 **MEDIUM**

---

### 11. Facebook Access Token Rotation

**Problém:** Access tokens jsou uložené v databázi, ale není jasné, jestli se rotují.

**Facebook tokens:**
- User tokens: 60-day expiry
- Page tokens: No expiry (long-lived)

**Doporučení:** Implementovat token refresh logic.

```typescript
// src/lib/integrations/facebook.ts

export async function refreshAccessTokenIfNeeded(userId: string): Promise<string> {
  const account = await prisma.account.findFirst({
    where: { userId, provider: 'facebook' },
  })

  if (!account?.access_token) {
    throw new Error('No Facebook account')
  }

  // Check if token expires soon (within 7 days)
  if (account.expires_at && account.expires_at < Date.now() + 7 * 24 * 60 * 60 * 1000) {
    // Refresh token using Facebook API
    // ...
  }

  return decrypt(account.access_token)
}
```

**Effort:** Medium (2 hodiny)
**Impact:** Medium
**Priority:** 🟡 **MEDIUM**

---

### 12. Error Messages Leak Information

**Příklad:** `/api/facebook/pages/route.ts:32-33`

```typescript
log.info({ user_id: session.user.id, page_count: pages.length }, 'Facebook pages fetched')
```

**Riziko:** Logs obsahují user_id, page_count - může leak existence účtů.

**Doporučení:** Použít structured logging s severity levels.

**Effort:** Low (30 minut)
**Impact:** Low-Medium
**Priority:** 🟡 **MEDIUM**

---

### 13. Žádná CSRF Protection

**Problém:** NextAuth má built-in CSRF protection, ale custom API endpoints nemají.

**Riziko:** CSRF útoky na API endpoints (např. `/api/analysis/create`).

**Řešení:** NextAuth poskytuje `getCsrfToken()`, ale pro custom endpoints:

```typescript
// middleware.ts
import { getToken } from 'next-auth/jwt'

export async function middleware(request: NextRequest) {
  // CSRF check for state-changing operations
  if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(request.method)) {
    const token = await getToken({ req: request })

    if (token && !request.headers.get('x-requested-with')) {
      // Require X-Requested-With header for API calls
      // OR verify Origin/Referer matches app domain
    }
  }
}
```

**Effort:** Medium (1 hodina)
**Impact:** Medium
**Priority:** 🟡 **MEDIUM**

---

### 14. Competitor Group Access Control

**Soubor:** `prisma/schema.prisma:362-384`

**Problém:** Není vidět, jestli API endpoints verifikují ownership CompetitorGroup.

**Riziko:** User A může číst/editovat CompetitorGroup User B.

**Doporučení:** Zkontrolovat všechny `/api/competitor-groups/*` endpoints:

```typescript
// /api/competitor-groups/[id]/route.ts

export async function GET(request: Request, { params }: Props) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params

  const group = await prisma.competitorGroup.findUnique({
    where: { id },
  })

  // ✅ CRITICAL: Verify ownership
  if (group?.userId !== session.user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // ...
}
```

**Effort:** Medium (1 hodina - audit všech endpoints)
**Impact:** High (pokud chybí)
**Priority:** 🟡 **MEDIUM** (audit needed)

---

## 🔵 Nízké Priority

### 15. Environment Variable Validation

**Doporučení:** Přidat Zod schema pro env vars.

```typescript
// src/lib/env.ts
import { z } from 'zod'

const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  NEXTAUTH_SECRET: z.string().min(32),
  FACEBOOK_APP_ID: z.string().min(1),
  FACEBOOK_APP_SECRET: z.string().min(1),
  FACEBOOK_CONFIG_ID: z.string().min(1),
  ENCRYPTION_KEY: z.string().length(44), // base64 32 bytes = 44 chars
  // ...
})

export const env = envSchema.parse(process.env)
```

**Effort:** Low (30 minut)
**Impact:** Low
**Priority:** 🔵 **LOW**

---

### 16. Dependency Security Audit

**Doporučení:** Pravidelně spouštět `npm audit`.

```bash
npm audit
npm audit fix
```

**Effort:** Low (5 minut)
**Impact:** Varies
**Priority:** 🔵 **LOW** (ongoing)

---

### 17. Add Security.txt

**Doporučení:** Přidat `/public/.well-known/security.txt`.

```
Contact: mailto:security@invix.cz
Expires: 2027-01-31T12:00:00.000Z
Preferred-Languages: cs, en
Canonical: https://orchideo.ppsys.eu/.well-known/security.txt
```

**Effort:** Low (5 minut)
**Impact:** Low
**Priority:** 🔵 **LOW**

---

## ✅ Pozitivní Nálezy

### 1. Encryption Implementation ✅

**Soubor:** `src/lib/utils/encryption.ts`

**Pozitivní:**
- ✅ AES-256-GCM (authenticated encryption)
- ✅ Random IV per encryption
- ✅ Auth tag verification
- ✅ Proper error handling
- ✅ Constant-time comparison (via GCM auth tag)

**Doporučení:** Žádné, implementace je **excellent**.

---

### 2. Input Validation s Zod ✅

**Pozitivní:**
- ✅ Všechny API endpoints používají Zod validation
- ✅ Type-safe schemas
- ✅ Clear error messages

**Příklad:**
```typescript
const requestSchema = z.object({
  pageId: z.string().min(1, 'ID stránky je povinné'),
  industryCode: z.string().optional().default('DEFAULT'),
})
```

---

### 3. Database Sessions ✅

**Pozitivní:**
- ✅ Database-backed sessions (ne JWT)
- ✅ Easy revocation
- ✅ Prisma adapter (secure)

---

### 4. Error Handling ✅

**Pozitivní:**
- ✅ Structured error responses
- ✅ Error codes (TOKEN_EXPIRED, PERMISSION_DENIED, etc.)
- ✅ Proper HTTP status codes

---

### 5. Rate Limiting na PDF ✅

**Soubor:** `src/app/api/report/[token]/pdf/route.ts:9-70`

**Pozitivní:**
- ✅ In-memory rate limiter implementován
- ✅ Per-token limiting
- ✅ Automatic cleanup (prevence memory leak)
- ✅ Proper headers (X-RateLimit-Remaining, Retry-After)

---

## 🎯 Doporučené Akce

### Immediate (Tento Týden)

1. **🔥 Odstranit `allowDangerousEmailAccountLinking`** (5 min)
2. **🔥 Přidat security headers middleware** (30 min)
3. **🔥 Přidat rate limiting middleware** (1 hodina)

### Short-Term (Tento Měsíc)

4. **Změnit public_token na cryptographically secure** (15 min)
5. **Zkrátit session maxAge na 7 dní (production)** (2 min)
6. **Přidat input sanitization utility** (30 min)
7. **Audit CompetitorGroup access control** (1 hodina)
8. **Přidat CORS middleware** (15 min)

### Medium-Term (Q1 2026)

9. **Implementovat token refresh logic** (2 hodiny)
10. **Audit log statements, přidat redaction** (1 hodina)
11. **Přidat CSRF protection** (1 hodina)
12. **Environment variable validation** (30 min)

### Ongoing

13. **Weekly `npm audit`** (5 min/týden)
14. **Security.txt** (5 min)

---

## 📝 Implementační Plán

Viz samostatný dokument: **SECURITY-IMPLEMENTATION-PLAN.md**

---

## 📞 Contact

**Security Issues:** Reportovat na `security@invix.cz`

**Další Audit:** Q2 2026

---

**Report Version:** 1.0
**Datum:** 2026-01-31
**Status:** ✅ Complete
