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

### Misleading "read_insights" Error Messages in Triggers

**Datum**: 2026-02-04
**Kontext**: Analýza malé stránky (<100 followers) zobrazovala matoucí error message v triggerech BASIC_004, BASIC_005, CONT_004

**Problém**:
- Stránka "Zastav Nemovitost" má 1 fanoušek
- Facebook API vrací error code 100 "NOT_SUPPORTED" (stránka má příliš málo sledujících pro insights)
- Ale triggery zobrazovaly: "vyžadují oprávnění read_insights" ❌
- Uživatel si myslel že problém je v oprávněních, přitom byl v počtu fanoušků

**Příčina**: Error metadata se ztrácela v data pipeline:
```
✅ Collector: Sbírá insightsError + insightsErrorMessage (z insights.ts)
❌ Normalizer: Nezahrnuje do výstupu (ztráta dat)
❌ Runner: Nepředává metadata do TriggerInput
❌ Triggers: Hardcodují "vyžadují oprávnění read_insights"
```

**Řešení**: Propagovat error metadata celou pipeline:

1. **TriggerInput type** - přidat optional metadata:
```typescript
export interface TriggerInput {
  // ... existing fields
  collectionMetadata?: {
    insightsError?: string | null
    insightsErrorMessage?: string | null
  }
}
```

2. **Normalizer** - zachovat error fields:
```typescript
collectionMetadata: {
  // ... existing fields
  insightsError: collectedData.metadata.insightsError ?? null,
  insightsErrorMessage: collectedData.metadata.insightsErrorMessage ?? null,
}
```

3. **Runner** - předat metadata triggerům:
```typescript
const triggerInput: TriggerInput = {
  // ... existing fields
  collectionMetadata: {
    insightsError: normalizedData.collectionMetadata.insightsError,
    insightsErrorMessage: normalizedData.collectionMetadata.insightsErrorMessage,
  },
}
```

4. **Triggers** - použít actual error message s fallback:
```typescript
input.collectionMetadata?.insightsErrorMessage ||
  'Page Insights nejsou dostupné (vyžadují oprávnění read_insights)'
```

**Error messages z insights.ts:**
- `PERMISSION_DENIED`: "Chybí oprávnění read_insights. Přihlaste se znovu přes Facebook."
- `NOT_SUPPORTED`: "Tato stránka nepodporuje insights (např. příliš málo sledujících)."
- `RATE_LIMITED`: "Facebook API limit překročen. Zkuste to později."
- `UNKNOWN`: "Nepodařilo se načíst insights. Zkuste to později."

**Prevence**:
- ✅ Error metadata MUSÍ projít celou pipeline (collector → normalizer → runner → triggers)
- ✅ Nepoužívat hardcoded error messages pokud máme actual error z API
- ✅ Optional fields pro backward compatibility
- ✅ Vždy poskytovat fallback pro staré analýzy
- ⚠️ Empty string `""` je falsy → použít `|| fallback` (ne `??`)

**Impact:**
- Staré analýzy: Fungují s fallback messages (backward compatible)
- Nové analýzy: Zobrazují specifické error messages
- UX: Uživatelé vidí správnou příčinu problému

---

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

### Post-Level Insights Were Never Collected Despite Function Existing

**Datum**: 2026-02-03
**Kontext**: BASIC_003 trigger (Reaction Structure Analysis) vždy vracel `INSUFFICIENT_DATA` protože reaction breakdowns (like, love, wow, etc.) byly vždy 0

**Problém**:
- `fetchPostInsights()` funkce existovala v `feed.ts` od začátku ✅
- Normalizer očekával `post.insights` a správně je mapoval ✅
- Ale reakce byly vždy 0 ve všech analýzách ❌
- Facebook API fetch vracel pouze `reactions.summary(total_count)` ❌

**Příčina**:
- Collector nikdy nevolal `fetchPostInsights()` pro jednotlivé posty
- Data flow byl: `fetchPageFeed()` → `convertToRawPost()` → `normalizePost()`
- Chyběla enrichment fáze mezi feed fetch a normalizací
- Fetch v `fetchPageFeed()` používal pouze `reactions.summary(total_count)` (aggregate), ne breakdown

**Řešení**: Přidána enrichment fáze s paralelním fetchem post insights:

```typescript
// New flow:
fetchPageFeed() → enrichPostsWithInsights() → convertToRawPost() → normalizePost()
                   ↓ (parallel, max 5)
                   fetchPostInsights() per post

async function enrichPostsWithInsights(posts, token, pageId) {
  const semaphore = new Semaphore(5)  // Concurrency control
  const rateLimiter = getRateLimiter('...', { maxRequests: 100, windowMs: 60_000 })

  await Promise.allSettled(posts.map(async (post) => {
    const release = await semaphore.acquire()
    try {
      await rateLimiter.acquire()
      const insights = await fetchPostInsights(post.id, token)
      if (insights) post.processedInsights = insights  // Assign to new field
    } finally {
      release()
    }
  }))
}
```

**Prevence**:
- ✅ Zkontrolovat že helper funkce se SKUTEČNĚ volají (ne jen existují)
- ✅ End-to-end test by odhalil (reakce by neměly být vždy 0)
- ✅ Code review data flow od API až do DB
- ⚠️ Facebook API má různé endpointy pro aggregate vs breakdown data
- ⚠️ Feed endpoint vrací jen `reactions.summary`, breakdown vyžaduje separate `/insights` endpoint

**Gotchas při implementaci:**
1. **Timeout konflikt**: Runner má timeout 60s (default), enrichment 120s → runner může timeout dřív
   - Fix: Enrichment má vlastní timeout + fallback na unenriched data
2. **Stats misleading**: "failed" zahrnuje jak errors, tak posty bez dostupných insights (null)
   - Better: Rozdělit na `enriched` / `no_insights` / `failed`
3. **Pending requests po timeout**: Promise.race() timeout nezastaví běžící promises
   - Improvement: AbortController pro clean cancellation
4. **Rate limiter per-instance**: Multiple analyses sdílí quota
   - OK pro single-user VPS, ale multi-tenant vyžaduje per-user limiting

**Performance impact:**
- Typical: +30-90s pro 50-200 postů
- Acceptable: Background job pattern, uživatel nemusí čekat
- MAX_FEED_POSTS = 300 může timeout při slow API (2s/post * 300/5 = 120s)

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
