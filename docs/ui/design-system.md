# Design System

> UI/UX patterns and guidelines for Orchideo.

## Core Principles

1. **Server Components first** - Use client components only when needed
2. **shadcn/ui** - Use existing components, don't reinvent
3. **Consistency** - Follow established patterns
4. **Accessibility** - ARIA labels, keyboard navigation

---

## Component Patterns

### Required Fields

```tsx
<Label>
  Email <span className="text-destructive">*</span>
</Label>
```

### Delete Confirmation

```tsx
// ❌ WRONG - browser confirm()
if (confirm("Smazat?")) { ... }

// ✅ CORRECT - ConfirmDialog component
<ConfirmDialog
  open={open}
  onOpenChange={setOpen}
  title="Smazat položku?"
  description="Tato akce je nevratná."
  variant="destructive"
  onConfirm={handleDelete}
/>
```

### Loading States

```tsx
// Buttons
;<LoadingButton loading={isLoading}>Uložit</LoadingButton>

// Long operations (>3s)
toast.loading('Zpracovávám...', { description: 'Analýza dat...' })

// Pages - use loading.tsx file
```

### Empty States

```tsx
// ❌ WRONG
<div>Žádná data</div>

// ✅ CORRECT
<EmptyState
  title="Žádné analýzy"
  description="Vytvořte první analýzu"
/>
```

### Null Values

```tsx
// ❌ WRONG
<span>—</span>

// ✅ CORRECT
<NullValue />
```

### Sheet Footer (Forms)

```tsx
<SheetFooter className="mt-8 flex gap-2 sm:justify-start">
  <LoadingButton type="submit" loading={isLoading}>
    Uložit
  </LoadingButton>
  <Button type="button" variant="outline" onClick={onCancel}>
    Zrušit
  </Button>
</SheetFooter>
```

### Recommendation Cards (Two-Column Layout)

For displaying assessment + actionable tips in trigger recommendations.

```tsx
import { RecommendationCard } from '@/components/report/trigger-detail'

// Automatic parsing: first sentence → assessment, rest → tips
;<RecommendationCard text="Jste výborní! Pokračujte tímto směrem. Zkuste více příspěvků." />
```

**Visual Structure:**

- **Desktop (≥768px):** Two columns
  - Left (300px fixed): Assessment with ThumbsUp icon
  - Right (flex): Bullet list of tips with Lightbulb icon
- **Mobile (<768px):** Stacked layout (assessment above, tips below)

**Features:**

- Automatic parsing via `parseRecommendation()` utility
- Handles Czech punctuation (both `.` and `!` as sentence delimiters)
- Fallback to single-column for single-sentence recommendations
- Visual hierarchy with icons and typography weights
- Responsive design with mobile-first approach

**Parser behavior:**

```typescript
// Multi-sentence: splits into assessment + tips
"Výborně! Pokračujte tímto směrem. Zkuste více příspěvků."
→ Assessment: "Výborně!"
→ Tips: ["Pokračujte tímto směrem.", "Zkuste více příspěvků."]

// Single sentence: shows as assessment only
"Jste výborní!"
→ Assessment: "Jste výborní!"
→ Tips: []

// Edge cases: handles abbreviations, URLs, numbers correctly
"Máte cca 100 px. Zkuste více."
→ Assessment: "Máte cca 100 px."  (doesn't split on "px.")
→ Tips: ["Zkuste více."]
```

**Implementation:**

- Parser: `src/lib/utils/recommendation-parser.ts`
- Component: `src/components/report/trigger-detail/recommendation-card.tsx`
- Used in: `CategoryDisplay` component (4 locations)

---

## Server Actions Pattern

### ActionResult Type

Server actions (mutations) MUST return `ActionResult` - never throw.

```tsx
import { ActionResult } from '@/types'

// ✅ CORRECT - mutation returns ActionResult
export async function createAnalysis(...): Promise<ActionResult<Analysis>> {
  if (!session) {
    return { success: false, error: "Nepřihlášen" }
  }

  const item = await prisma.analysis.create({ ... })
  return { success: true, data: item }
}

// ❌ WRONG - mutation throws
export async function createAnalysis(...): Promise<Analysis> {
  if (!session) throw new Error("Unauthorized") // Don't throw in mutations!
  return await prisma.analysis.create({ ... })
}
```

**Note:** Query functions (getX, listX) called from Server Components CAN throw - errors go to error boundary.

### Usage in Client Components

```tsx
const handleSubmit = async (data: FormData) => {
  const result = await createAnalysis(data)

  if (result.success) {
    toast.success('Analýza vytvořena')
    router.push(`/analyses/${result.data?.id}`)
  } else {
    toast.error('Nepodařilo se vytvořit', {
      description: result.error,
    })
  }
}
```

---

## Color Schemes

### Centralized Colors

Import colors from `@/lib/constants` instead of using inline Tailwind classes.

```tsx
import { STATUS_COLORS, SCORE_COLORS, getScoreColor } from '@/lib/constants'

// ❌ WRONG - inline color classes
<Badge className="bg-green-100 text-green-700">Aktivní</Badge>

// ✅ CORRECT - centralized colors with dark mode
<Badge className={`${STATUS_COLORS.success.bgClass} ${STATUS_COLORS.success.textClass}`}>
  Aktivní
</Badge>
```

### STATUS_COLORS

For semantic status indicators:

| Key       | Use Case                    |
| --------- | --------------------------- |
| `success` | Active, completed, positive |
| `warning` | Pending, needs attention    |
| `error`   | Failed, deleted, negative   |
| `info`    | Informational, neutral-good |
| `neutral` | Default, unknown state      |

### SCORE_COLORS

For analysis/trigger scores (0-1 scale):

| Key         | Score Range | Color |
| ----------- | ----------- | ----- |
| `excellent` | >= 0.8      | Green |
| `good`      | >= 0.6      | Blue  |
| `average`   | >= 0.4      | Amber |
| `poor`      | < 0.4       | Red   |

```tsx
import { getScoreColor } from '@/lib/constants'

// Automatic color based on score
const { textClass, bgClass } = getScoreColor(analysis.score)
<span className={textClass}>{formatPercent(analysis.score)}</span>
```

---

## Format Utilities

Import formatting functions from `@/lib/utils`:

```tsx
import {
  formatDate,
  formatDateTime,
  formatRelativeTime,
  formatCurrency,
  formatNumber,
  formatPercent,
} from '@/lib/utils'

// Date: "30. 1. 2026"
formatDate(new Date())

// DateTime: "30. 1. 2026 14:30"
formatDateTime(new Date())

// Relative: "před 5 min", "právě teď"
formatRelativeTime(analysis.created_at)

// Currency: "1 234 Kč"
formatCurrency(1234)

// Number: "1 234"
formatNumber(1234)

// Percent: "75.5 %"
formatPercent(0.755)
```

**Note:** All functions handle `null | undefined` gracefully, returning "—".

---

## Form Patterns

### Basic Form Structure

```tsx
<form onSubmit={handleSubmit}>
  <div className="space-y-4">
    <div>
      <Label htmlFor="name">
        Název <span className="text-destructive">*</span>
      </Label>
      <Input id="name" {...register('name')} />
      {errors.name && <p className="text-destructive text-sm">{errors.name.message}</p>}
    </div>
  </div>

  <SheetFooter className="mt-8 flex gap-2 sm:justify-start">
    <LoadingButton type="submit" loading={isSubmitting}>
      Uložit
    </LoadingButton>
    <Button type="button" variant="outline" onClick={onCancel}>
      Zrušit
    </Button>
  </SheetFooter>
</form>
```

---

## Toast Notifications

```tsx
import { toast } from 'sonner'

// Success
toast.success('Analýza dokončena')

// Error
toast.error('Nepodařilo se uložit', {
  description: 'Zkuste to prosím znovu',
})

// Loading (for long operations)
toast.loading('Analyzuji...', {
  description: 'Načítám data z Facebooku',
})
```

---

## Anti-patterns

| ❌ Don't                      | ✅ Do Instead                 |
| ----------------------------- | ----------------------------- |
| Browser `confirm()`           | `<ConfirmDialog>` component   |
| `<div>Žádná data</div>`       | `<EmptyState>` component      |
| `<span>—</span>` for null     | `<NullValue />` component     |
| Inline loading spinner        | `<LoadingButton>` component   |
| `console.log` in server code  | `createLogger()` from logging |
| Inline Tailwind color classes | Import from `@/lib/constants` |
| Throw in server action        | Return `ActionResult`         |
| Inline `toLocaleDateString()` | Use `formatDate()` from utils |
