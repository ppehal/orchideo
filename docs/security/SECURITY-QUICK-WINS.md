# Orchideo - Security Quick Wins

**Datum:** 2026-01-31
**Effort:** < 1 hodina celkem
**Impact:** Eliminace CRITICAL vulnerabilities

---

## 🎯 Cíl

Tento dokument obsahuje **nejrychlejší bezpečnostní opravy**, které můžete implementovat **během 1 hodiny** a odstranit tím všechny **kritické vulnerabilities**.

**Co získáte:**

- ✅ Eliminace Account Takeover rizika
- ✅ Základní security headers (XSS, Clickjacking protection)
- ✅ Kratší session lifetime v production

**Development Impact:** ❌ Žádný - všechno funguje stejně

---

## 🔥 Fix #1: Account Takeover (5 minut)

### Problém

```typescript
// src/lib/auth.ts:31
allowDangerousEmailAccountLinking: true,  // ❌ CRITICAL
```

Umožňuje útočníkovi převzít účet oběti vytvořením nového Facebook účtu se stejným emailem.

### Řešení

**Soubor:** `src/lib/auth.ts`

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

### Test

```bash
npm run dev
# Login flow should work exactly the same
```

### Hotovo! ✅

Právě jste eliminovali **kritickou bezpečnostní chybu** za 5 minut.

---

## 🛡️ Fix #2: Session Lifetime (2 minuty)

### Problém

Session platí 30 dní i v production → stolen token má dlouhé validity window.

### Řešení

**Soubor:** `src/lib/auth.ts`

```diff
  session: {
    strategy: 'database',
-   maxAge: 30 * 24 * 60 * 60, // 30 days
+   maxAge: process.env.NODE_ENV === 'production'
+     ? 7 * 24 * 60 * 60   // 7 days in production
+     : 30 * 24 * 60 * 60, // 30 days in development
  },
```

### Test

```bash
# Development - still 30 days
NODE_ENV=development npm run dev

# Production - now 7 days
NODE_ENV=production npm run build && npm start
```

### Hotovo! ✅

---

## 🔒 Fix #3: Security Headers (20 minut)

### Problém

Chybějící security headers → XSS, Clickjacking, MIME sniffing útoky možné.

### Řešení

**Vytvořit:** `middleware.ts` v root projektu

```typescript
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const response = NextResponse.next()

  // Security Headers
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=()')
  response.headers.set('X-XSS-Protection', '1; mode=block')

  // HTTPS only in production
  if (process.env.NODE_ENV === 'production') {
    response.headers.set(
      'Strict-Transport-Security',
      'max-age=31536000; includeSubDomains; preload'
    )
  }

  // Content Security Policy
  const csp = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https://platform-lookaside.fbsbx.com https://*.fbcdn.net",
    "font-src 'self' data:",
    "connect-src 'self' https://graph.facebook.com https://www.facebook.com",
    'frame-src https://www.facebook.com',
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join('; ')

  response.headers.set('Content-Security-Policy', csp)

  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
```

### Test

```bash
npm run dev

# Check headers
curl -I http://localhost:3001

# Expected:
# X-Content-Type-Options: nosniff
# X-Frame-Options: DENY
# Content-Security-Policy: ...
```

### Hotovo! ✅

---

## 📋 Checklist

Po dokončení všech 3 fixes (celkem ~30 minut):

- [ ] Fix #1: `allowDangerousEmailAccountLinking` odstraněno
- [ ] Fix #2: Session lifetime je 7 dní v production
- [ ] Fix #3: Security headers middleware vytvořen
- [ ] `npm run dev` funguje
- [ ] Login flow funguje
- [ ] `curl -I` ukazuje security headers

---

## 🎉 Výsledek

Právě jste implementovali **3 kritické bezpečnostní opravy** za **30 minut** a dramaticky zlepšili security posture aplikace Orchideo.

### Co je hotovo:

✅ **Account Takeover** vulnerability eliminována
✅ **Session hijacking** risk snížen (7d místo 30d)
✅ **XSS attacks** prevence (CSP)
✅ **Clickjacking** prevence (X-Frame-Options)
✅ **MIME sniffing** prevence (X-Content-Type-Options)

### Co zbývá:

🟠 **Rate limiting** na API endpoints (1 hodina) - viz SECURITY-IMPLEMENTATION-PLAN.md
🟠 **Secure public tokens** (15 minut)
🟠 **Input sanitization** (30 minut)

Ale nejhorší vulnerabilities jsou **už opravené**! 🎊

---

## 🚀 Deploy

### Development

```bash
git add middleware.ts src/lib/auth.ts
git commit -m "security: fix critical vulnerabilities (account takeover, session lifetime, headers)"
git push
```

### Production

Po code review:

```bash
# Deploy as usual
npm run build
npm start
```

---

## 📞 Questions?

Viz [SECURITY-IMPLEMENTATION-PLAN.md](./SECURITY-IMPLEMENTATION-PLAN.md) pro detaily.

**Security Issues:** `security@invix.cz`

---

**Version:** 1.0
**Last Updated:** 2026-01-31
