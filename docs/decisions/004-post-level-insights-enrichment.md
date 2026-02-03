---
title: 'Post-Level Insights Enrichment Architecture'
description: 'Decision to add enrichment phase for collecting detailed post-level insights from Facebook API'
status: 'accepted'
tags: [adr, facebook-api, architecture, performance, data-collection]
---

# ADR-004: Post-Level Insights Enrichment Architecture

**Datum**: 2026-02-03
**Status**: Accepted

## Kontext

BASIC_003 trigger (Reaction Structure Analysis) vždy vracel `INSUFFICIENT_DATA` protože reaction breakdowns (like, love, wow, haha, sad, angry) byly vždy 0. Přestože funkce `fetchPostInsights()` existovala, nikdy nebyla volána během sběru dat.

### Problém

1. Facebook API feed endpoint (`/{pageId}/feed`) vrací pouze aggregate reakce (`reactions.summary(total_count)`)
2. Breakdown reakcí (like vs love vs wow) vyžaduje separate endpoint per post (`/{postId}/insights`)
3. Collector prováděl pouze jeden fetch: `fetchPageFeed()` → přímá normalizace
4. Triggers závislé na reaction structure nemohly fungovat

### Možnosti

#### Opce A: Inline Fetch During Feed Collection
```typescript
// V fetchPageFeed() pro každý post:
for (const post of response.data) {
  post.insights = await fetchPostInsights(post.id, token)
  posts.push(post)
}
```

**Pros:**
- Jednoduchá implementace
- Žádná nová abstrakce

**Cons:**
- Sequential (slow) - žádná paralelizace
- Smíchává concerns (feed fetch + enrichment)
- Nelze vypnout bez měnění fetchPageFeed
- Obtížné testování/debugging

#### Opce B: Batch API Approach
```typescript
// Fetch všech insights v jednom batch requestu
const batchResults = await fetchBatchPostInsights(postIds, token)
```

**Pros:**
- Velmi rychlé (1 request místo N)
- Minimální API quota usage

**Cons:**
- Facebook Batch API má limity (50 requests/batch)
- Složitější error handling (all-or-nothing)
- Nutnost implementovat batch API wrapper
- Edge cases s velkými datasety (200+ postů = 4+ batches)

#### Opce C: Separate Enrichment Phase (CHOSEN)
```typescript
// Data flow:
fetchPageFeed() → enrichPostsWithInsights() → convertToRawPost() → normalizePost()
                   ↓ (parallel, controlled)
                   fetchPostInsights() per post
```

**Pros:**
- Separation of concerns (feed vs enrichment)
- Paralelní fetch s concurrency control
- Graceful degradation (enrichment selhání neblokuje analýzu)
- Optional (lze vypnout via options)
- Testovatelné izolovaně
- Rate limiting built-in

**Cons:**
- Přidává komplexitu (nová funkce + integrace)
- Performance overhead (30-90s pro typickou analýzu)
- Memory: mutuje original posts array

## Rozhodnutí

**Zvolena Opce C: Separate Enrichment Phase**

### Implementace

1. **Nová funkce**: `enrichPostsWithInsights(posts, accessToken, pageId)`
   - Paralelní fetch s Semaphore(5) pro concurrency control
   - Rate limiting (100 req/min) via singleton RateLimiter
   - Graceful error handling (individual post failures neblokují)
   - Returns enriched posts + stats (enriched/failed counts)

2. **Integrace do collectAnalysisData()**:
   - Volá se mezi `fetchPageFeed()` a `convertToRawPost()`
   - Wrapped v Promise.race() s timeout (120s)
   - Try-catch s fallback na unenriched posts
   - Optional via `options.fetchPostInsights` (default: true)

3. **Type system**:
   - Nové pole: `FacebookPost.processedInsights?: Record<string, number>`
   - Oddělené od raw `insights` (Graph API format)
   - Mapped do `RawPost.insights` v convertToRawPost()

4. **Observability**:
   - Progress logging každých 10 postů
   - Stats reporting (enriched/failed)
   - Individual failures jako debug level (ne errors)

### Architektura Důvody

**Proč ne inline (Opce A)?**
- Sequential fetch by byl příliš pomalý (N * latency)
- Smíchává concerns, obtížné testování
- Nelze vypnout bez měnění core feed logic

**Proč ne batch API (Opce B)?**
- Vyžaduje implementaci batch wrapper (komplexita)
- Facebook batch limity (50/request)
- All-or-nothing error handling problematické
- Overkill pro typický use case (50-150 postů)
- Lze přidat později jako optimization

**Proč separate phase?**
- Clean separation: feed fetch = get structure, enrichment = add details
- Paralelizace s kontrolou (Semaphore + rate limit)
- Graceful degradation: enrichment může selhat, analýza pokračuje
- Optional: lze vypnout pro debugging/testing
- Testovatelné: unit tests pro enrichment izolovaně
- Maintainable: každá fáze má jasnou responsibility

## Důsledky

### Pozitivní

- ✅ **BASIC_003 trigger funguje** - dostává real data místo INSUFFICIENT_DATA
- ✅ **Všechny reaction-based triggers** nyní dostávají breakdown
- ✅ **Graceful degradation** - analysis continues i když enrichment fails
- ✅ **Optional** - lze vypnout via `fetchPostInsights: false`
- ✅ **Observability** - clear logs, stats reporting
- ✅ **Rate limiting** - respektuje FB API limits (100/min)
- ✅ **Concurrency control** - max 5 parallel (prevents overload)
- ✅ **Backward compatible** - existing analyses unaffected
- ✅ **Separation of concerns** - clean architecture

### Negativní

- ⚠️ **Performance overhead**: +30-90s pro typickou analýzu (50-200 postů)
  - Mitigation: Background job pattern, user doesn't wait
- ⚠️ **Complexity**: Nová funkce + integration points
  - Mitigation: Well-documented, tested, clear responsibilities
- ⚠️ **Memory**: Mutuje original posts array
  - Mitigation: Posts jsou local scope, GC po return, negligible overhead
- ⚠️ **Timeout edge case**: 300 slow posts (2s each) může timeout
  - Mitigation: Timeout protection (120s), fallback na basic data
- ⚠️ **Stats misleading**: "failed" includes both errors and null returns
  - Future: Rozdělit na `enriched` / `no_insights` / `failed`

### Trade-offs

| Aspect | Trade-off | Decision |
|--------|-----------|----------|
| **Speed** | Slower analysis (30-90s overhead) | Acceptable - background job, data completeness důležitější |
| **Complexity** | More code, more moving parts | Acceptable - well-structured, testable, maintainable |
| **Reliability** | Extra API calls = more failure points | Mitigated - graceful degradation, analysis continues on failure |
| **Resources** | More API quota usage | Acceptable - conservative rate limiting (100/min) |
| **Maintainability** | Separate phase = extra integration point | Better - clean separation, easier to test/modify |

## Alternativy Zvažované

### Batch API (Future Optimization)

Můžeme přidat batch API jako optimalizaci v budoucnu:
```typescript
if (posts.length > 50 && options.useBatchApi) {
  enrichResult = await enrichPostsWithBatchApi(posts, token)
} else {
  enrichResult = await enrichPostsWithInsights(posts, token, pageId)
}
```

**Kdy implementovat:**
- Pokud performance overhead je příliš vysoký (>2 min typicky)
- Pokud API quota se stává problémem
- Pokud máme mnoho high-frequency analyses

### Partial Enrichment (Future Optimization)

Enrichit pouze posty použité triggery:
```typescript
// Pouze top N postů podle engagementu
const topPosts = posts.sort(...).slice(0, 30)
await enrichPostsWithInsights(topPosts, token, pageId)
```

**Kdy implementovat:**
- Pokud většina postů není used by triggers
- Pokud performance je kritická
- Analytics na data usage ukáže sparse využití

## Compliance & Security

- ✅ Žádné token leaks v logs/errors
- ✅ Rate limiting respektuje FB API terms
- ✅ Graceful degradation (no blocking failures)
- ✅ Backward compatible (no breaking changes)
- ✅ Optional feature (can be disabled)

## Monitoring & Success Metrics

**Metrics to Track:**
- Enrichment success rate (enriched / total)
- Average enrichment duration
- Failed vs no_insights ratio
- BASIC_003 trigger INSUFFICIENT_DATA rate (should be ~0%)

**Success Criteria:**
- ✅ BASIC_003 trigger works (no INSUFFICIENT_DATA)
- ✅ 80%+ posts enriched successfully
- ✅ Analysis duration < 2 minutes (typical)
- ✅ No increase in analysis failures

## References

- Implementation: commit `62d9d2b`
- Verification: `tmp/edge-cases-analysis.md`
- Integration test plan: `tmp/integration-test-plan.md`
- Facebook Post Insights API: https://developers.facebook.com/docs/graph-api/reference/v19.0/insights#postinsights

## Related ADRs

- ADR-001: Facebook API Integration Strategy (hypothetical)
- ADR-002: Analysis Background Job Pattern (hypothetical)

---

_Accepted and implemented: 2026-02-03_
