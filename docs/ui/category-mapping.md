---
title: 'Category Mapping Components'
description: 'Facebook category to industry mapping visualization'
status: 'active'
tags: [ui, components, mapping, badges]
---

# Category Mapping Components

> Vizuální zobrazení mapování Facebook kategorie → Orchideo obor

**Added**: v1.4.0 (2026-02-03)

---

## Overview

Facebook poskytuje vlastní kategorie stránek (např. "Restaurant", "Beauty Salon"), které Orchideo mapuje na 9 interních Industry kódů pro oborové benchmarky.

**Účel komponent:**
- Transparentní zobrazení, jak FB kategorie mapuje na benchmark
- Reference všech 220+ mapování pro uživatele
- Konzistentní vizualizace napříč aplikací

---

## CategoryMappingBadge

**Path:** `src/components/ui/category-mapping-badge.tsx`

Reusable badge komponenta zobrazující "FB Category → Industry" s Unicode arrow.

### Props

```typescript
interface CategoryMappingBadgeProps {
  fbCategory: string | null
  industryCode: IndustryCode
  variant?: 'compact' | 'full'
  className?: string
}
```

| Prop           | Type          | Default     | Description                                      |
| -------------- | ------------- | ----------- | ------------------------------------------------ |
| `fbCategory`   | string ∣ null | -           | Facebook kategorie (např. "Restaurant")          |
| `industryCode` | IndustryCode  | -           | Mapped industry kód                              |
| `variant`      | string        | 'compact'   | 'compact' nebo 'full' (s labely)                 |
| `className`    | string?       | undefined   | Additional CSS classes                           |

### Variants

**Compact** (default):
```tsx
<CategoryMappingBadge
  fbCategory="Restaurant"
  industryCode="FOOD_RESTAURANT"
  variant="compact"
/>
// Zobrazí: [Restaurant] → [Restaurace a jídlo]
```

**Full** (with labels):
```tsx
<CategoryMappingBadge
  fbCategory="Restaurant"
  industryCode="FOOD_RESTAURANT"
  variant="full"
/>
// Zobrazí: FB kategorie: [Restaurant] → Obor: [Restaurace a jídlo]
```

### Behavior

- **NULL safety**: `if (!fbCategory?.trim()) return null`
- **Sanitization**: Max 200 znaků pro FB kategorii
- **Validation**: Industry code validován přes `sanitizeIndustryCode()`
- **Responsive**: Same horizontal layout na mobile i desktop
- **Truncation**: Long categories truncate with `...` a full text v `title` atributu

### Styling

- **Badges**: `variant="secondary"` (consistent with existing design)
- **Arrow**: Unicode `→` (lighter than lucide-react icon)
- **Text size**: `text-xs` pro kompaktní zobrazení
- **Max width**: `max-w-[180px]` na badges pro truncation
- **Gap**: `gap-2` mezi elementy

### Usage Locations

1. **PageSelector cards** - Compact variant
2. **IndustrySelector form** - Full variant
3. **Report header** - Compact variant

---

## CategoryMappingInfo

**Path:** `src/components/analysis/category-mapping-info.tsx`

**Client Component** (`'use client'`)

Expandable card s úplným seznamem všech Facebook kategorie mapování seskupených podle oboru.

### Props

Žádné props - standalone komponenta.

### Features

- **Collapsible**: Default collapsed, manual toggle s `useState`
- **Grouped display**: 9 oborů, každý se seznamem FB kategorií
- **Count indicator**: Počet kategorií pro každý obor
- **Vertical list**: Bullet list místo comma-separated (lepší scannability)
- **No DEFAULT**: Filtrováno `filter(([code]) => code !== 'DEFAULT')`
- **Pre-computed**: Uses `getGroupedMappings()` O(1) lookup

### Behavior

- **Toggle icons**:
  - Collapsed: `<ChevronRight />`
  - Expanded: `<ChevronDown />`
- **Min touch target**: `min-h-11` (44px - WCAG AA compliance)
- **ARIA**: `aria-expanded`, `aria-controls` pro accessibility
- **Keyboard**: Funguje s Enter/Space

### Example Output

```
Referenční seznam Facebook kategorií
Přehled všech Facebook kategorií a jejich mapování na obory

[>] Zobrazit mapování

// Po kliknutí:

[v] Skrýt mapování

Restaurace a jídlo (14 kategorií)
• Restaurant
• Cafe
• Coffee Shop
• Bar
• ...

Maloobchod (11 kategorií)
• Retail Company
• E-commerce Website
• ...
```

### Usage Location

- **AnalyzeForm** - Separate card below settings (outside form)

### Why Manual Toggle?

- ❌ Radix `Collapsible` component doesn't exist in project
- ✅ Simple `useState` + chevron icons pattern
- ✅ Follows existing pattern: `src/components/admin/permissions-disclosure.tsx:41-49`

---

## Data Layer

### fb-category-map.ts

**Path:** `src/lib/constants/fb-category-map.ts`

Centrální mapování FB kategorií → Industry kódy.

#### Core Functions

```typescript
// Get industry from FB category (with trimming, case-insensitive, partial match)
getIndustryFromFbCategory(fbCategory: string | null | undefined): IndustryCode

// Get all mappings grouped by industry (O(1) pre-computed)
getGroupedMappings(): Record<IndustryCode, string[]>

// Format category for display with full metadata
formatCategoryMapping(fbCategory: string | null): {
  fbCategory: string | null
  industryCode: IndustryCode
  industryName: string
}
```

#### GROUPED_MAPPINGS

Pre-computed při module load:
```typescript
const GROUPED_MAPPINGS = (() => {
  const grouped: Record<IndustryCode, string[]> = { ... }

  for (const [fbCategory, industryCode] of Object.entries(FB_CATEGORY_MAP)) {
    grouped[industryCode].push(fbCategory)
  }

  // Sort alphabetically within each group
  for (const code of Object.keys(grouped) as IndustryCode[]) {
    grouped[code].sort()
  }

  return grouped
})()
```

**Performance**: O(1) lookup, computed once at startup.

---

## Validation Layer

### industry-validation.ts

**Path:** `src/lib/constants/industry-validation.ts`

Runtime type safety pro IndustryCode (řeší type system vs DB mismatch).

#### Functions

```typescript
// Sanitize potentially invalid industry code
sanitizeIndustryCode(code: string | null | undefined): IndustryCode

// Type guard
isValidIndustryCode(code: string): code is IndustryCode

// Safe name lookup with fallback
getIndustryNameSafe(code: string | null | undefined): string
```

#### When to Use

✅ **USE sanitizeIndustryCode() když:**
- Čteš `industry_code` z databáze
- Přijímáš industry code z API/form input
- Passing code do komponenty očekávající IndustryCode

❌ **DON'T USE unsafe type assertion:**
```typescript
// ❌ WRONG
const code = dbValue as IndustryCode

// ✅ CORRECT
const code = sanitizeIndustryCode(dbValue)
```

---

## Design Patterns

### NULL Handling

```tsx
// Component level
{fbCategory && <CategoryMappingBadge ... />}

// With whitespace check
{fbCategory?.trim() && <CategoryMappingBadge ... />}

// Component internal (early return)
if (!fbCategory?.trim()) return null
```

### Fallback Chaining

```tsx
// IndustrySelector
industryCode={suggestedIndustry || value || 'DEFAULT'}
```

### Sanitization Pattern

```tsx
// Always sanitize before display
const sanitizedCategory = sanitizeForDisplay(fbCategory.trim())
title={sanitizedCategory}
<span>{sanitizedCategory}</span>
```

---

## Accessibility

✅ **WCAG AA Compliance:**

- **Touch targets**: `min-h-11` (44px) na toggle button
- **ARIA labels**: `aria-label="mapuje se na"` na arrow span
- **ARIA expanded**: `aria-expanded={isOpen}` na toggle
- **ARIA controls**: `aria-controls="category-mapping-content"`
- **Focus indicators**: `focus-visible:ring-2`
- **Keyboard navigation**: Space/Enter pro toggle

---

## Performance

| Operation                  | Complexity | Notes                                    |
| -------------------------- | ---------- | ---------------------------------------- |
| `getGroupedMappings()`     | O(1)       | Pre-computed at module load              |
| `getIndustryFromFbCategory` direct match | O(1)       | Hashmap lookup                           |
| `getIndustryFromFbCategory` case-insensitive | O(n)       | Iterates FB_CATEGORY_MAP (220 entries)   |
| `getIndustryFromFbCategory` partial match | O(n²)      | Worst case, rare                         |
| `sanitizeIndustryCode()`   | O(1)       | `code in INDUSTRIES` check               |

**Future optimization**: Lowercase cache pro case-insensitive lookup.

---

## Edge Cases Handled

✅ **NULL values**: Early return, no render
✅ **Empty strings**: `?.trim()` checks
✅ **Whitespace**: Trimming před processing
✅ **Invalid industry codes**: `sanitizeIndustryCode()` fallback
✅ **Long category names**: Truncation + title tooltip
✅ **Unknown FB categories**: Fallback to 'DEFAULT'
✅ **Missing page.name**: `(page.name || 'U').charAt(0)`

---

## Testing Checklist

- [ ] NULL category → no badge rendered
- [ ] Empty string category → no badge rendered
- [ ] Whitespace-only category → no badge rendered
- [ ] Valid category → correct mapping displayed
- [ ] Unknown category → shows category + DEFAULT industry
- [ ] Long category (>50 chars) → truncation + tooltip
- [ ] Responsive: mobile (375px), tablet (768px), desktop
- [ ] Dark mode: contrast check
- [ ] Keyboard navigation: Tab + Enter/Space
- [ ] Screen reader: announces expanded/collapsed state
- [ ] Invalid industry code in DB → sanitized to DEFAULT

---

## Related Documentation

- **ADR**: `docs/decisions/003-facebook-category-mapping-visualization.md`
- **LEARNINGS**: Type system vs DB mismatch pattern
- **CHANGELOG**: Full feature list
- **Analysis system**: `docs/systems/analysis.md` (db_page_category field)

---

## Future Enhancements

1. **Search/filter** v CategoryMappingInfo
2. **Monitoring** unmapped FB categories (analytics)
3. **Confidence score** pro auto-detected industry
4. **Manual override** tlačítko pro users
5. **Lowercase cache** for faster case-insensitive lookup
6. **Prisma enum** migration (breaking change, kdy je acceptable)
