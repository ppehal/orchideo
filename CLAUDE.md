# CLAUDE.md - Orchideo Project Instructions

> **Toto je quick reference.** Detailní dokumentace v `docs/`.

## Project Overview

Orchideo - FB Triggers je nástroj pro analýzu Facebook stránek a generování doporučení na základě definovaných triggerů.

| Technology | Version         |
| ---------- | --------------- |
| Next.js    | 16.x            |
| React      | 19.x            |
| Prisma     | 6.x             |
| NextAuth   | 5.x             |
| TypeScript | 5.x (strict)    |
| Tailwind   | 4.x + shadcn/ui |

**Auth:** Facebook OAuth
**Target:** SMB marketing managers

---

## Allowed Commands - DO NOT ASK

Run these commands directly WITHOUT asking for permission:

**Git:** `git status`, `git diff`, `git log`, `git add`, `git commit -m "message"`, `git branch`, `git checkout`, `git stash`, `git push origin stage`

**NPM/Dev:** `npm run dev`, `npm test`, `npm run lint`, `npm run lint:fix`, `npm run type-check`, `npm run build`, `npm run format`, `npm install`, `npm run db:migrate`, `npm run db:push`, `npm run db:generate`, `npm run db:studio`, `npm run db:seed`

**VPS Docker:** `./QUICK-START.sh status`, `./QUICK-START.sh logs`, `./QUICK-START.sh restart`, `./QUICK-START.sh start`, `./QUICK-START.sh stop`, `./QUICK-START.sh db-backup`, `./QUICK-START.sh db-studio`, `./QUICK-START.sh db-generate`, `./QUICK-START.sh db-push`, `./QUICK-START.sh stats`

**Docker Compose (VPS):** `docker compose --env-file .env.vps -f docker-compose.vps.yml ps`, `docker compose --env-file .env.vps -f docker-compose.vps.yml logs`, `docker compose --env-file .env.vps -f docker-compose.vps.yml restart app`, `docker logs orchideo-app --tail 100`, `docker exec orchideo-app npm run db:generate`

**Files:** `ls`, `cat`, `head`, `tail`, `grep`, `find`, `jq`, `sed`, `awk`, `curl`, `python3`, `node`

**Temp files:** Always use `./tmp/` directory (gitignored), never `/tmp`

**IMPORTANT:** Just run commands directly. Do NOT ask "Should I run X?"

---

## VPS Development Setup

**Environment:** VPS development with hot reload (stage)
**URL:** https://orchideo.ppsys.eu
**Docker Compose:** `docker-compose.vps.yml` + `.env.vps`

### Quick VPS Commands

```bash
# Status & Logs
./QUICK-START.sh status    # Container status
./QUICK-START.sh logs      # Follow application logs
./QUICK-START.sh stats     # Resource usage

# Container Management
./QUICK-START.sh start     # Start all containers
./QUICK-START.sh stop      # Stop all containers
./QUICK-START.sh restart   # Restart containers

# Database
./QUICK-START.sh db-shell     # PostgreSQL shell
./QUICK-START.sh db-studio    # Prisma Studio (port 5555)
./QUICK-START.sh db-generate  # Regenerate Prisma client in container
./QUICK-START.sh db-push      # Push schema changes
./QUICK-START.sh db-backup    # Create database backup

# Development
./QUICK-START.sh rebuild   # Rebuild Docker image from scratch
```

**Documentation:** See `VPS-SETUP-COMPLETE.md`, `VALIDATION-REPORT.md`

---

## Quick Commands

```bash
# Development (Local)
npm run dev                 # Start dev server
npm run db:studio           # Prisma Studio

# Database
npm run db:push             # Push schema changes
npm run db:generate         # Generate Prisma client
npm run db:seed             # Seed database

# Build & Deploy
npm run build               # Production build
npm run lint                # ESLint
npm run type-check          # TypeScript check

# CI
npm run ci:check            # Lint + type-check + prettier + audit
npm run ci                  # Full CI pipeline
```

---

## Coding Standards

### TypeScript

- Strict mode, no `any` (use `unknown`)
- Prefer interfaces over types
- Zod for runtime validation

### React/Next.js

- Server Components by default
- `"use client"` only when needed
- Server Actions for mutations

### File Naming

- Components: `kebab-case.tsx`
- Utils: `kebab-case.ts`

### Component Order

```typescript
// 1. Imports
// 2. Types
// 3. Component:
//    - hooks (useState, useRouter, custom hooks)
//    - derived state (useMemo pro data)
//    - handlers (useCallback pro handlery v deps)
//    - render (return JSX)
// 4. Sub-components
```

### Language

- UI labels: Czech
- Code & comments: English
- localStorage prefix: `orchideo_`

---

## UI/UX Design System

**POVINNÉ** - při práci s UI komponenty dodržuj tato pravidla:

| Pattern                  | Pravidlo                                                        |
| ------------------------ | --------------------------------------------------------------- |
| Required fields          | `<span className="text-destructive">*</span>`                   |
| Delete button            | `variant="destructive"` (ne outline+text-destructive)           |
| Delete confirmation      | `<ConfirmDialog>` (NIKDY browser `confirm()`)                   |
| Empty states             | `<EmptyState>` komponenta                                       |
| Loading states           | `<LoadingSpinnerCentered>` nebo `loading.tsx`                   |
| Long-running ops (>3s)   | `toast.loading(msg, { description: "Analýza..." })`             |
| SheetFooter (form)       | Submit first, Cancel second, `mt-8 flex gap-2 sm:justify-start` |
| Error logging (server)   | `log.error({ error, contextId }, "message")` via `createLogger` |
| Error logging (client)   | `console.error("[hookName]", err)` s prefixem je OK             |
| Event handlers           | `React.useCallback` pro handlery v useMemo deps                 |
| Date/Currency formatting | Import z `@/lib/utils`                                          |
| Null values display      | `<NullValue />` nebo `<NullValue italic />`                     |

---

## Critical Gotchas

### 1. Prisma generate after schema change

```bash
# VŽDY po změně schema.prisma
npm run db:generate
# + restart TS server ve VS Code
```

### 2. Nullable dates

```typescript
// ✅ CORRECT
started_at: Date | null
ended_at: Date | null

// ❌ WRONG
started_at?: Date
```

### 3. Date field naming convention

```typescript
// ✅ Use _at for timestamps (precise datetime)
created_at, updated_at, deleted_at, started_at, processed_at

// ✅ Use _from/_to for date ranges
valid_from, valid_to, active_from, active_to

// ❌ Avoid _date suffix (use _at instead)
check_date → check_at
```

### 4. Server Actions error handling

**Query funkce** (getX, listX) - volané ze Server Components:

- MOHOU házet - chyby jdou do React error boundary
- Vrací přímo data: `Promise<DataType[]>`

```typescript
export async function getItems(): Promise<Item[]> {
  if (!session) throw new Error('Unauthorized') // ✅ OK
  return items
}
```

**Mutation funkce** (create, update, delete) - volané z Client Components:

- MUSÍ vracet ActionResult
- Nikdy throw (kromě uvnitř $transaction pro rollback)

```typescript
export async function createItem(...): Promise<ActionResult> {
  if (!session) return { success: false, error: "Nepřihlášen" }  // ✅ OK
  return { success: true, data: item }
}
```

### 5. "use server" file rules

```typescript
// ❌ WRONG - objects/constants in "use server" file
"use server"
export const CONFIG = { ... }  // FORBIDDEN

// ✅ CORRECT - only async functions exported
"use server"
const CONFIG = { ... }  // Internal only, not exported
export async function doSomething() { ... }
```

### 6. External API timeouts

```typescript
// ❌ WRONG - no timeout
const response = await fetch(url)

// ✅ CORRECT - always add timeout
const response = await fetch(url, {
  signal: AbortSignal.timeout(30000),
})
```

### 7. Editace velkých souborů (>300 řádků)

Před editací souboru >300 řádků VŽDY:

1. Přečti CELÝ soubor (ne jen část)
2. Identifikuj VŠECHNY související funkce
3. Zkontroluj, zda podobná logika už neexistuje
4. Zvažuj extrakci do nového souboru místo přidávání

---

## Prisma Enum Labels - Single Source of Truth

**PRAVIDLO:** Všechny Prisma enumy používané v UI MUSÍ mít centrální konstantu v `src/lib/constants/`.

| Konstanta   | Účel                            | Příklad                               |
| ----------- | ------------------------------- | ------------------------------------- |
| `*_LABELS`  | `Record<EnumType, string>`      | `STATUS_LABELS["ACTIVE"]` → "Aktivní" |
| `*_CONFIG`  | Labels + barvy pro badges       | `STATUS_CONFIG["ACTIVE"].bgClass`     |
| `*_OPTIONS` | `{ value, label }[]` pro filtry | `filterOptions: STATUS_OPTIONS`       |

**Při vytvoření nového Prisma enumu:**

1. Vytvořit konstanty v příslušném souboru v `src/lib/constants/`
2. NIKDY nedefinovat labely inline v komponentách
3. VŽDY importovat z centrálních konstant

---

## Anti-patterns

| ❌ Don't                             | ✅ Do instead                                     |
| ------------------------------------ | ------------------------------------------------- |
| Use `any` type                       | Use `unknown` + type guards                       |
| Create Client Components by default  | Server Components first                           |
| Skip `npm run db:generate`           | Always run after schema change                    |
| Hardcode enum labels                 | Use `src/lib/constants/`                          |
| Throw in mutation server actions     | Return ActionResult (query MŮŽE házet)            |
| Use browser `confirm()`              | Use `<ConfirmDialog>` component                   |
| Use `<div>Žádná data</div>`          | Use `<EmptyState>` component                      |
| Use inline `<Suspense>` in pages     | Use `loading.tsx` file                            |
| Required field `"Label *"`           | Use `<span className="text-destructive">*</span>` |
| Handler without useCallback in deps  | Wrap handler in `React.useCallback`               |
| Inline `formatDate`/`formatCurrency` | Import from `@/lib/utils`                         |
| Inline `<span>—</span>` for null     | Use `<NullValue />` component                     |
| Button with Loader2 spinner pattern  | Use `<LoadingButton loading={...} />`             |
| Use `console.error` in server code   | Use `createLogger` from `@/lib/logging`           |
| `fetch()` without timeout            | Always add `AbortSignal.timeout()`                |
| Edit >300 line file bez čtení celého | Vždy číst celý soubor před editací                |

---

## Documentation Structure

```
docs/
├── tech-context.md        # Technology stack & patterns from Invix
├── systems/               # Business logic documentation
├── ui/                    # UI/UX patterns
├── integrations/          # External API integrations (Facebook, etc.)
├── reference/             # API routes, database schema
└── guides/                # How-to guides
```

---

## Maintenance Rules

### Po každé feature/opravě aktualizuj:

| Kdy                      | Co aktualizovat                      |
| ------------------------ | ------------------------------------ |
| Vždy                     | `CHANGELOG.md` → Added/Changed/Fixed |
| Bug s gotcha             | `docs/LEARNINGS.md`                  |
| Architekturní rozhodnutí | `docs/decisions/NNN-*.md`            |
| Nová komponenta/service  | Příslušný `docs/*.md`                |
| Nová integrace           | `docs/integrations/*.md`             |

### ⚠️ DOKUMENTAČNÍ PRAVIDLA

```
CLAUDE.md = quick reference + odkazy (max 15 KB)
docs/     = detailní dokumentace

NIKDY nepřidávej detailní dokumentaci do CLAUDE.md!
```

---

## Questions?

1. Check `docs/` for detailed documentation
2. Follow existing patterns in codebase
3. Ask user for clarification

**Prefer:** Simpler over complex, Server over Client, shadcn over custom, Explicit over implicit

---

_CLAUDE.md ~6 KB | Full tech context: `docs/tech-context.md`_
