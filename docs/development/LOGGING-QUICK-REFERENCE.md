# Logging Quick Reference

> **TL;DR:** Používej helper funkce místo přímého volání `log.error({ error }, ...)`

---

## ❌ ŠPATNĚ

```typescript
// ❌ Error objekt bude prázdný {}
log.error({ error }, 'PDF generation failed')

// ❌ Těžko searchovat, není structured
log.info(`User ${userId} logged in`)

// ❌ Duplicita kódu
try {
  await operation()
} catch (error) {
  log.error({
    error: {
      message: error.message,
      stack: error.stack,
      name: error.name,
    }
  }, 'Failed')
}
```

---

## ✅ SPRÁVNĚ

```typescript
import { createLogger, logError, LogFields } from '@/lib/logging'

const log = createLogger('my-service')

// ✅ Error s proper serializací
try {
  await operation()
} catch (error) {
  logError(log, error, 'Operation failed', {
    [LogFields.userId]: userId,
    [LogFields.analysisId]: analysisId,
  })
}

// ✅ Structured, searchable
log.info({
  [LogFields.userId]: userId,
  action: 'login',
}, 'User logged in')

// ✅ Request tracing
import { withRequestContext } from '@/lib/logging'

export async function POST(request: Request) {
  const log = withRequestContext(createLogger('api'), request)
  // Všechny logy budou mít request_id
}
```

---

## Cheat Sheet

| Operace | Helper funkce | Použití |
|---------|---------------|---------|
| Error logging | `logError()` | `logError(log, error, 'Failed', context)` |
| API request | `logApiRequest()` | `logApiRequest(log, 'POST', '/api/x', 200, 150)` |
| DB operation | `logDbOperation()` | `logDbOperation(log, 'create', 'users', 50)` |
| External API | `logExternalApi()` | `logExternalApi(log, 'facebook', '/me', 200, 300)` |
| Business event | `logBusinessEvent()` | `logBusinessEvent(log, 'analysis_started', ctx)` |
| Request context | `withRequestContext()` | `withRequestContext(log, request)` |

---

## Context Fields - Používej konstanty

```typescript
import { LogFields } from '@/lib/logging'

// ✅ Type-safe, konzistentní
log.info({
  [LogFields.userId]: '123',
  [LogFields.analysisId]: 'abc',
  [LogFields.durationMs]: 150,
})

// ❌ Typo-prone, nekonzistentní
log.info({
  user_id: '123',      // někde
  userId: '123',       // jinde
  USER_ID: '123',      // ???
})
```

---

## Log Levels

```typescript
log.fatal({ ... }, 'App crashed')       // 💀 Cannot recover
log.error({ ... }, 'Operation failed')  // ❌ Needs attention
log.warn({ ... }, 'Retry limit')        // ⚠️ Unexpected but handled
log.info({ ... }, 'Analysis created')   // ℹ️ Business events (DEFAULT)
log.debug({ ... }, 'Query: SELECT...')  // 🔍 Development only
log.trace({ ... }, 'Every step...')     // 🐛 Very verbose
```

---

## Common Patterns

### API Route

```typescript
import { createLogger, logError, withRequestContext } from '@/lib/logging'

const baseLog = createLogger('api-analysis')

export async function POST(request: Request) {
  const log = withRequestContext(baseLog, request)
  const startTime = Date.now()

  try {
    const result = await createAnalysis(data)

    log.info({
      analysis_id: result.id,
      duration_ms: Date.now() - startTime,
    }, 'Analysis created')

    return NextResponse.json(result)
  } catch (error) {
    logError(log, error, 'Analysis creation failed', {
      user_id: session.user.id,
    })

    return NextResponse.json(
      { error: 'Failed' },
      { status: 500 }
    )
  }
}
```

### Service Function

```typescript
import { createLogger, logError } from '@/lib/logging'

const log = createLogger('pdf-service')

export async function generatePdf(params: PdfParams) {
  const start = Date.now()

  log.info({ analysis_id: params.analysisId }, 'Generating PDF')

  try {
    const pdf = await puppeteer.launch(...)

    log.info({
      analysis_id: params.analysisId,
      duration_ms: Date.now() - start,
      file_size: pdf.length,
    }, 'PDF generated')

    return pdf
  } catch (error) {
    logError(log, error, 'PDF generation failed', {
      analysis_id: params.analysisId,
      duration_ms: Date.now() - start,
    })
    throw error
  }
}
```

### External API Call

```typescript
import { createLogger, logExternalApi } from '@/lib/logging'

const log = createLogger('facebook-api')

async function fetchPageInsights(pageId: string, token: string) {
  const start = Date.now()
  const endpoint = `/v21.0/${pageId}/insights`

  try {
    const response = await fetch(`https://graph.facebook.com${endpoint}`, {
      headers: { Authorization: `Bearer ${token}` },
    })

    logExternalApi(
      log,
      'facebook',
      endpoint,
      response.status,
      Date.now() - start,
      { fb_page_id: pageId }
    )

    return await response.json()
  } catch (error) {
    logError(log, error, 'Facebook API call failed', {
      fb_page_id: pageId,
      endpoint,
    })
    throw error
  }
}
```

---

## Migrační příklad

### Před (❌)

```typescript
const log = createLogger('pdf-service')

try {
  const pdf = await generatePdf()
} catch (error) {
  log.error({ error }, 'PDF generation failed')  // error: {}
}
```

### Po (✅)

```typescript
import { createLogger, logError, LogFields } from '@/lib/logging'

const log = createLogger('pdf-service')

try {
  const pdf = await generatePdf()
} catch (error) {
  logError(log, error, 'PDF generation failed', {
    [LogFields.analysisId]: analysisId,
  })
}
```

---

## Environment Setup

```bash
# .env.local
LOG_LEVEL=debug   # Development

# .env.production
LOG_LEVEL=info    # Production
```

---

**Dokumentace:** [LOGGING-IMPROVEMENT-PLAN.md](./LOGGING-IMPROVEMENT-PLAN.md)
