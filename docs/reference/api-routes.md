# API Routes

> REST API endpoint reference for Orchideo.

---

## Overview

All API routes are in `src/app/api/`. Authentication via NextAuth session.

---

## Analysis Endpoints

### POST /api/analysis/create

Create a new analysis for a Facebook page.

**Request:**

```typescript
{
  pageId: string       // Facebook page ID (required)
  industryCode?: string // Industry benchmark code (default: "DEFAULT")
}
```

**Response (success):**

```typescript
{
  analysisId: string // Internal analysis ID
  publicToken: string // Shareable token for report access
}
```

**Response (error):**

```typescript
{
  error: string // Czech error message
  code: string // Error code
}
```

**Error codes:**

| Code                   | Status | Description                   |
| ---------------------- | ------ | ----------------------------- |
| VALIDATION_ERROR       | 400    | Invalid request data          |
| FACEBOOK_NOT_CONNECTED | 400    | User has no FB account linked |
| PAGE_NOT_FOUND         | 400    | Page not found or no access   |
| UNAUTHORIZED           | 401    | Not authenticated             |
| PERMISSION_DENIED      | 403    | No permission for this page   |
| INTERNAL_ERROR         | 500    | Unexpected error              |

**Example:**

```bash
curl -X POST http://localhost:3000/api/analysis/create \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.session-token=..." \
  -d '{"pageId": "123456789"}'
```

---

### GET /api/analysis/[id]/status

Get the current status of an analysis.

**Path parameters:**

- `id` - Analysis ID

**Response (success):**

```typescript
{
  success: true
  data: {
    status: "PENDING" | "COLLECTING_DATA" | "ANALYZING" | "COMPLETED" | "FAILED"
    progress: number     // 0-100
    errorMessage?: string // If status is FAILED
    publicToken: string  // For report access
  }
}
```

**Response (error):**

```typescript
{
  success: false
  error: string
  code: string
}
```

**Progress mapping:**

| Status          | Progress |
| --------------- | -------- |
| PENDING         | 5        |
| COLLECTING_DATA | 40       |
| ANALYZING       | 75       |
| COMPLETED       | 100      |
| FAILED          | 100      |

**Example:**

```bash
curl http://localhost:3000/api/analysis/abc123/status \
  -H "Cookie: next-auth.session-token=..."
```

---

## Facebook Endpoints

### GET /api/facebook/pages

Get list of Facebook pages the user can manage.

**Response (success):**

```typescript
{
  pages: Array<{
    id: string // Facebook page ID
    name: string // Page name
    category?: string // Page category
    picture_url?: string // Profile picture URL
    tasks: string[] // Available tasks (permissions)
  }>
}
```

**Response (error):**

```typescript
{
  error: string
  code: string
}
```

**Error codes:**

| Code                   | Status | Description                |
| ---------------------- | ------ | -------------------------- |
| UNAUTHORIZED           | 401    | Not authenticated          |
| FACEBOOK_NOT_CONNECTED | 400    | No Facebook account linked |
| TOKEN_EXPIRED          | 401    | Facebook token expired     |
| PERMISSION_DENIED      | 403    | No permission for pages    |
| FACEBOOK_API_ERROR     | 502    | Facebook API error         |
| INTERNAL_ERROR         | 500    | Unexpected error           |

**Example:**

```bash
curl http://localhost:3000/api/facebook/pages \
  -H "Cookie: next-auth.session-token=..."
```

---

## Email Endpoints

### POST /api/email/send-report

Send analysis report via email.

**Request:**

```typescript
{
  email: string // Recipient email (required)
  analysisToken: string // Public token of the analysis (required)
}
```

**Response (success):**

```typescript
{
  success: true
}
```

**Response (error):**

```typescript
{
  error: string
  details?: object // Validation errors
}
```

**Status codes:**

| Status | Description             |
| ------ | ----------------------- |
| 200    | Email sent successfully |
| 400    | Invalid input           |
| 404    | Report not found        |
| 410    | Report expired          |
| 500    | Email sending failed    |

**Example:**

```bash
curl -X POST http://localhost:3000/api/email/send-report \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com", "analysisToken": "abc123"}'
```

---

## Trends & Alerts Endpoints

### GET /api/pages/[pageId]/trends

Get historical trend data for a Facebook page.

**Path parameters:**

- `pageId` - Internal Facebook page ID

**Response (success):**

```typescript
{
  pageId: string
  pageName: string
  reliability: {
    level: 'high' | 'medium' | 'low' | 'insufficient'
    snapshotCount: number
    oldestSnapshotDate: string | null
    newestSnapshotDate: string | null
    scoringVersionConsistent: boolean
    message: string
  }
  trends: {
    overallScore: TrendData
    engagementRate: TrendData
    postsPerWeek: TrendData
    avgReactions: TrendData
    avgComments: TrendData
    avgShares: TrendData
  }
  meta: {
    scoringVersion: string
    benchmarkVersion: string
    calculatedAt: string
  }
}
```

---

### GET /api/user/alerts

Get alerts for the current user.

**Query parameters:**

- `limit` - Max alerts to return (default: 50, max: 100)
- `includeRead` - Include read alerts (default: true)

**Response:**

```typescript
{
  alerts: Array<{
    id: string
    type: string
    severity: number // 1=info, 2=warning, 3=critical
    previousValue: number
    currentValue: number
    changePct: number
    message: string
    isRead: boolean
    pageName: string
    pageId: string
    createdAt: string
  }>
  unreadCount: number
  total: number
}
```

---

### PATCH /api/user/alerts

Mark all alerts as read.

**Request:**

```typescript
{
  markAllRead: true
}
```

**Response:**

```typescript
{
  success: true,
  markedCount: number
}
```

---

### PATCH /api/user/alerts/[id]

Mark a single alert as read.

**Request:**

```typescript
{
  is_read: true
}
```

---

## PDF Export Endpoints

### POST /api/report/[token]/pdf

Generate or retrieve cached PDF for a report.

**Path parameters:**

- `token` - Public analysis token

**Request (optional):**

```typescript
{
  includeBranding?: boolean  // Include Orchideo branding (default: from analysis settings)
  companyName?: string       // Custom company name for report
}
```

**Response (success):**

- Status: 200
- Content-Type: application/pdf
- Headers:
  - `X-Cache`: "HIT" or "MISS"
  - `X-RateLimit-Remaining`: remaining requests
  - `X-RateLimit-Reset`: reset timestamp

**Error codes:**

| Code             | Status | Description                |
| ---------------- | ------ | -------------------------- |
| RATE_LIMITED     | 429    | Too many requests (3/hour) |
| NOT_FOUND        | 404    | Report not found           |
| EXPIRED          | 410    | Report has expired         |
| NOT_READY        | 400    | Analysis not completed     |
| BUSY             | 503    | Server busy, try later     |
| GENERATION_ERROR | 500    | PDF generation failed      |

---

## Competitor Comparison Endpoints

### GET /api/competitor-groups

List all competitor groups for the current user.

**Response:**

```typescript
{
  groups: Array<{
    id: string
    name: string
    description: string | null
    primaryPage: { id: string; name: string; picture_url: string | null }
    competitors: Array<{ id: string; name: string; picture_url: string | null }>
    comparisonsCount: number
    createdAt: string
    updatedAt: string
  }>
}
```

---

### POST /api/competitor-groups

Create a new competitor group.

**Request:**

```typescript
{
  name: string                    // Group name (required, max 100)
  description?: string            // Description (max 500)
  primaryPageId: string           // ID of primary page to compare
  competitorPageIds: string[]     // IDs of competitor pages (1-10, duplicates removed)
}
```

**Response:**

```typescript
{
  id: string // Created group ID
}
```

**Error codes:**

| Code           | Status | Description                       |
| -------------- | ------ | --------------------------------- |
| INVALID_PAGES  | 400    | Some pages not found or not owned |
| DUPLICATE_PAGE | 400    | Primary page in competitors list  |

---

### GET /api/competitor-groups/[id]

Get details of a competitor group.

---

### DELETE /api/competitor-groups/[id]

Delete a competitor group.

---

### GET /api/competitor-groups/[id]/comparison

Compute comparison without saving (read-only).

**Response:**

```typescript
{
  groupId: string
  groupName: string
  reliability: {
    level: 'high' | 'medium' | 'low' | 'insufficient'
    pageCount: number
    pagesWithSnapshots: number
    scoringVersionConsistent: boolean
    message: string
  }
  pages: Array<{
    pageId: string
    pageName: string
    isPrimary: boolean
    snapshotDate: string | null
    metrics: Record<string, number | null>
  }>
  rankings: Array<{
    metricKey: string
    ranks: Array<{
      pageId: string
      value: number | null
      rank: number // 1-based, 0 for unranked
      percentile: number
    }>
  }>
  meta: {
    scoringVersion: string
    benchmarkVersion: string
    calculatedAt: string
  }
}
```

---

### POST /api/competitor-groups/[id]/comparison

Save a comparison snapshot.

**Response:**

```typescript
{
  id: string           // Snapshot ID
  comparison: {...}    // Full comparison result
}
```

---

## Authentication

### GET/POST /api/auth/[...nextauth]

NextAuth.js authentication endpoints. Handles:

- `/api/auth/signin` - Sign in page
- `/api/auth/signout` - Sign out
- `/api/auth/callback/facebook` - Facebook OAuth callback
- `/api/auth/session` - Current session info
- `/api/auth/csrf` - CSRF token

See [NextAuth.js documentation](https://next-auth.js.org/getting-started/rest-api).

---

## Response Patterns

### Success Pattern

```typescript
{
  success: true,
  data: { ... }
}
```

or direct data for simple responses:

```typescript
{
  analysisId: "...",
  publicToken: "..."
}
```

### Error Pattern

```typescript
{
  success: false,
  error: "Czech error message",
  code: "ERROR_CODE"
}
```

or simplified:

```typescript
{
  error: "Czech error message",
  code: "ERROR_CODE"
}
```

---

## Authentication

All endpoints except `/api/email/send-report` require authentication.

Authentication is verified via:

```typescript
const session = await auth()
if (!session?.user?.id) {
  return NextResponse.json({ error: 'Neprihlaseno' }, { status: 401 })
}
```

---

## Rate Limiting

**PDF Export:** 3 requests per hour per token (in-memory rate limiter with hourly cleanup).

Consider adding:

- Per-user limits for analysis creation
- Per-IP limits for email sending

---

## CORS

Default Next.js CORS settings. API routes only accessible from same origin.

---

## Error Handling Best Practices

```typescript
export async function POST(request: Request) {
  try {
    // 1. Validate input
    const parsed = schema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message, code: 'VALIDATION_ERROR' },
        { status: 400 }
      )
    }

    // 2. Check authentication
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Neprihlaseno' }, { status: 401 })
    }

    // 3. Business logic
    const result = await doSomething(parsed.data)

    // 4. Return success
    return NextResponse.json(result)
  } catch (error) {
    // 5. Log and return generic error
    log.error({ error }, 'Unexpected error')
    return NextResponse.json(
      { error: 'Neocekavana chyba', code: 'INTERNAL_ERROR' },
      { status: 500 }
    )
  }
}
```
