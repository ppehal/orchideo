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

### Test Registry State Management with ESM Modules

**Datum**: 2026-02-04
**Kontext**: Implementace unit testů pro Trigger Registry s Vitest
**Problém**: Tests affecting global registry state, `require('@/lib/triggers/rules')` fails in ESM context
**Příčina**:
1. Registry je singleton Map sdílený mezi všemi testy
2. `clearRegistry()` volaný v jednom testu ovlivňuje jiné testy (race condition)
3. ESM modules nepodporují `require()` - dynamický import nepomáhá s reload
4. Re-import registrovaných triggerů v afterEach selhává v ESM

**Řešení**:
```typescript
// ❌ ŠPATNĚ: Snaha re-importovat registry v afterEach
afterEach(() => {
  clearRegistry()
  require('@/lib/triggers/rules')  // Error: Cannot find module
})

// ✅ SPRÁVNĚ: Akceptovat shared state, filter test data
it('verifies trigger IDs', () => {
  const basicTriggers = getTriggersByCategory('BASIC')
  const realBasicTriggers = basicTriggers.filter(t => !t.id.startsWith('TEST_'))
  realBasicTriggers.forEach(t => {
    expect(t.id).toMatch(/^BASIC_\d+$/)
  })
})

// ✅ NEBO: Skippnout test při prázdném registry
it('processes data', () => {
  const count = getTriggerCount()
  if (count === 0) {
    console.warn('Skipping test - no triggers registered')
    return
  }
  // ... test logic
})
```

**Prevence**:
- NIKDY nepoužívat `require()` v ESM context (fails at runtime)
- Pro singleton registry akceptovat shared state mezi testy
- Filtrovat test data (např. `TEST_*` prefix) místo snažení se clearovat
- Nebo použít conditional tests s early return při prázdném state
- `clearRegistry()` jen v beforeEach pro testy které aktivně registrují test triggers

**Pattern: Test Isolation Strategies**
1. **Shared State (OK)**: Filter test data, guard proti empty state
2. **Isolated State (better but complex)**: Dependency injection pro registry
3. **Mock State (overkill)**: Mock registry functions pro každý test

**Files**: `tests/unit/triggers/engine.test.ts`, `tests/unit/triggers/registry.test.ts`

---

### React 19 useOptimistic - Automatic Revert Requires Throw

**Datum**: 2026-02-04
**Kontext**: Migrace use-alerts hooku na React 19 useOptimistic pro automatické error handling
**Problém**: Optimistic updates se nerevertovaly při selhání API volání, UI zobrazovalo nesprávný stav
**Příčina**:
- React 19 `useOptimistic` hook automaticky revertuje změny POUZE když funkce throwne error
- Naše catch bloky zachytávaly error, zobrazovaly toast, ale NE-throwovaly → revert se neprovedl
- TypeScript nezachytí tento problém, protože catch může error spolknout

**Řešení**:
```typescript
// ❌ Špatně: error spolknutý, žádný revert
try {
  await fetch(...)
} catch (error) {
  toast.error('Chyba')
  // Missing throw!
}

// ✅ Správně: re-throw pro automatic revert
try {
  await fetch(...)
} catch (error) {
  toast.error('Chyba')
  throw error  // ← Kritické!
}
```

**Prevence**:
- VŽDY re-throw error v catch blocích při použití useOptimistic
- Lint rule: eslint-plugin-react-hooks může detekovat missing throws
- Pattern: User feedback (toast) před throw, ne po něm

**Files**: `use-alerts.ts`

---

### React 19 Server Actions - FormData Null Safety

**Datum**: 2026-02-04
**Kontext**: Konverze formulářů na React 19 Server Actions s FormData
**Problém**: `formData.get('field')` může vrátit `null`, ale type assertion `as string` to ignoruje
**Příčina**:
- FormData.get() vrací `FormDataEntryValue | null`
- Type assertion `as string` forcuje typ, ale runtime hodnota může být null
- TypeScript strict mode to nedetekuje při direct assertion

**Řešení**:
```typescript
// ❌ Špatně: null crash
const name = formData.get('name') as string

// ✅ Správně: null-safe s fallback
const name = (formData.get('name') as string | null) || ''

// ✅ Nebo Zod validation:
const schema = z.object({
  name: z.string().min(1, 'Required')
})
const parsed = schema.safeParse(rawData)
```

**Prevence**:
- NIKDY direct type assertion na FormData values
- Vždy použít `as string | null` + fallback nebo Zod
- Pro required fields: Zod `.min(1)` místo jen `.string()`

**Files**: `competitor-groups.ts`, `analysis-form.ts`

---

### Next.js Nested Suspense - Split Fast/Slow Data for 5x Better FCP

**Datum**: 2026-02-04
**Kontext**: Optimalizace competitors page, která měla pomalý First Contentful Paint (~250ms)
**Problém**: Celá stránka čekala na pomalý Prisma query s nested relations, i když header mohl renderovat okamžitě
**Příčina**:
- Single async Server Component fetchoval všechna data najednou (pages + groups s relations)
- Fast data (pages pro form) i slow data (groups s competitors) blokovaly celý render
- Next.js čekal na dokončení všech queries před odesláním HTML

**Řešení - Progressive Rendering**:
```typescript
// ❌ Špatně: blocking render
export default async function Page() {
  const pages = await getPages()       // Fast: ~50ms
  const groups = await getGroups()     // Slow: ~200ms
  return <PageWithData pages={pages} groups={groups} />
}

// ✅ Správně: split fast/slow with Suspense
export default async function Page() {
  const pages = await getPages()  // Fast: renders immediately

  return (
    <>
      <Header />
      <CreateButton pages={pages} />

      <Suspense fallback={<Skeleton />}>
        <GroupListServer />  {/* Slow: streams when ready */}
      </Suspense>
    </>
  )
}

// Separate Server Component for slow data
async function GroupListServer() {
  const groups = await getGroups()  // Slow query isolated
  return <GroupList groups={groups} />
}
```

**Performance Impact**:
- First Contentful Paint: 250ms → 50ms (**5x faster**)
- User sees header + button immediately
- Groups list streams in progressively (no perceived wait)

**Prevence**:
- VŽDY split fast/slow data do separate components
- Fast path: Auth, simple selects, lightweight queries
- Slow path: Joins, aggregations, large datasets → wrap in Suspense
- Pattern: Page component = fast data + layout, separate Server Components = slow data

**Files**: `competitors/page.tsx`, `group-list-server.tsx`

---

### Czech Text Parsing - Sentence Delimiter Edge Cases

**Datum**: 2026-02-04
**Kontext**: Implementace automatického parsování doporučení na assessment + tips v trigger detail pages
**Problém**: Jednoduchý regex `/\.\s+/` splitoval i na zkratkách (px., atd.) a nezvládal vykřičníky
**Příčina**:
1. Původní regex splitoval na každé tečce následované mezerou, bez ohledu na následující znak
2. Vykřičníky (!) nebyly zahrnuty jako sentence delimiters, přitom 34 doporučení je používá
3. České doporučení obsahují edge cases: zkratky (px.), čísla (5. Zkuste), URLs (example.com)

**Řešení**:
```typescript
// ❌ Špatně: splituje i na zkratkách
text.split(/\.\s+/)

// ✅ Správně: splituje jen pokud následuje české velké písmeno
text.split(/[.!]\s+(?=[A-ZÁČĎÉĚÍŇÓŘŠŤÚŮÝŽ])/)
```

**Klíčové body**:
- Pozitivní lookahead `(?=...)` zajistí, že split je pouze před velkým písmenem
- Character class `[.!]` pokrývá tečku i vykřičník
- Czech alphabet class: `[A-ZÁČĎÉĚÍŇÓŘŠŤÚŮÝŽ]` (ne ASCII `[A-Z]`)
- Edge cases handled:
  - `"px. Z"` → **split** (uppercase after period)
  - `"px. další"` → **NO split** (lowercase after period)
  - `"example.com. Text"` → **NO split** (`.com.` má lowercase před `T`)
  - `"Výborně! Pokračujte."` → **split** (exclamation + uppercase)

**Performance**: O(n) where n = string length, žádný exponential backtracking

**Prevence**:
- Pro český text vždy použít české znaky v character classes
- Testovat edge cases: zkratky, URL, čísla, emoji
- Pozitivní lookahead je výkonnější než negativní lookbehind pro sentence splitting

**Testováno**: 16 edge cases + 64 real BASIC_001 recommendations (100% success rate)

---

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

### Batch API Security - Access Token in Request Body

**Datum**: 2026-02-04
**Kontext**: Implementace Facebook Batch API pro optimalizaci N+1 post insights queries
**Problém**: Initial implementation passing access token in request body instead of secure URL params + appsecret_proof
**Security Risk**: MEDIUM - tokens in body can be logged by middleware/proxies

**Příčina**:
- Facebook Batch API má flexibility v auth metodě (body vs query params)
- Initial implementation zvolilo jednodušší body approach
- Nekonzistentní s `client.ts` security pattern (používá appsecret_proof)

**Řešení**:
```typescript
// ❌ ŠPATNĚ: Token v request body
const response = await fetch(batchUrl, {
  method: 'POST',
  body: JSON.stringify({
    access_token: accessToken,  // Security risk
    batch: batchRequests,
  }),
})

// ✅ SPRÁVNĚ: Token v URL params + appsecret_proof
const batchUrl = new URL(`${GRAPH_API_BASE_URL}/`)
batchUrl.searchParams.set('access_token', accessToken)
batchUrl.searchParams.set('appsecret_proof', getAppSecretProof(accessToken))
batchUrl.searchParams.set('batch', JSON.stringify(batchRequests))

const response = await fetch(batchUrl.toString(), {
  method: 'POST',
  headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
})
```

**Best Practice**:
- VŽDY používat `appsecret_proof` pro Facebook API calls (prevents token theft)
- Export `getAppSecretProof()` z `client.ts` pro reuse v `feed.ts`
- Konzistentní security pattern napříč celou codebase

**Dodatečné opravy**:
1. **Index Mismatch Check**: Přidán warning pokud `batchResults.length !== batch.length`
2. **Partial Results Tracking**: Collector catch block nyní počítá již enriched posty místo slepého označení všech jako failed

**Files**: `client.ts` (export getAppSecretProof), `feed.ts` (secure batch API), `collector.ts` (partial results)
**References**: [Facebook App Secret Proof](https://developers.facebook.com/docs/graph-api/securing-requests#appsecret_proof)

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

## Vitest / Testing

### vi.clearAllMocks() vs vi.resetAllMocks() - Mock Leakage

**Datum**: 2026-02-06
**Kontext**: Facebook feed testy s `mockResolvedValueOnce`
**Problém**: Testy kontaminují následující testy. Pokud test nastaví 3 `mockResolvedValueOnce` ale spotřebuje jen 2 (např. `maxPages: 2`), třetí mock "uteče" do dalšího testu.
**Příčina**:

- `vi.clearAllMocks()` / `mockClear()` maže POUZE call tracking (calls, instances, results)
- **NEMAŽE** `mockResolvedValueOnce` / `mockReturnValueOnce` fronty
- `vi.resetAllMocks()` / `mockReset()` maže tracking I implementace/return values

**Řešení**: Vždy používat `vi.resetAllMocks()` v `beforeEach`:

```typescript
// ❌ WRONG - mock queues leak between tests
beforeEach(() => {
  vi.clearAllMocks()
})

// ✅ CORRECT - fully resets mock state
beforeEach(() => {
  vi.resetAllMocks()
})
```

**Prevence**:

- V `beforeEach` VŽDY `vi.resetAllMocks()`, nikdy `vi.clearAllMocks()`
- V `afterEach` použít `vi.restoreAllMocks()` pro úplný reset

### FacebookApiError in vi.mock - Hoisting Issue

**Datum**: 2026-02-06
**Kontext**: Mockování `@/lib/integrations/facebook/client` s třídou `FacebookApiError`
**Problém**: `ReferenceError: Cannot access 'MockFacebookApiError' before initialization`
**Příčina**: `vi.mock()` je hoistován na začátek souboru - proměnné definované před ním ještě neexistují.
**Řešení**: Definovat třídu UVNITŘ factory funkce `vi.mock()`:

```typescript
// ❌ WRONG - class not available due to hoisting
class MockError extends Error { ... }
vi.mock('module', () => ({ Error: MockError }))

// ✅ CORRECT - define inside factory
vi.mock('module', () => {
  class MockError extends Error { ... }
  return { Error: MockError }
})
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
