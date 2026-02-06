---
title: 'Facebook Category Mapping Visualization & Type Safety'
description: 'Decision to add visual category mapping and runtime type validation'
status: 'accepted'
tags: [adr, ui, type-safety, validation]
---

# ADR-003: Facebook Category Mapping Visualization & Runtime Type Validation

**Datum**: 2026-02-03
**Status**: Accepted

## Kontext

Uživatelé nerozuměli, jak se jejich Facebook stránka kategorizuje do oborových benchmarků. Facebook poskytuje vlastní kategorie (např. "Restaurant", "Beauty Salon"), které my mapujeme na 9 interních IndustryCode kategorií (např. FOOD_RESTAURANT, BEAUTY_FITNESS).

**Problémy:**

1. Uživatel nevidí, jak jeho FB kategorie mapuje na benchmark
2. Není jasné, proč byl navržen konkrétní obor
3. Chybí reference, které FB kategorie se mapují na jaký obor
4. Type safety: `IndustryCode` je TypeScript type, ale databáze má `String` - možnost runtime errors

## Rozhodnutí

### 1. Vizualizace Mappingu

Přidat vizuální zobrazení "Facebook Category → Industry" na **4 místech**:

- **PageSelector cards**: Uživatel vidí mapping už při výběru stránky
- **IndustrySelector**: Jasně vidí, jaký obor byl detekován z FB kategorie
- **Report header**: Kontext v reportu, která FB kategorie byla použita
- **CategoryMappingInfo**: Expandable reference všech 220+ mappingů

**Implementace:**

- `CategoryMappingBadge` component s Unicode arrow (→) pro jednoduchost
- Responsive design s truncation pro dlouhé názvy
- Pre-computed `GROUPED_MAPPINGS` pro O(1) lookup performance
- NULL-safe rendering (backward compatible s existujícími analýzami)

### 2. Database Schema

Přidat `fb_page_category: String?` do Analysis model:

- **Nullable** pro backward compatibility (staré analýzy nemají kategorii)
- Ukládá originální FB kategorii pro historické záznamy
- Umožňuje debugging a analýzu accuracy mappingu

### 3. Runtime Type Validation

Vytvořit **`industry-validation.ts`** modul pro type-safe handling:

```typescript
// NOVÝ PŘÍSTUP - Runtime validation
sanitizeIndustryCode(code: string | null | undefined): IndustryCode
isValidIndustryCode(code: string): code is IndustryCode
getIndustryNameSafe(code: string | null | undefined): string
```

**Důvod:**

- TypeScript type assertions `(x as IndustryCode)` jsou unsafe pro DB data
- Database má `String` bez constraints → možnost nevalidních hodnot
- Komponenty mohou dostat invalid industry code → `INDUSTRIES[invalid]` = undefined → crash

**Použití:**

```typescript
// ❌ BEFORE - Unsafe
industryCode={(industry as IndustryCode) || 'DEFAULT'}

// ✅ AFTER - Safe
industryCode={sanitizeIndustryCode(industry)}
```

### 4. Security & Edge Cases

- `sanitizeForDisplay()`: Limit 200 znaků pro FB kategorie (prevent DoS)
- Whitespace trimming: `fbCategory?.trim()` (FB API může vrátit " ")
- NULL checks: Konzistentní `if (!fbCategory?.trim())` pattern
- Input validation: `restart-analysis.ts` script validuje industry code

## Důsledky

### Pozitivní

1. **UX Improvement**: Uživatel rozumí, proč dostal konkrétní benchmark
2. **Transparency**: Jasná vizualizace mappingu Facebook → Orchideo kategorie
3. **Type Safety**: Runtime validace zabraňuje crashes při invalid data
4. **Performance**: Pre-computed mappings (O(1) lookup místo O(n) při každém renderu)
5. **Security**: String sanitization, input validation, NULL safety
6. **Backward Compatible**: Nullable field, staré analýzy fungují
7. **Maintainability**: Centralizovaná validace v `industry-validation.ts`
8. **Debugging**: Historické záznamy FB kategorií pro analýzu accuracy

### Negativní

1. **Database Size**: +1 field na Analysis (minimální impact, text field)
2. **Code Complexity**: +3 nové komponenty, +1 validation modul
3. **Static Mapping**: 220+ kategorií hardcoded, nové FB kategorie vyžadují update kódu
4. **No DB Constraints**: `industry_code` je stále `String`, ne Prisma enum (breaking change)
5. **Manual Sync**: FB přidá novou kategorii → manuální update `fb-category-map.ts`

### Mitigace Negativních

- **Static Mapping**: Fallback na 'DEFAULT', logování neznámých kategorií (future work)
- **No DB Constraints**: Runtime validace + dokumentace best practices
- **Manual Sync**: Monitoring nezmapovaných kategorií (planned), dokumentace v LEARNINGS.md

## Alternativy

### Alternative 1: Prisma Enum pro IndustryCode

```prisma
enum IndustryCode {
  FOOD_RESTAURANT
  RETAIL
  // ...
}
```

**Výhody**: DB level validation, type-safe
**Nevýhody**: Breaking change, migrace existujících dat, složitější deployment
**Rozhodnutí**: ZAMÍTNUTO - příliš invazivní pro current stage, runtime validace dostačující

### Alternative 2: Žádná vizualizace, jen tooltip

**Výhody**: Jednodušší implementace
**Nevýhody**: Skrytá informace, horší UX
**Rozhodnutí**: ZAMÍTNUTO - vizualizace je core value add

### Alternative 3: API pro category lookup místo static mapy

**Výhody**: Dynamic, no code updates
**Nevýhody**: External dependency, latency, cost
**Rozhodnutí**: ZAMÍTNUTO - overkill pro 220 kategorií, static map je dostatečně performantní

## Implementace

- ✅ Database: `fb_page_category String?` v Analysis model
- ✅ Components: `CategoryMappingBadge`, `CategoryMappingInfo`
- ✅ Validation: `industry-validation.ts` modul
- ✅ Security: Sanitization, NULL checks, input validation
- ✅ Performance: Pre-computed `GROUPED_MAPPINGS`
- ✅ Tests: Type checking, linting passed
- ✅ Docs: CHANGELOG.md, LEARNINGS.md updated

## Reference

- Implementation: Commit `b6349d7`
- Verification: 23 edge cases analyzed, 8 critical/high fixed
- Files: 12 changed (+492, -15 lines)
- Security: XSS prevention, type safety, input validation
- Performance: O(1) lookup pre-computed mappings

## Follow-up Actions

1. **Monitoring**: Add logging for unmapped FB categories
2. **Analytics**: Track mapping accuracy (FB category → user-selected industry)
3. **Tests**: Add unit tests for edge cases (NULL, whitespace, invalid codes)
4. **Optimization**: Consider lowercase cache for `getIndustryFromFbCategory()`
5. **Future**: Evaluate Prisma enum migration when breaking changes are acceptable
