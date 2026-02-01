# Logging Quick Reference

> **Rychlá reference pro logging v Orchideo projektu**

## Import

```typescript
import { createLogger, logError, LogFields } from '@/lib/logging'
```

## Vytvoření loggeru

```typescript
const log = createLogger('module-name')
```

## Základní logging

```typescript
// Info
log.info('Operation started')
log.info({ userId, analysisId }, 'Analysis created')

// Warning
log.warn({ attempts: 3 }, 'Rate limit approaching')
```

## Error logging

```typescript
try {
  await operation()
} catch (error) {
  logError(log, error, 'Operation failed', {
    [LogFields.userId]: userId,
  })
}
```

## Request tracing (API routes)

```typescript
import { withRequestContext } from '@/lib/logging'

const baseLog = createLogger('api-route')

export async function POST(request: Request) {
  const log = withRequestContext(baseLog, request)
  // log obsahuje request_id, ip_address, user_agent, path
}
```

## Zachycení kontextu pro error handling

```typescript
export async function POST(request: Request, { params }: Props) {
  let userId: string | undefined
  let resourceId: string | undefined

  try {
    const session = await auth()
    userId = session.user.id

    const { id } = await params
    resourceId = id

    // ... business logic ...

  } catch (error) {
    logError(log, error, 'Request failed', {
      [LogFields.userId]: userId,
      resource_id: resourceId,
    })
  }
}
```

## LogFields konstanty

```typescript
// Vždy používej pro standardní pole
LogFields.userId        // 'user_id'
LogFields.analysisId    // 'analysis_id'
LogFields.fbPageId      // 'fb_page_id'
LogFields.requestId     // 'request_id'
LogFields.durationMs    // 'duration_ms'

// Vlastní pole: snake_case
{
  group_id: groupId,
  primary_page_id: pageId,
}
```

## Measuring Performance

```typescript
const startTime = Date.now()
try {
  await operation()
  log.info({ [LogFields.durationMs]: Date.now() - startTime }, 'Completed')
} catch (error) {
  logError(log, error, 'Failed', {
    [LogFields.durationMs]: Date.now() - startTime,
  })
}
```

## ✅ DO

```typescript
// ✅ Použij logError pro chyby
logError(log, error, 'Failed to create user')

// ✅ Použij LogFields konstanty
{ [LogFields.userId]: userId }

// ✅ Zachyť kontext před try blokem
let userId: string | undefined

// ✅ Error message v imperativu
'Failed to create analysis'
```

## ❌ DON'T

```typescript
// ❌ Nepřímé logování erroru
log.error({ error }, 'Failed')

// ❌ Vlastní názvy místo LogFields
{ userId: userId }  // místo [LogFields.userId]

// ❌ Kontext nedostupný v catch
try {
  const userId = session.user.id // nedostupné v catch!
}

// ❌ Duplicitní info v message
`Failed: ${error.message}`  // message je už v err objektu
```

## Code Review Checklist

- [ ] `logError()` místo `log.error({ error }, ...)`
- [ ] `LogFields` pro standardní pole
- [ ] Kontext zachycen ve scope
- [ ] Error messages v imperativu
- [ ] `withRequestContext()` v API routes
- [ ] Žádná citlivá data v logách
- [ ] Správný log level (info/warn/error)

## Full Documentation

📖 [LOGGING-GUIDE.md](./LOGGING-GUIDE.md)
