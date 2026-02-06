# Logging Improvement Plan - Orchideo

> **Cíl:** Standardizovat a vylepšit logování napříč celou aplikací
> **Priorita:** Medium
> **Odhadovaný čas:** 3-4 hodiny
> **Breaking changes:** ❌ Ne

---

## Kontext

**Současný stav:**

- ✅ Pino v10.3.0 správně nakonfigurován
- ✅ 68 logger instances napříč aplikací
- ✅ Redaction tokenů funguje
- ❌ Error objekty se logují jako prázdné `{}`
- ❌ Nekonzistentní context fields (camelCase vs snake_case)
- ❌ Chybí request tracing
- ❌ Žádné helper funkce pro standardní operace

**Problémy k řešení:**

1. Error objects nejsou správně serializované (Pino vyžaduje klíč `err`)
2. Duplikace error logging kódu
3. Nekonzistentní naming convention pro context
4. Chybí korelační ID pro request tracing
5. Žádná centrální dokumentace logging best practices

---

## Implementační fáze

### Fáze 1: Vylepšení logging utility (1 hodina)

**Cíl:** Přidat helper funkce a zlepšit error serialization

#### 1.1 Rozšířit `src/lib/logging/index.ts`

**Přidat:**

```typescript
/**
 * Properly serialize Error objects for Pino logging.
 * Handles Error instances, unknown errors, and nested causes.
 */
export function serializeError(error: unknown): Record<string, unknown> {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
      cause: error.cause ? serializeError(error.cause) : undefined,
      // Preserve any additional enumerable properties
      ...Object.getOwnPropertyNames(error).reduce(
        (acc, key) => {
          if (!['name', 'message', 'stack', 'cause'].includes(key)) {
            acc[key] = (error as any)[key]
          }
          return acc
        },
        {} as Record<string, unknown>
      ),
    }
  }

  if (typeof error === 'object' && error !== null) {
    return { error: JSON.parse(JSON.stringify(error)) }
  }

  return { error: String(error) }
}

/**
 * Log error with proper serialization.
 * Use this instead of log.error({ error }, msg).
 *
 * @example
 * try {
 *   await riskyOperation()
 * } catch (error) {
 *   logError(log, error, 'Operation failed', { userId, analysisId })
 * }
 */
export function logError(
  logger: Logger,
  error: unknown,
  message: string,
  context?: LogContext
): void {
  logger.error(
    {
      ...context,
      err: serializeError(error),
    },
    message
  )
}

/**
 * Create a child logger with request context.
 * Useful for tracing requests across async operations.
 *
 * @example
 * const requestLog = withRequestContext(log, request)
 * requestLog.info('Processing request')
 */
export function withRequestContext(
  logger: Logger,
  request: { headers: Headers; url: string }
): Logger {
  const requestId = request.headers.get('x-request-id') || generateRequestId()
  const userAgent = request.headers.get('user-agent')
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]

  return logger.child({
    request_id: requestId,
    user_agent: userAgent,
    ip_address: ip,
    path: new URL(request.url).pathname,
  })
}

/**
 * Generate unique request ID for tracing.
 */
function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
}

/**
 * Standard context field names (use these consistently).
 */
export const LogFields = {
  // User context
  userId: 'user_id',
  userEmail: 'user_email',
  userName: 'user_name',

  // Analysis context
  analysisId: 'analysis_id',
  analysisStatus: 'analysis_status',

  // Facebook context
  fbPageId: 'fb_page_id',
  fbPageName: 'fb_page_name',

  // Request context
  requestId: 'request_id',
  ipAddress: 'ip_address',
  userAgent: 'user_agent',

  // Performance
  durationMs: 'duration_ms',
  responseSize: 'response_size',

  // Error context
  errorCode: 'error_code',
  errorType: 'error_type',
} as const
```

#### 1.2 Vytvořit `src/lib/logging/helpers.ts`

**Obsah:**

```typescript
import { type Logger } from 'pino'
import { logError, type LogContext } from './index'

/**
 * Log HTTP API request with standardized fields.
 */
export function logApiRequest(
  logger: Logger,
  method: string,
  path: string,
  statusCode: number,
  durationMs: number,
  context?: LogContext
): void {
  const level = statusCode >= 500 ? 'error' : statusCode >= 400 ? 'warn' : 'info'

  logger[level](
    {
      ...context,
      method,
      path,
      status_code: statusCode,
      duration_ms: durationMs,
    },
    `${method} ${path} ${statusCode}`
  )
}

/**
 * Log database operation with query info.
 */
export function logDbOperation(
  logger: Logger,
  operation: 'create' | 'read' | 'update' | 'delete',
  table: string,
  durationMs?: number,
  context?: LogContext
): void {
  logger.debug(
    {
      ...context,
      db_operation: operation,
      db_table: table,
      duration_ms: durationMs,
    },
    `DB ${operation} ${table}`
  )
}

/**
 * Log external API call (Facebook, Raynet, etc.).
 */
export function logExternalApi(
  logger: Logger,
  service: 'facebook' | 'raynet' | 'postmark' | 'google',
  endpoint: string,
  statusCode: number,
  durationMs: number,
  context?: LogContext
): void {
  const level = statusCode >= 500 ? 'error' : statusCode >= 400 ? 'warn' : 'info'

  logger[level](
    {
      ...context,
      external_service: service,
      external_endpoint: endpoint,
      status_code: statusCode,
      duration_ms: durationMs,
    },
    `${service.toUpperCase()} API ${endpoint} ${statusCode}`
  )
}

/**
 * Log business event (analysis started, PDF generated, etc.).
 */
export function logBusinessEvent(logger: Logger, event: string, context: LogContext): void {
  logger.info(
    {
      ...context,
      event_type: event,
    },
    event
  )
}
```

#### 1.3 Aktualizovat exports

**`src/lib/logging/index.ts`:**

```typescript
// Export all helpers
export * from './helpers'
export { LogFields }
```

---

### Fáze 2: Migrace existujícího kódu (1.5 hodiny)

**Cíl:** Nahradit všechny instance špatného error loggingu

#### 2.1 Najít všechny problematické patterny

```bash
# Najít všechny log.error({ error }, ...)
grep -r "log\.error({ error" src --include="*.ts" -n

# Najít všechny log.error({ error:" src --include="*.ts" -n

# Najít všechny catch bloky s loggingem
grep -r "catch.*{" src --include="*.ts" -A5 | grep "log\."
```

#### 2.2 Migrace podle priority

**High Priority (kritické API routes):**

1. `src/app/api/report/[token]/pdf/route.ts`
2. `src/app/api/analysis/create/route.ts`
3. `src/app/api/email/send-report/route.ts`
4. `src/lib/services/pdf/pdf-service.ts`

**Medium Priority (business logic):** 5. `src/lib/actions/analysis.ts` 6. `src/lib/integrations/facebook/client.ts` 7. `src/lib/integrations/facebook/insights.ts`

**Low Priority (ostatní):** 8. Všechny ostatní API routes 9. Server actions 10. Utility functions

#### 2.3 Migrační pattern

**Před:**

```typescript
import { createLogger } from '@/lib/logging'

const log = createLogger('pdf-service')

try {
  // ...
} catch (error) {
  log.error({ error }, 'PDF generation failed') // ❌
  throw error
}
```

**Po:**

```typescript
import { createLogger, logError } from '@/lib/logging'

const log = createLogger('pdf-service')

try {
  // ...
} catch (error) {
  logError(log, error, 'PDF generation failed', { analysisId }) // ✅
  throw error
}
```

#### 2.4 Automatizovaná migrace (optional)

**Použít codemod nebo sed:**

```bash
# Najít a nahradit pattern (dry-run)
find src -name "*.ts" -type f -exec sed -n '
  /log\.error({ error }/{
    p
  }
' {} +

# TODO: Napsat TypeScript codemod pro bezpečnější transformaci
```

---

### Fáze 3: Request tracing middleware (45 minut)

**Cíl:** Přidat request ID do všech API calls pro lepší debugování

#### 3.1 Vytvořit middleware `src/middleware/request-logger.ts`

```typescript
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

/**
 * Add request ID to all API requests for tracing.
 * Logs request/response with timing.
 */
export function requestLoggerMiddleware(request: NextRequest) {
  // Skip non-API routes
  if (!request.nextUrl.pathname.startsWith('/api/')) {
    return NextResponse.next()
  }

  const startTime = Date.now()
  const requestId = request.headers.get('x-request-id') || generateRequestId()

  // Clone request with request ID
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-request-id', requestId)

  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  })

  // Add request ID to response headers
  response.headers.set('x-request-id', requestId)

  // Log request (can be enhanced to log response too)
  const durationMs = Date.now() - startTime
  console.log(
    JSON.stringify({
      request_id: requestId,
      method: request.method,
      path: request.nextUrl.pathname,
      duration_ms: durationMs,
    })
  )

  return response
}

function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
}
```

#### 3.2 Integrovat do `middleware.ts`

**Aktualizovat hlavní middleware:**

```typescript
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { requestLoggerMiddleware } from './middleware/request-logger'

export function middleware(request: NextRequest) {
  // Request logging first
  const loggerResponse = requestLoggerMiddleware(request)
  if (loggerResponse) {
    request = new NextRequest(request, {
      headers: loggerResponse.headers,
    })
  }

  // Existing security headers logic
  const response = NextResponse.next()

  // ... security headers code ...

  // Preserve request ID in response
  const requestId = request.headers.get('x-request-id')
  if (requestId) {
    response.headers.set('x-request-id', requestId)
  }

  return response
}
```

#### 3.3 Použití v API routes

```typescript
import { withRequestContext } from '@/lib/logging'

export async function POST(request: Request) {
  const log = withRequestContext(createLogger('api-analysis'), request)

  log.info('Creating analysis') // automaticky includes request_id

  try {
    // ...
  } catch (error) {
    logError(log, error, 'Analysis creation failed')
  }
}
```

---

### Fáze 4: Dokumentace a best practices (30 minut)

**Cíl:** Zdokumentovat logging standardy pro tým

#### 4.1 Vytvořit `docs/development/LOGGING-GUIDE.md`

**Obsah:**

````markdown
# Logging Guide - Orchideo

## Quick Start

```typescript
import { createLogger, logError, LogFields } from '@/lib/logging'

const log = createLogger('my-module')

// ✅ Info logging
log.info({ [LogFields.userId]: '123' }, 'User logged in')

// ✅ Error logging
try {
  await riskyOperation()
} catch (error) {
  logError(log, error, 'Operation failed', {
    [LogFields.userId]: '123',
    [LogFields.analysisId]: 'abc',
  })
}

// ✅ Warning
log.warn({ count: 5 }, 'Retry limit approaching')

// ✅ Debug (only in LOG_LEVEL=debug)
log.debug({ query: 'SELECT *' }, 'Database query')
```
````

## Field Naming Conventions

Use constants from `LogFields`:

```typescript
import { LogFields } from '@/lib/logging'

log.info({
  [LogFields.userId]: user.id, // ✅ user_id
  [LogFields.analysisId]: analysis.id, // ✅ analysis_id
  [LogFields.durationMs]: elapsed, // ✅ duration_ms
})
```

## DO NOT Log Sensitive Data

❌ Never log:

- Passwords
- Access tokens (auto-redacted but still avoid)
- Credit card numbers
- Personal emails (use hashed user_id instead)
- Full IP addresses in production

✅ Always use:

- User IDs instead of emails
- Redacted tokens (first 8 chars)
- Error messages without stack traces in production

## Error Logging

**ALWAYS use `logError` helper:**

```typescript
// ❌ WRONG - error will be empty {}
log.error({ error }, 'Failed')

// ✅ CORRECT - error properly serialized
logError(log, error, 'Failed', { userId })
```

## Structured Logging Best Practices

```typescript
// ✅ GOOD - searchable, structured
log.info(
  {
    action: 'user_login',
    user_id: '123',
    ip_address: '1.2.3.4',
  },
  'User logged in'
)

// ❌ BAD - hard to search, not structured
log.info(`User 123 logged in from 1.2.3.4`)
```

## Performance Logging

```typescript
const start = Date.now()
const result = await expensiveOperation()
log.info(
  {
    duration_ms: Date.now() - start,
    result_count: result.length,
  },
  'Operation completed'
)
```

## Log Levels

| Level   | When to use                              |
| ------- | ---------------------------------------- |
| `fatal` | Application crash, cannot recover        |
| `error` | Operation failed, needs attention        |
| `warn`  | Unexpected but handled (retry, fallback) |
| `info`  | Important business events (default)      |
| `debug` | Detailed debugging (development only)    |
| `trace` | Very verbose (rarely used)               |

## Environment Variables

```bash
# Development
LOG_LEVEL=debug

# Production
LOG_LEVEL=info

# Staging
LOG_LEVEL=debug
```

````

#### 4.2 Aktualizovat `README.md`

**Přidat sekci:**

```markdown
## Logging

This project uses [Pino](https://github.com/pinojs/pino) for high-performance logging.

**Documentation:** See [docs/development/LOGGING-GUIDE.md](docs/development/LOGGING-GUIDE.md)

**Quick example:**
```typescript
import { createLogger, logError } from '@/lib/logging'

const log = createLogger('my-service')
try {
  await operation()
} catch (error) {
  logError(log, error, 'Operation failed', { userId })
}
````

````

#### 4.3 Aktualizovat `.env.example`

```bash
# Logging
# Levels: fatal, error, warn, info, debug, trace
# Development: debug | Production: info
LOG_LEVEL=debug
````

---

### Fáze 5: Testing a validace (30 minut)

**Cíl:** Ověřit, že logging funguje správně

#### 5.1 Unit tests pro logging helpers

**Vytvořit `src/lib/logging/__tests__/logging.test.ts`:**

```typescript
import { describe, it, expect, beforeEach } from 'vitest'
import { serializeError, LogFields } from '../index'

describe('serializeError', () => {
  it('serializes Error instance with message and stack', () => {
    const error = new Error('Test error')
    const serialized = serializeError(error)

    expect(serialized).toHaveProperty('name', 'Error')
    expect(serialized).toHaveProperty('message', 'Test error')
    expect(serialized).toHaveProperty('stack')
    expect(typeof serialized.stack).toBe('string')
  })

  it('serializes nested Error cause', () => {
    const cause = new Error('Root cause')
    const error = new Error('Main error', { cause })
    const serialized = serializeError(error)

    expect(serialized.cause).toBeDefined()
    expect((serialized.cause as any).message).toBe('Root cause')
  })

  it('handles unknown error types', () => {
    const error = { custom: 'error', code: 500 }
    const serialized = serializeError(error)

    expect(serialized).toHaveProperty('error')
  })

  it('handles string errors', () => {
    const serialized = serializeError('Something went wrong')
    expect(serialized).toEqual({ error: 'Something went wrong' })
  })
})

describe('LogFields', () => {
  it('provides consistent field names', () => {
    expect(LogFields.userId).toBe('user_id')
    expect(LogFields.analysisId).toBe('analysis_id')
    expect(LogFields.requestId).toBe('request_id')
  })
})
```

#### 5.2 Integration test - zkontrolovat log output

```typescript
// src/lib/logging/__tests__/integration.test.ts
import { describe, it, expect } from 'vitest'
import { createLogger, logError } from '../index'
import pino from 'pino'

describe('Logging integration', () => {
  it('logs errors with proper serialization', () => {
    const stream = pino.destination({ sync: true })
    const logger = pino(stream)

    const error = new Error('Test error')

    // Capture log output
    const logs: any[] = []
    stream.on('data', (data) => logs.push(JSON.parse(data)))

    logError(logger, error, 'Operation failed')

    expect(logs[0]).toMatchObject({
      level: 50, // error level
      msg: 'Operation failed',
      err: {
        name: 'Error',
        message: 'Test error',
      },
    })
  })
})
```

#### 5.3 Manual testing checklist

**Po migraci otestovat:**

- [ ] Log output v development obsahuje barevné pretty print
- [ ] Error objekty mají `message` a `stack` (ne prázdné `{}`)
- [ ] Request ID se propaguje přes async operace
- [ ] Sensitive data jsou redaktované (tokeny, cookies)
- [ ] Log level funguje (debug viditelné pouze s LOG_LEVEL=debug)
- [ ] Production logs jsou valid JSON (parseable)

**Testovací příkazy:**

```bash
# Development - zkontrolovat pretty print
docker logs orchideo-app --tail 50

# Zkontrolovat error serialization
# Vyvolat chybu (např. PDF generation s chybou)
# Ověřit, že log obsahuje error.message a error.stack

# Zkontrolovat request tracing
curl -H "x-request-id: test123" https://orchideo.ppsys.eu/api/health
docker logs orchideo-app | grep "test123"
```

---

## Implementační checklist

### Fáze 1: Logging utility ✅

- [ ] Rozšířit `src/lib/logging/index.ts`
  - [ ] `serializeError()` function
  - [ ] `logError()` helper
  - [ ] `withRequestContext()` helper
  - [ ] `LogFields` constants
- [ ] Vytvořit `src/lib/logging/helpers.ts`
  - [ ] `logApiRequest()`
  - [ ] `logDbOperation()`
  - [ ] `logExternalApi()`
  - [ ] `logBusinessEvent()`
- [ ] Export all helpers

### Fáze 2: Migrace kódu ✅

- [ ] Najít všechny `log.error({ error` patterny
- [ ] Migrovat API routes (high priority)
  - [ ] `src/app/api/report/[token]/pdf/route.ts`
  - [ ] `src/app/api/analysis/create/route.ts`
  - [ ] `src/app/api/email/send-report/route.ts`
- [ ] Migrovat services
  - [ ] `src/lib/services/pdf/pdf-service.ts`
- [ ] Migrovat business logic
  - [ ] `src/lib/actions/analysis.ts`
  - [ ] `src/lib/integrations/facebook/*.ts`
- [ ] Migrovat ostatní soubory (68 total)

### Fáze 3: Request tracing ✅

- [ ] Vytvořit `src/middleware/request-logger.ts`
- [ ] Integrovat do main `middleware.ts`
- [ ] Aktualizovat API routes použít `withRequestContext()`
- [ ] Test request ID propagation

### Fáze 4: Dokumentace ✅

- [ ] Vytvořit `docs/development/LOGGING-GUIDE.md`
- [ ] Aktualizovat `README.md`
- [ ] Aktualizovat `.env.example`
- [ ] Code review checklist

### Fáze 5: Testing ✅

- [ ] Unit tests pro helpers
- [ ] Integration tests
- [ ] Manual testing
- [ ] Production smoke test

---

## Migrace strategie

### Option 1: Big Bang (doporučeno pro malé projekty)

Migrace všech souborů najednou v jednom PR.

**Výhody:**

- Konzistence okamžitě
- Jeden PR k review

**Nevýhody:**

- Velký changeset
- Riziko konfliktů

### Option 2: Incremental (doporučeno pro Orchideo)

Migrace po vrstvách v několika PRech.

**PR 1:** Logging helpers + dokumentace

- Přidat všechny helper funkce
- Přidat testy
- Aktualizovat dokumentaci
- **0 změn v existujícím kódu**

**PR 2:** Migrace kritických routes

- API routes (`/api/report`, `/api/analysis`, `/api/email`)
- PDF service
- **Validace na production**

**PR 3:** Migrace business logic

- Actions
- Facebook integrace
- **Validace na production**

**PR 4:** Request tracing

- Middleware
- API route updates
- **Validace na production**

**PR 5:** Cleanup

- Zbylé soubory
- Deprecated patterns removal

### Option 3: Hybrid (recommended)

**PR 1:** Infrastructure (helpers + docs) - merge ihned
**PR 2:** Critical paths - merge po review
**PR 3+:** Ostatní migrace - průběžně

---

## Rollback plán

Pokud migrace způsobí problémy:

### Immediate rollback

```bash
git revert <commit-hash>
git push origin stage --force-with-lease
docker restart orchideo-app
```

### Partial rollback

Pokud pouze část migrace je problematická:

```bash
# Revert specific file
git checkout HEAD~1 -- src/app/api/problematic/route.ts
git commit -m "revert: problematic logging change"
git push
```

### Feature flag approach (optional)

```typescript
// Add feature flag
const USE_NEW_LOGGING = process.env.FEATURE_NEW_LOGGING === '1'

if (USE_NEW_LOGGING) {
  logError(log, error, 'Message')
} else {
  log.error({ error }, 'Message') // old way
}
```

---

## Success Metrics

Po dokončení migrace měřit:

1. **Error visibility** - % error logs s neprázdnými error objekty
   - Target: 100% (měřit manually nebo via log parsing)

2. **Request traceability** - % API requests s request_id
   - Target: 100%

3. **Code consistency** - % souborů používajících nové helpers
   - Target: 100%

4. **Team adoption** - New code používá nové patterny
   - Target: 100% (enforce via code review)

5. **Performance** - Logging overhead
   - Target: < 1ms per log call (Pino je už rychlé)

**Monitoring:**

```bash
# Count empty error objects in logs (production)
docker logs orchideo-app | grep '"err":{}' | wc -l
# Target: 0

# Count logs with request_id
docker logs orchideo-app | grep '"request_id"' | wc -l
# Target: všechny API calls
```

---

## Timeline

| Fáze      | Čas          | Popis                          |
| --------- | ------------ | ------------------------------ |
| 1         | 1h           | Logging helpers implementation |
| 2         | 1.5h         | Code migration (68 files)      |
| 3         | 45min        | Request tracing middleware     |
| 4         | 30min        | Documentation                  |
| 5         | 30min        | Testing & validation           |
| **Total** | **4h 15min** | End-to-end implementation      |

**Recommended schedule:**

- **Den 1 (2h):** Fáze 1 + část Fáze 2 (critical routes)
- **Den 2 (2h):** Dokončit Fáze 2 + Fáze 3
- **Den 3 (30min):** Fáze 4 + Fáze 5

---

## Post-Implementation

Po dokončení migrace:

1. **Team training** - Prezentace nových helpers a best practices
2. **Code review checklist** - Přidat logging checks
3. **CI/CD checks** - Lint rules pro deprecated patterns?
4. **Monitoring setup** - Zvážit log aggregation (Loki, CloudWatch)
5. **Periodic audit** - Quarterly review log quality

---

**Status:** 📋 Ready for implementation
**Author:** Claude Sonnet 4.5
**Date:** 2026-01-31
