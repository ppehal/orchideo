---
title: 'Learnings & Gotchas'
description: 'Development discoveries, bug fixes, and edge cases for future reference'
status: 'active'
tags: [learnings, debugging, gotchas, reference]
---

# Orchideo - Learnings & Gotchas

> Zjištění z vývoje, oprav a edge cases. Reference pro budoucí debugging.

## Obsah

- [Prisma & Database](#prisma--database)
- [Next.js & React](#nextjs--react)
- [Facebook API](#facebook-api)
- [Auth](#auth)
- [TypeScript](#typescript)

---

## Prisma & Database

_Zatím žádné záznamy._

---

## Next.js & React

### Puppeteer/Chromium Docker configuration

**Datum**: 2026-02-01
**Kontext**: PDF generování s Puppeteer v Alpine Linux Docker kontejneru
**Problém**: PDF export selhal s chybou "chromium executable not found" přestože byl Chromium nainstalován v Dockerfile
**Příčina**:

1. Chybějící environment variables `PUPPETEER_EXECUTABLE_PATH` a `PUPPETEER_SKIP_CHROMIUM_DOWNLOAD` v docker-compose
2. Špatná cesta k executable (`/usr/bin/chromium-browser` místo `/usr/bin/chromium` v Alpine)
3. @sparticuz/chromium se snažil stáhnout binárku místo použití systémového Chromium
   **Řešení**:
4. Přidat env vars do docker-compose.vps.yml: `PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium` a `PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true`
5. Upravit pdf-service.ts: prioritně použít `process.env.PUPPETEER_EXECUTABLE_PATH`, fallback na `chromium.executablePath()`
6. Rebuild Docker image pro instalaci Chromium dependencies z Dockerfile.dev
   **Prevence**:

- V Alpine Linux se Chromium jmenuje `/usr/bin/chromium`, ne `chromium-browser`
- Puppeteer v Dockeru vždy vyžaduje explicitní nastavení executable path
- Po změně Dockerfile vždy rebuild image (`docker compose build` nebo `./QUICK-START.sh rebuild`)

---

### In-memory rate limiter memory leak

**Datum**: 2026-01-31
**Kontext**: Implementace rate limiteru pro PDF export endpoint
**Problém**: In-memory Map pro rate limiting nikdy nemaže staré záznamy
**Příčina**: Rate limiter ukládá `{ count, resetAt }` pro každý token, ale expirované záznamy se nemažou
**Řešení**: Přidána funkce `cleanupExpiredEntries()` volaná při každém requestu, která maže staré záznamy max 1x za hodinu
**Prevence**: Při implementaci in-memory cache/limiterů vždy přidat cleanup mechanismus nebo použít knihovnu s TTL podporou

---

### PDF generation orphan files

**Datum**: 2026-01-31
**Kontext**: PDF generování s cache do filesystem + database
**Problém**: Pokud zápis do DB selže po úspěšném uložení souboru, vznikne orphan file
**Příčina**: Operace nejsou v transakci - soubor se zapíše, ale DB insert selže
**Řešení**: Wrap DB insertu v try-catch, při chybě smazat soubor před rethrow
**Prevence**: Při operacích s externími resources (filesystem, S3) + DB vždy zvážit cleanup při částečném selhání

---

## Facebook API

### Facebook Graph API requires appsecret_proof for insights

**Datum**: 2026-02-01
**Kontext**: Testování aplikace v produkci - analýza stránky hlásila chybějící `read_insights` oprávnění
**Problém**:

- Token měl `read_insights` v `scopes` ✅
- `/me/permissions` ukazovalo `read_insights: granted` ✅
- Ale `granular_scopes` z debug_token NEOBSAHOVALO `read_insights` ❌
- Insights endpointy vracely error 200 "Provide valid app ID"

**Příčina**: Facebook vyžaduje `appsecret_proof` (HMAC-SHA256 podpis) pro citlivé API endpointy jako insights. Bez něj:

- Základní endpointy fungují (user info, page list)
- Insights endpointy selhávají s matoucí chybou "Provide valid app ID"
- `granular_scopes` nezahrnuje permissions vyžadující proof

**Řešení**: Přidat `appsecret_proof` ke všem Graph API requestům:

```typescript
function getAppSecretProof(accessToken: string): string {
  return crypto
    .createHmac('sha256', process.env.FACEBOOK_APP_SECRET!)
    .update(accessToken)
    .digest('hex')
}
// Přidat k URL: &appsecret_proof=${getAppSecretProof(token)}
```

**Prevence**:

- VŽDY používat `appsecret_proof` pro Facebook Graph API v produkci
- Při debugování FB permissions zkontrolovat jak `scopes` tak `granular_scopes`
- Chyba "Provide valid app ID" obvykle znamená chybějící appsecret_proof, ne špatné app ID

---

## Auth

_Zatím žádné záznamy._

---

## TypeScript

### Type System vs Database Schema Mismatch - IndustryCode Validation

**Datum**: 2026-02-03
**Kontext**: Implementace Facebook category mapping s IndustryCode enumem
**Problém**: TypeScript očekává `IndustryCode` union type, ale databáze má `industry_code: String` bez constraints. Možnost uložit nevalidní hodnoty (např. "MALICIOUS_CODE") přes manuální DB edits nebo nevalidovaný input.
**Příčina**:

1. Prisma schema: `industry_code String @default("DEFAULT")` - povoluje libovolný string
2. TypeScript type: `type IndustryCode = 'FOOD_RESTAURANT' | 'RETAIL' | ...` - compile-time only
3. Unsafe type assertions: `(industry as IndustryCode)` obchází type checking
4. Runtime data může být nevalidní bez kontroly

**Řešení**:

1. Vytvořen `src/lib/constants/industry-validation.ts` s runtime validací:
   - `sanitizeIndustryCode(code)` - validuje a vrací platný kód nebo 'DEFAULT'
   - `isValidIndustryCode(code)` - type guard
   - `getIndustryNameSafe(code)` - bezpečný lookup s fallbackem
2. Všude kde čteme z DB použít `sanitizeIndustryCode()` místo `as IndustryCode`
3. Přidat validaci do scripts (např. `restart-analysis.ts`)
4. Komponenty chráněny proti `INDUSTRIES[invalidCode]` → undefined crash

**Prevence**:

- NIKDY nepoužívat unsafe type assertions `(value as Type)` pro data z databáze
- Vždy validovat runtime data pomocí type guards nebo validators
- Pro enum hodnoty v DB zvážit Prisma enum místo String (breaking change pro existující data)
- Přidat input validation ve všech server actions před zápisem do DB
- Example validace:
  ```typescript
  // ❌ WRONG - Unsafe
  const code = dbValue as IndustryCode

  // ✅ CORRECT - Runtime validation
  const code = sanitizeIndustryCode(dbValue)
  ```

---

## Template pro nový záznam

```markdown
### [Název - krátký popis]

**Datum**: YYYY-MM-DD
**Kontext**: Co jsme dělali
**Problém**: Co se stalo
**Příčina**: Proč to bylo
**Řešení**: Jak jsme to vyřešili
**Prevence**: Jak se tomu vyhnout
```
