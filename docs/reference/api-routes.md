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

No built-in rate limiting. Consider adding:

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
