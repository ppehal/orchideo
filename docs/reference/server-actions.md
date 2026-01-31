# Server Actions

> Next.js Server Actions reference for Orchideo.

---

## Overview

Server Actions are async functions that run on the server. Used for mutations from Client Components.

**Location:** `src/lib/actions/`

---

## ActionResult Pattern

All mutation actions return `ActionResult`:

```typescript
interface ActionResult<T = unknown> {
  success: boolean
  data?: T
  error?: string
  code?: string
}
```

**Important:** Never throw in mutation actions. Always return `ActionResult`.

---

## Analysis Actions

### createAnalysis

Creates a new analysis for a Facebook page and starts background processing.

**Signature:**

```typescript
function createAnalysis(
  pageId: string,
  industryCode?: string
): Promise<ActionResult<CreateAnalysisResult>>
```

**Parameters:**

| Parameter    | Type   | Required | Description                        |
| ------------ | ------ | -------- | ---------------------------------- |
| pageId       | string | Yes      | Facebook page ID                   |
| industryCode | string | No       | Industry code (default: "DEFAULT") |

**Returns:**

```typescript
interface CreateAnalysisResult {
  analysisId: string // Internal ID for status polling
  publicToken: string // Shareable token for report access
}
```

**Error codes:**

| Code                   | Description                |
| ---------------------- | -------------------------- |
| UNAUTHORIZED           | User not logged in         |
| FACEBOOK_NOT_CONNECTED | No Facebook account linked |
| PAGE_NOT_FOUND         | Page not accessible        |
| TOKEN_EXPIRED          | Facebook token expired     |
| PERMISSION_DENIED      | No permission for page     |
| FACEBOOK_API_ERROR     | Facebook API error         |
| INTERNAL_ERROR         | Unexpected error           |

**Example:**

```typescript
'use client'

import { createAnalysis } from '@/lib/actions/analysis'

async function handleAnalyze(pageId: string) {
  const result = await createAnalysis(pageId, 'ECOMMERCE')

  if (!result.success) {
    toast.error(result.error)
    return
  }

  // Redirect to analysis status page
  router.push(`/analyze/${result.data.analysisId}`)
}
```

**Process:**

1. Validates user session
2. Gets Facebook access token
3. Verifies page access
4. Creates `FacebookPage` record (upsert)
5. Creates `Analysis` record (PENDING)
6. Logs `analysis_started` event
7. Starts background analysis via `startAnalysisInBackground()`
8. Returns immediately with IDs

---

### getAnalysisStatus

Gets the current status of an analysis.

**Signature:**

```typescript
function getAnalysisStatus(
  analysisId: string
): Promise<ActionResult<{ status: AnalysisStatus; progress?: number }>>
```

**Parameters:**

| Parameter  | Type   | Required | Description |
| ---------- | ------ | -------- | ----------- |
| analysisId | string | Yes      | Analysis ID |

**Returns:**

```typescript
{
  status: 'PENDING' | 'COLLECTING_DATA' | 'ANALYZING' | 'COMPLETED' | 'FAILED'
  progress: number // 0-100
}
```

**Progress values:**

| Status          | Progress |
| --------------- | -------- |
| PENDING         | 0        |
| COLLECTING_DATA | 30       |
| ANALYZING       | 70       |
| COMPLETED       | 100      |
| FAILED          | 100      |

**Error codes:**

| Code         | Description        |
| ------------ | ------------------ |
| UNAUTHORIZED | Not logged in      |
| NOT_FOUND    | Analysis not found |

**Example:**

```typescript
const result = await getAnalysisStatus(analysisId)

if (result.success && result.data.status === 'COMPLETED') {
  router.push(`/report/${publicToken}`)
}
```

---

## Action vs Query Functions

| Type   | Use Case                           | Error Handling      | Called From       |
| ------ | ---------------------------------- | ------------------- | ----------------- |
| Action | Mutations (create, update, delete) | Return ActionResult | Client Components |
| Query  | Data fetching                      | Can throw           | Server Components |

**Query functions** (not in actions folder):

- Can throw errors (caught by error boundaries)
- Return data directly
- Called from Server Components

**Example query:**

```typescript
// src/lib/queries/analysis.ts
export async function getAnalysisById(id: string): Promise<Analysis> {
  const session = await auth()
  if (!session) throw new Error('Unauthorized')

  const analysis = await prisma.analysis.findUnique({ where: { id } })
  if (!analysis) throw new Error('Not found')

  return analysis
}
```

---

## Error Handling Pattern

```typescript
'use server'

import { auth } from '@/lib/auth'
import { createLogger } from '@/lib/logging'

const log = createLogger('action-name')

export async function myAction(input: string): Promise<ActionResult<Data>> {
  // 1. Check authentication
  const session = await auth()
  if (!session?.user?.id) {
    return { success: false, error: 'Neprihlaseno', code: 'UNAUTHORIZED' }
  }

  try {
    // 2. Validate input (Zod recommended)
    const parsed = schema.safeParse(input)
    if (!parsed.success) {
      return { success: false, error: 'Neplatny vstup', code: 'VALIDATION_ERROR' }
    }

    // 3. Business logic
    const result = await doSomething(parsed.data)

    // 4. Return success
    return { success: true, data: result }
  } catch (error) {
    // 5. Log error
    log.error({ error }, 'Action failed')

    // 6. Handle known errors
    if (error instanceof KnownError) {
      return { success: false, error: error.message, code: error.code }
    }

    // 7. Return generic error
    return { success: false, error: 'Neocekavana chyba', code: 'INTERNAL_ERROR' }
  }
}
```

---

## Using Actions in Components

```typescript
'use client'

import { useState } from 'react'
import { createAnalysis } from '@/lib/actions/analysis'
import { toast } from 'sonner'

function AnalyzeButton({ pageId }: { pageId: string }) {
  const [isLoading, setIsLoading] = useState(false)

  async function handleClick() {
    setIsLoading(true)

    try {
      const result = await createAnalysis(pageId)

      if (!result.success) {
        toast.error(result.error)
        return
      }

      toast.success('Analyza spustena')
      // Handle success...

    } finally {
      setIsLoading(false)
    }
  }

  return (
    <LoadingButton onClick={handleClick} loading={isLoading}>
      Analyzovat
    </LoadingButton>
  )
}
```

---

## File Constraints

Files with `'use server'` directive can only export:

- Async functions
- NOT: objects, constants, types

```typescript
// ❌ WRONG
'use server'
export const CONFIG = { ... }  // Not allowed

// ✅ CORRECT
'use server'
const CONFIG = { ... }  // Internal only
export async function doSomething() { ... }
```

---

## Validation

Use Zod for input validation:

```typescript
import { z } from 'zod'

const createSchema = z.object({
  pageId: z.string().min(1, 'ID stranky je povinne'),
  industryCode: z.string().optional().default('DEFAULT'),
})

export async function createAnalysis(
  pageId: string,
  industryCode?: string
): Promise<ActionResult<CreateAnalysisResult>> {
  const parsed = createSchema.safeParse({ pageId, industryCode })

  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message || 'Neplatny vstup',
      code: 'VALIDATION_ERROR',
    }
  }

  // Use parsed.data...
}
```
