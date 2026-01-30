# Technologický Kontext pro Nový Projekt

> **Status: KOMPLETNÍ** - Připraveno pro web agenta

## O tomto dokumentu

Tento dokument shrnuje technologický stack, best practices, patterns a learnings z Invix projektu pro použití při zakládání nového projektu **Orchideo - FB Triggers** (nástroj pro analýzu Facebook stránek).

**Zdroj:** Extrahováno z produkčního projektu Invix (investiční správa) s 1+ rokem vývoje.

---

## 1. Technology Stack

### Core Technologies

| Technology     | Version | Notes                         |
| -------------- | ------- | ----------------------------- |
| Next.js        | 16.x    | App Router, Server Components |
| React          | 19.x    | Server Components by default  |
| TypeScript     | 5.x     | Strict mode                   |
| PostgreSQL     | 16      | Primary database              |
| Prisma         | 6.x     | ORM                           |
| Tailwind CSS   | 4.x     | OKLCH color model             |
| shadcn/ui      | Latest  | Component library             |
| TanStack Table | 8.x     | Data tables                   |
| TanStack Query | Latest  | Client-side caching           |
| Zod            | 4.x     | Runtime validation            |

### Auth & Security

| Technology               | Notes                          |
| ------------------------ | ------------------------------ |
| NextAuth.js (Auth.js) v5 | OAuth providers (Google, etc.) |
| Prisma Adapter           | Session management             |

### Development & Build

| Tool        | Purpose                |
| ----------- | ---------------------- |
| ESLint 9    | Linting                |
| Prettier    | Code formatting        |
| Husky       | Git hooks              |
| Commitlint  | Conventional commits   |
| lint-staged | Pre-commit checks      |
| Vitest      | Unit/integration tests |
| pino        | Structured logging     |

---

## 2. Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── (auth)/            # Auth-related routes (login, etc.)
│   ├── (dashboard)/       # Protected routes (main app)
│   └── api/               # API routes (CRON, webhooks)
├── components/
│   ├── ui/                # shadcn/ui komponenty (NEUPRAVOVAT)
│   ├── layout/            # App layout (sidebar, header)
│   ├── data-table/        # Reusable table system
│   └── [feature]/         # Feature-specific komponenty
├── lib/
│   ├── prisma.ts          # Prisma client singleton
│   ├── auth.ts            # NextAuth config
│   ├── utils/             # Utility funkce
│   ├── validators/        # Zod schemas
│   ├── constants/         # App constants, enum labels
│   ├── services/          # Business logic services
│   ├── actions/           # Shared server actions
│   ├── logging/           # Pino logger setup
│   └── integrations/      # External API integrations
├── hooks/                 # Custom React hooks
├── types/                 # TypeScript typy
└── prisma/                # Schema, migrations, seed
```

---

## 3. Coding Standards

### TypeScript

```typescript
// ✅ CORRECT
interface UserData {
  id: number
  name: string
  email: string | null // Explicit null, not undefined
}

// ❌ WRONG - use unknown, not any
const data: any = response

// ✅ CORRECT
const data: unknown = response
if (isUserData(data)) {
  // type-safe usage
}
```

### React/Next.js Patterns

```typescript
// Server Components by default (NO "use client")
export default async function Page() {
  const data = await getData()
  return <ClientComponent data={data} />
}

// "use client" only when needed (hooks, event handlers)
"use client"
export function InteractiveComponent() {
  const [state, setState] = useState()
  // ...
}
```

### File Naming

- Components: `kebab-case.tsx` (e.g., `user-profile.tsx`)
- Utils: `kebab-case.ts` (e.g., `format-date.ts`)
- Types: `kebab-case.ts` in `/types` directory

### Component Organization

```typescript
// 1. Imports
// 2. Types/Interfaces
// 3. Component:
//    - hooks (useState, useRouter, custom hooks)
//    - derived state (useMemo)
//    - handlers (useCallback)
//    - columns (useMemo with handlers in deps)
//    - render (return JSX)
// 4. Sub-components (if needed)
```

---

## 4. Server Actions Pattern

### Query Functions (Read)

```typescript
// Volané ze Server Components - MOHOU házet
export async function getItems(): Promise<Item[]> {
  const session = await auth()
  if (!session) throw new Error('Unauthorized')

  return prisma.item.findMany({ where: { deleted_at: null } })
}
```

### Mutation Functions (Create/Update/Delete)

```typescript
// Volané z Client Components - MUSÍ vracet ActionResult
export async function createItem(data: CreateItemInput): Promise<ActionResult> {
  const session = await auth()
  if (!session) return { success: false, error: 'Nepřihlášen' }

  const validated = schema.safeParse(data)
  if (!validated.success) {
    return {
      success: false,
      error: validated.error.issues.map((e) => e.message).join(', '),
    }
  }

  try {
    const item = await prisma.item.create({ data: validated.data })
    return { success: true, id: item.id }
  } catch (error) {
    log.error({ error }, 'Item creation failed')
    return { success: false, error: 'Nepodařilo se vytvořit položku' }
  }
}
```

### "use server" File Rules

```typescript
// ❌ WRONG - objects/constants in "use server" file
"use server"
export const CONFIG = { ... }  // FORBIDDEN

// ✅ CORRECT - only async functions exported
"use server"
const CONFIG = { ... }  // Internal only, not exported
export async function doSomething() { ... }
```

---

## 5. UI/UX Design System

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
  onOpenChange={onOpenChange}
  title="Smazat položku?"
  description="Tato akce je nevratná."
  variant="destructive"
  onConfirm={handleDelete}
/>
```

### Loading States

```tsx
// For buttons
;<LoadingButton loading={isLoading}>Uložit</LoadingButton>

// For long operations (>3s)
toast.loading('Zpracovávám...', { description: 'Analýza dat...' })

// For pages
// Create loading.tsx file in route folder
```

### Empty States

```tsx
// ❌ WRONG
<div>Žádná data</div>

// ✅ CORRECT
<EmptyState
  title="Žádné položky"
  description="Vytvořte první položku"
/>
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

### Null Values

```tsx
// ❌ WRONG
<span>—</span>

// ✅ CORRECT
<NullValue />
// or
<NullValue italic />
```

---

## 6. Enum Constants Pattern

```typescript
// src/lib/constants/status-enums.ts

// Labels for UI display
export const STATUS_LABELS: Record<Status, string> = {
  PENDING: 'Čekající',
  ACTIVE: 'Aktivní',
  COMPLETED: 'Dokončeno',
}

// Config with colors for badges
export const STATUS_CONFIG: Record<Status, { label: string; bgClass: string; textClass: string }> =
  {
    PENDING: { label: 'Čekající', bgClass: 'bg-amber-100', textClass: 'text-amber-700' },
    ACTIVE: { label: 'Aktivní', bgClass: 'bg-blue-100', textClass: 'text-blue-700' },
    COMPLETED: { label: 'Dokončeno', bgClass: 'bg-green-100', textClass: 'text-green-700' },
  }

// Options for select/filter
export const STATUS_OPTIONS = Object.entries(STATUS_LABELS).map(([value, label]) => ({
  value,
  label,
}))
```

---

## 7. Error Handling & Logging

### Server-side Logging

```typescript
import { createLogger } from '@/lib/logging'

const log = createLogger('payment-service')

log.info({ event: 'payment_created', paymentId: 123 }, 'Payment created')
log.error({ error, paymentId: 123 }, 'Payment creation failed')

// ❌ WRONG
console.log('something happened')
```

### Client-side Logging

```typescript
// OK to use console.error with prefix
console.error('[usePayments]', error)
```

### User-facing Errors

```typescript
import { toast } from 'sonner'

// Success
toast.success('Platba byla vytvořena')

// Error
toast.error('Nepodařilo se uložit', {
  description: 'Zkuste to prosím znovu',
})
```

---

## 8. Database Patterns

### Soft Delete

```typescript
// All important entities use soft delete
model Item {
  id         Int       @id @default(autoincrement())
  deleted_at DateTime?
  // ...
}

// Always filter in queries
const items = await prisma.item.findMany({
  where: { deleted_at: null }
})

// Soft delete instead of hard delete
await prisma.item.update({
  where: { id },
  data: { deleted_at: new Date() }
})
```

### Date Field Naming

```typescript
// ✅ Use _at for timestamps
created_at, updated_at, deleted_at, processed_at

// ✅ Use _from/_to for date ranges
valid_from, valid_to, active_from, active_to

// ❌ Avoid _date suffix
check_date → check_at
```

### Nullable vs Optional

```typescript
// ✅ CORRECT - explicit null
started_at: Date | null
ended_at: Date | null

// ❌ WRONG - optional (confusing semantics)
started_at?: Date
```

---

## 9. Testing Patterns

### Unit Tests

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest'

describe('calculateTotal', () => {
  it('should sum all amounts', () => {
    const result = calculateTotal([100, 200, 300])
    expect(result).toBe(600)
  })
})
```

### Testing Async with Delays

```typescript
beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
})

it('should retry on error', async () => {
  // Start async operation
  const promise = fetchWithRetry()

  // Advance timers
  await vi.runAllTimersAsync()

  // Await result
  const result = await promise
  expect(result.success).toBe(true)
})
```

---

## 10. CI/CD Pipeline

### GitHub Actions Workflow

```yaml
name: CI

on:
  push:
    branches: [main, stage]
  pull_request:
    branches: [main, stage]

jobs:
  check:
    runs-on: ubuntu-latest
    timeout-minutes: 15

    services:
      postgres:
        image: postgres:16-alpine
        env:
          POSTGRES_USER: test
          POSTGRES_PASSWORD: test
          POSTGRES_DB: test_db
        ports:
          - 5432:5432

    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - run: npm ci
      - run: npx prisma generate
      - run: npm run type-check
      - run: npm run lint:ci
      - run: npx prettier --check .
      - run: npm audit --audit-level=high
      - run: npm run test:unit -- --coverage
      - run: npm run build
```

### Package.json Scripts

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "lint": "eslint",
    "lint:ci": "eslint . --max-warnings 0",
    "type-check": "tsc --noEmit",
    "db:generate": "prisma generate",
    "db:push": "prisma db push",
    "db:migrate": "prisma migrate dev",
    "db:seed": "tsx prisma/seed.ts",
    "db:studio": "prisma studio",
    "test": "vitest run",
    "test:unit": "vitest run tests/unit",
    "ci:check": "npm run type-check && npm run lint:ci && npx prettier --check . && npm audit --audit-level=high",
    "ci": "npm run ci:check && npm run test:unit && npm run build"
  }
}
```

---

## 11. DevOps & Deployment

### Docker Setup

```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npx prisma generate
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
CMD ["node", "server.js"]
```

### Environment Variables Structure

```bash
# Database
DATABASE_URL="postgresql://..."

# Auth
NEXTAUTH_SECRET="..."  # openssl rand -base64 32
NEXTAUTH_URL="https://app.example.com"
GOOGLE_CLIENT_ID="..."
GOOGLE_CLIENT_SECRET="..."

# External APIs
FACEBOOK_APP_ID="..."
FACEBOOK_APP_SECRET="..."

# CRON (if needed)
CRON_SECRET="..."  # openssl rand -base64 24

# Observability
LOG_LEVEL=info
```

### VPS Deployment Checklist

1. **Infrastructure**
   - [ ] Server provisioning (min 2GB RAM, 2 CPU)
   - [ ] Docker + Docker Compose installed
   - [ ] HTTPS (Let's Encrypt)
   - [ ] Nginx reverse proxy
   - [ ] Firewall (ports 443, 22)

2. **Database**
   - [ ] PostgreSQL 16
   - [ ] SSL connections
   - [ ] Automatic backups
   - [ ] Connection pooling

3. **Monitoring**
   - [ ] Health check endpoint
   - [ ] Uptime monitoring
   - [ ] Log aggregation

---

## 12. Critical Gotchas & Learnings

### TanStack Table FilterFn

```typescript
// ❌ WRONG - "auto" is reserved
filterFn: 'auto'

// ✅ CORRECT
filterFn: 'smart'
```

### Prisma Generate

```bash
# VŽDY po změně schema.prisma
npm run db:generate
# + restart TS server ve VS Code
```

### useEffect Race Conditions

```typescript
// ❌ WRONG - race condition with debounced values
useEffect(() => {
  if (debouncedValue !== value) {
    onChange(debouncedValue)
  }
}, [debouncedValue, value])

// ✅ CORRECT - track previous value
const prevValueRef = useRef(value)
useEffect(() => {
  if (prevValueRef.current !== value) {
    prevValueRef.current = value
    return
  }
  // ... rest of logic
}, [debouncedValue, value])
```

### JavaScript setMonth() Overflow

```typescript
// ❌ WRONG - Jan 31 + 1 month = Mar 3 (not Feb 28!)
const d = new Date(2024, 0, 31)
d.setMonth(1)

// ✅ CORRECT - clamp to last day of month
function advanceMonth(date: Date, targetDay: number): Date {
  const lastDay = new Date(date.getFullYear(), date.getMonth() + 2, 0).getDate()
  return new Date(date.getFullYear(), date.getMonth() + 1, Math.min(targetDay, lastDay))
}
```

### External API Timeouts

```typescript
// ❌ WRONG - no timeout
const response = await fetch(url)

// ✅ CORRECT - always add timeout
const response = await fetch(url, {
  signal: AbortSignal.timeout(30000),
})
```

---

## 13. Anti-Patterns Summary

| ❌ Don't                            | ✅ Do Instead                       |
| ----------------------------------- | ----------------------------------- |
| Use `any` type                      | Use `unknown` + type guards         |
| Create Client Components by default | Server Components first             |
| Skip `npm run db:generate`          | Always run after schema change      |
| Hardcode enum labels                | Use `src/lib/constants/`            |
| Use browser `confirm()`             | Use `<ConfirmDialog>` component     |
| Use `<div>Žádná data</div>`         | Use `<EmptyState>` component        |
| Throw in mutation server actions    | Return ActionResult                 |
| `console.log()` in server code      | Use `createLogger()`                |
| Inline Tailwind colors              | Import from color-schemes constants |
| `fetch()` without timeout           | Always add `AbortSignal.timeout()`  |

---

## 14. Pro Orchideo Projekt Specificky

### Facebook Graph API Integration

Projekt bude potřebovat:

- OAuth flow pro Facebook login a page permissions
- Graph API calls pro page insights
- Rate limiting (Facebook má přísné limity)
- Token refresh handling

### Trigger Engine Architecture

Na základě dokumentu projektu:

1. **Data Collection Layer** - fetch dat z FB API
2. **Analysis Engine** - evaluace triggers (pravidel)
3. **Recommendation Generator** - AI/rule-based doporučení
4. **Report Builder** - generování výstupů

### Doporučená Struktura pro Orchideo

```
src/
├── app/
│   ├── (auth)/           # FB OAuth login
│   ├── (dashboard)/
│   │   ├── analyze/      # URL input, analysis start
│   │   ├── report/       # Results view
│   │   └── settings/     # User preferences
│   └── api/
│       ├── facebook/     # FB API proxy
│       └── webhooks/     # FB webhooks (if needed)
├── lib/
│   ├── facebook/         # FB Graph API client
│   ├── triggers/         # Trigger evaluation engine
│   ├── analysis/         # Data analysis logic
│   └── recommendations/  # Recommendation generator
```

---

## Závěr

Tento dokument poskytuje kompletní technologický kontext pro založení nového projektu se stejným stackem a best practices jako Invix. Klíčové body:

1. **Next.js 16 + React 19** - Server Components by default
2. **Prisma + PostgreSQL** - Type-safe ORM
3. **shadcn/ui + Tailwind 4** - Consistent UI
4. **TypeScript strict mode** - No `any`
5. **Server Actions** - Query throws, Mutation returns ActionResult
6. **Centralized constants** - Enum labels, colors
7. **Structured logging** - Pino logger
8. **CI/CD** - GitHub Actions, Docker deployment
