# Logging Guide - Orchideo

> **Kompletní průvodce jednotným logováním v Orchideo projektu**

## Obsah

1. [Základní použití](#základní-použití)
2. [Error Logging](#error-logging)
3. [Request Tracing](#request-tracing)
4. [Standardní Field Names](#standardní-field-names)
5. [Best Practices](#best-practices)
6. [Anti-patterns](#anti-patterns)
7. [Troubleshooting](#troubleshooting)

---

## Základní použití

### Vytvoření loggeru

```typescript
import { createLogger } from '@/lib/logging'

const log = createLogger('my-module-name')
```

**Naming convention pro logger name:**
- API routes: `'api-resource-name'` (např. `'api-analysis-create'`)
- Services: `'service-name'` (např. `'analysis-runner'`)
- Lib utilities: `'lib-name'` (např. `'email'`)

### Info/Warn logging

```typescript
// Jednoduchá zpráva
log.info('Operation started')

// S kontextem
log.info({ userId: user.id, analysisId }, 'Analysis created')

// Warning
log.warn({ userId, attempts: 3 }, 'Rate limit approaching')
```

---

## Error Logging

### ✅ SPRÁVNĚ - Použití logError()

**Vždy používejte `logError()` pro logování chyb!**

```typescript
import { createLogger, logError, LogFields } from '@/lib/logging'

const log = createLogger('my-module')

try {
  await riskyOperation()
} catch (error) {
  // ✅ SPRÁVNĚ - použití logError s kontextem
  logError(log, error, 'Operation failed', {
    [LogFields.userId]: userId,
    [LogFields.analysisId]: analysisId,
  })

  // nebo bez kontextu
  logError(log, error, 'Unexpected error')
}
```

### ❌ ŠPATNĚ - Nepřímé logování erroru

```typescript
// ❌ ŠPATNĚ - Error se serializuje jako prázdný objekt {}
log.error({ error }, 'Operation failed')

// ❌ ŠPATNĚ - Ztráta stack trace
log.error({ message: error.message }, 'Operation failed')

// ❌ ŠPATNĚ - String místo Error objektu
log.error({ error: String(error) }, 'Operation failed')
```

### Proč logError()?

`logError()` správně serializuje Error objekty pro Pino logger:
- **Plný stack trace** - pro debugging
- **Error message** - lidsky čitelná zpráva
- **Error name** - typ chyby (Error, TypeError, ValidationError, ...)
- **Nested causes** - pokud error má `cause`, serializuje se rekurzivně
- **Custom properties** - zachová další vlastnosti Error objektu

---

## Request Tracing

### Automatické Request ID

Middleware automaticky generuje `x-request-id` pro každý požadavek:

```typescript
// middleware.ts už to dělá automaticky
// Request ID je propagováno v headers
```

### Použití withRequestContext() v API routes

```typescript
import { createLogger, withRequestContext, logError } from '@/lib/logging'

const baseLog = createLogger('api-my-route')

export async function POST(request: Request) {
  // Vytvoř child logger s request kontextem
  const log = withRequestContext(baseLog, request)

  try {
    log.info('Processing request') // automaticky obsahuje request_id, ip_address, user_agent, path

    // ... business logic ...

  } catch (error) {
    logError(log, error, 'Request failed') // error log obsahuje request_id
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
```

**Request context obsahuje:**
- `request_id` - unikátní ID požadavku
- `user_agent` - browser/client info
- `ip_address` - IP adresa klienta
- `path` - URL path požadavku

### Předávání kontextu napříč funkcemi

```typescript
import { createLogger, withContext, logError } from '@/lib/logging'
import type { Logger } from 'pino'

async function processAnalysis(analysisId: string, log: Logger) {
  // Přidej další kontext
  const analysisLog = withContext(log, {
    [LogFields.analysisId]: analysisId,
  })

  analysisLog.info('Starting analysis')

  try {
    // ... processing ...
  } catch (error) {
    logError(analysisLog, error, 'Analysis failed')
  }
}

// Volání
export async function POST(request: Request) {
  const log = withRequestContext(baseLog, request)
  await processAnalysis(analysisId, log) // předej logger s kontextem
}
```

---

## Standardní Field Names

**VŽDY používej `LogFields` konstanty pro konzistenci!**

```typescript
import { LogFields } from '@/lib/logging'

// ✅ SPRÁVNĚ
logError(log, error, 'Failed to update user', {
  [LogFields.userId]: userId,
  [LogFields.userEmail]: userEmail,
})

// ❌ ŠPATNĚ - nekonsistentní názvy
logError(log, error, 'Failed to update user', {
  user_id: userId,        // někde user_id
  userId: userId,         // někde userId
  id: userId,             // někde id
})
```

### Dostupné LogFields

```typescript
// User context
LogFields.userId       // 'user_id'
LogFields.userEmail    // 'user_email'
LogFields.userName     // 'user_name'

// Analysis context
LogFields.analysisId   // 'analysis_id'
LogFields.analysisStatus // 'analysis_status'

// Facebook context
LogFields.fbPageId     // 'fb_page_id'
LogFields.fbPageName   // 'fb_page_name'

// Request context
LogFields.requestId    // 'request_id'
LogFields.ipAddress    // 'ip_address'
LogFields.userAgent    // 'user_agent'

// Performance
LogFields.durationMs   // 'duration_ms'
LogFields.responseSize // 'response_size'

// Error context
LogFields.errorCode    // 'error_code'
LogFields.errorType    // 'error_type'
```

### Vlastní pole (mimo LogFields)

Pro vlastní pole používej **snake_case**:

```typescript
logError(log, error, 'Comparison failed', {
  group_id: groupId,           // ✅ snake_case
  primary_page_id: pageId,     // ✅ snake_case
  competitor_count: count,     // ✅ snake_case
})
```

---

## Best Practices

### 1. Vždy zachyť kontext ve scope

```typescript
export async function POST(request: Request, { params }: Props) {
  let userId: string | undefined
  let groupId: string | undefined

  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    userId = session.user.id  // ✅ Zachyť pro error handling
    const { id } = await params
    groupId = id               // ✅ Zachyť pro error handling

    // ... business logic ...

  } catch (error) {
    logError(log, error, 'Failed to process request', {
      [LogFields.userId]: userId,    // Dostupné v catch bloku
      group_id: groupId,              // Dostupné v catch bloku
    })
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
```

### 2. Loguj na správné úrovni

```typescript
// INFO - normální flow
log.info({ userId, analysisId }, 'Analysis completed')

// WARN - neočekávané ale řešitelné situace
log.warn({ userId, attempts: 3 }, 'Rate limit approaching')

// ERROR - chyby vyžadující pozornost
logError(log, error, 'Database connection failed')
```

### 3. Struktura error zpráv

**Použij imperativ (příkazový způsob):**

```typescript
// ✅ SPRÁVNĚ
logError(log, error, 'Failed to create analysis')
logError(log, error, 'Failed to send email')

// ❌ ŠPATNĚ
logError(log, error, 'Analysis creation failed')
logError(log, error, 'Error sending email')
```

### 4. Měření výkonu

```typescript
const startTime = Date.now()

try {
  const result = await slowOperation()

  const elapsedMs = Date.now() - startTime
  log.info({
    [LogFields.durationMs]: elapsedMs,
    result_count: result.length,
  }, 'Operation completed')

} catch (error) {
  const elapsedMs = Date.now() - startTime
  logError(log, error, 'Operation failed', {
    [LogFields.durationMs]: elapsedMs,
  })
}
```

### 5. Nested try-catch

```typescript
try {
  // Hlavní operace
  const result = await mainOperation()

  // Non-critical logging
  try {
    await prisma.analyticsEvent.create({ ... })
  } catch (dbError) {
    // ✅ Použij logError i v nested catch
    logError(log, dbError, 'Failed to log analytics', {
      [LogFields.analysisId]: analysisId,
    })
    // Nepropaguj error - je to non-critical
  }

  return result

} catch (error) {
  logError(log, error, 'Main operation failed')
  throw error
}
```

---

## Anti-patterns

### ❌ 1. Logování stringu místo Error objektu

```typescript
// ❌ ŠPATNĚ
catch (error) {
  log.error({ message: 'Something failed' }, 'Error occurred')
}

// ✅ SPRÁVNĚ
catch (error) {
  logError(log, error, 'Something failed')
}
```

### ❌ 2. Duplicitní error informace

```typescript
// ❌ ŠPATNĚ - error.message je už v serializovaném erroru
logError(log, error, `Failed: ${error instanceof Error ? error.message : 'Unknown'}`)

// ✅ SPRÁVNĚ - message je samostatná a jasná
logError(log, error, 'Failed to process request')
```

### ❌ 3. Přílišný kontext

```typescript
// ❌ ŠPATNĚ - logování celých objektů
logError(log, error, 'Failed to update', {
  user: user,           // Celý user objekt (PII risk!)
  request: request,     // Celý request (obrovské)
})

// ✅ SPRÁVNĚ - jen relevantní ID
logError(log, error, 'Failed to update', {
  [LogFields.userId]: user.id,
})
```

### ❌ 4. Použití console.log/error na serveru

```typescript
// ❌ ŠPATNĚ - nestrukturované logy
console.log('User created:', userId)
console.error('Failed:', error)

// ✅ SPRÁVNĚ - strukturované logy
log.info({ userId }, 'User created')
logError(log, error, 'Operation failed')
```

---

## Troubleshooting

### Prázdné error objekty v logách

**Problém:**
```json
{
  "level": "error",
  "msg": "Operation failed",
  "error": {}  // ❌ Prázdný objekt
}
```

**Řešení:**
Používej `logError()` místo `log.error({ error }, ...)`:

```typescript
// ❌ Způsobuje prázdné {}
log.error({ error }, 'Operation failed')

// ✅ Správná serializace
logError(log, error, 'Operation failed')
```

### Chybějící request ID v logách

**Problém:**
Logy nemají `request_id` pro tracing.

**Řešení:**
Použij `withRequestContext()` v API route handlers:

```typescript
const baseLog = createLogger('api-route')

export async function POST(request: Request) {
  const log = withRequestContext(baseLog, request)
  // Všechny logy nyní mají request_id
}
```

### Nekonsistentní názvy polí

**Problém:**
V různých částech kódu:
- `user_id`, `userId`, `uid`, `id`

**Řešení:**
Používej `LogFields` konstanty:

```typescript
import { LogFields } from '@/lib/logging'

logError(log, error, 'Failed', {
  [LogFields.userId]: userId,  // Vždy 'user_id'
})
```

---

## Příklady z reálného kódu

### API Route Handler

```typescript
import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { createLogger, withRequestContext, logError, LogFields } from '@/lib/logging'

const baseLog = createLogger('api-analysis-create')

export async function POST(request: Request) {
  const log = withRequestContext(baseLog, request)
  let userId: string | undefined

  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    userId = session.user.id

    const body = await request.json()
    const result = await createAnalysis(body.pageId)

    log.info({
      [LogFields.userId]: userId,
      [LogFields.analysisId]: result.id,
    }, 'Analysis created')

    return NextResponse.json(result)

  } catch (error) {
    logError(log, error, 'Failed to create analysis', {
      [LogFields.userId]: userId,
    })

    return NextResponse.json(
      { error: 'Internal error' },
      { status: 500 }
    )
  }
}
```

### Service s propagací kontextu

```typescript
import { createLogger, withContext, logError, LogFields } from '@/lib/logging'
import type { Logger } from 'pino'

const baseLog = createLogger('analysis-service')

export async function runAnalysis(
  analysisId: string,
  parentLogger?: Logger
): Promise<RunnerResult> {
  const log = parentLogger
    ? withContext(parentLogger, { [LogFields.analysisId]: analysisId })
    : withContext(baseLog, { [LogFields.analysisId]: analysisId })

  const startTime = Date.now()

  try {
    log.info('Starting analysis')

    // ... complex processing ...

    const elapsedMs = Date.now() - startTime
    log.info({ [LogFields.durationMs]: elapsedMs }, 'Analysis completed')

    return { success: true, analysisId }

  } catch (error) {
    const elapsedMs = Date.now() - startTime
    logError(log, error, 'Analysis failed', {
      [LogFields.durationMs]: elapsedMs,
    })

    return { success: false, analysisId, error: 'Analysis failed' }
  }
}
```

### Background job

```typescript
export function startAnalysisInBackground(analysisId: string): void {
  const log = withContext(baseLog, {
    [LogFields.analysisId]: analysisId,
  })

  runAnalysis(analysisId, log).catch((error) => {
    logError(log, error, 'Background analysis failed unexpectedly', {
      [LogFields.analysisId]: analysisId,
    })
  })
}
```

---

## Checklist pro code review

Při review kódu zkontroluj:

- [ ] Používá se `logError()` místo `log.error({ error }, ...)`?
- [ ] Jsou použity `LogFields` konstanty pro standardní pole?
- [ ] Je kontext zachycen ve scope před try blokem?
- [ ] Jsou error zprávy v imperativu ("Failed to X")?
- [ ] Je použit `withRequestContext()` v API route handlers?
- [ ] Neobsahuje log citlivá data (passwords, tokens, PII)?
- [ ] Je log level odpovídající (info/warn/error)?
- [ ] Jsou vlastní pole ve snake_case?

---

## Konfigurace

### LOG_LEVEL prostředí

Nastavení v `.env`:

```bash
# Development
LOG_LEVEL=debug

# Production
LOG_LEVEL=info
```

Podporované úrovně (od nejvíce verbose):
- `trace` - velmi detailní debugging
- `debug` - debugging informace
- `info` - běžné provozní informace (výchozí)
- `warn` - varování
- `error` - chyby
- `fatal` - kritické chyby způsobující pád aplikace

---

## Migrace starého kódu

Pokud najdeš starý pattern:

```typescript
// ❌ Starý pattern
catch (error) {
  log.error({ error }, 'Something failed')
}
```

Uprav na:

```typescript
// ✅ Nový pattern
import { logError } from '@/lib/logging'

catch (error) {
  logError(log, error, 'Something failed')
}
```

---

**Poslední aktualizace:** 2026-01-31
**Autor:** Unified Logging Implementation
**Status:** ✅ Production Ready
