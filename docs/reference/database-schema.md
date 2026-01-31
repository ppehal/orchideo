# Database Schema

> Prisma schema reference for Orchideo.

---

## Overview

PostgreSQL database with Prisma ORM. Schema defined in `prisma/schema.prisma`.

---

## Entity Relationship Diagram

```
┌───────────┐      ┌────────────┐      ┌──────────────┐
│   User    │──────│  Account   │      │   Session    │
└─────┬─────┘      └────────────┘      └──────────────┘
      │
      │ 1:N
      ▼
┌─────────────────┐      ┌─────────────┐
│  FacebookPage   │◀─────│  Analysis   │
└─────────────────┘      └──────┬──────┘
                                │
                 ┌──────────────┼──────────────┐
                 │              │              │
                 ▼              ▼              ▼
          ┌─────────────┐ ┌─────────────┐ ┌─────────────┐
          │TriggerResult│ │AnalyticsEvnt│ │IndustryBnch │
          └─────────────┘ └─────────────┘ └─────────────┘
```

---

## Auth.js Models

### User

Primary user account.

| Field         | Type      | Description             |
| ------------- | --------- | ----------------------- |
| id            | String    | CUID primary key        |
| name          | String?   | Display name            |
| email         | String    | Unique email            |
| emailVerified | DateTime? | Email verification time |
| image         | String?   | Profile image URL       |
| created_at    | DateTime  | Account creation time   |
| updated_at    | DateTime  | Last update time        |

**Relations:**

- `accounts` - OAuth accounts
- `sessions` - Active sessions
- `facebookPages` - Connected FB pages
- `analyses` - User's analyses

### Account

OAuth provider accounts.

| Field             | Type    | Description               |
| ----------------- | ------- | ------------------------- |
| userId            | String  | User reference            |
| type              | String  | Account type              |
| provider          | String  | OAuth provider (facebook) |
| providerAccountId | String  | Provider's user ID        |
| refresh_token     | String? | OAuth refresh token       |
| access_token      | String? | OAuth access token        |
| expires_at        | Int?    | Token expiration (epoch)  |
| token_type        | String? | Token type (bearer)       |
| scope             | String? | Granted scopes            |

**Primary key:** `[provider, providerAccountId]`

### Session

Active user sessions.

| Field        | Type     | Description          |
| ------------ | -------- | -------------------- |
| sessionToken | String   | Unique session token |
| userId       | String   | User reference       |
| expires      | DateTime | Session expiration   |

### VerificationToken

Email verification tokens.

| Field      | Type     | Description        |
| ---------- | -------- | ------------------ |
| identifier | String   | Email address      |
| token      | String   | Verification token |
| expires    | DateTime | Token expiration   |

**Primary key:** `[identifier, token]`

---

## Business Models

### FacebookPage

Connected Facebook pages with encrypted access tokens.

| Field             | Type      | Description                |
| ----------------- | --------- | -------------------------- |
| id                | String    | CUID primary key           |
| fb_page_id        | String    | Facebook page ID (unique)  |
| name              | String    | Page name                  |
| category          | String?   | Page category              |
| fan_count         | Int?      | Number of followers        |
| picture_url       | String?   | Profile picture URL        |
| cover_url         | String?   | Cover photo URL            |
| page_access_token | String    | Encrypted with AES-256-GCM |
| token_expires_at  | DateTime? | Token expiration           |
| userId            | String    | Owner user reference       |
| created_at        | DateTime  | Connection time            |
| updated_at        | DateTime  | Last update                |

**Indexes:**

- `fb_page_id` (unique)
- `userId`

### Analysis

Analysis run against a Facebook page.

| Field          | Type           | Description                 |
| -------------- | -------------- | --------------------------- |
| id             | String         | CUID primary key            |
| status         | AnalysisStatus | Current status              |
| public_token   | String         | Unique shareable token      |
| page_name      | String?        | Snapshot of page name       |
| page_picture   | String?        | Snapshot of profile picture |
| page_fan_count | Int?           | Snapshot of fan count       |
| industry_code  | String         | Industry benchmark code     |
| overall_score  | Int?           | Final score (0-100)         |
| rawData        | Json?          | Normalized posts + insights |
| email_sent_to  | String?        | Report recipient email      |
| email_sent_at  | DateTime?      | Email send time             |
| started_at     | DateTime?      | Analysis start time         |
| completed_at   | DateTime?      | Analysis completion time    |
| expires_at     | DateTime?      | Report expiration           |
| error_message  | String?        | Error description           |
| error_code     | String?        | Error code                  |
| userId         | String         | Owner user reference        |
| fb_page_id     | String?        | Facebook page reference     |
| created_at     | DateTime       | Record creation time        |
| updated_at     | DateTime       | Last update                 |

**Indexes:**

- `public_token` (unique)
- `userId`
- `status`
- `expires_at`

### TriggerResult

Individual trigger evaluation result.

| Field        | Type            | Description                       |
| ------------ | --------------- | --------------------------------- |
| id           | String          | CUID primary key                  |
| trigger_code | String          | e.g., "BASIC_001"                 |
| category     | TriggerCategory | Trigger category                  |
| score        | Int             | Score 0-100                       |
| status       | TriggerStatus   | Status based on score             |
| value        | Float?          | Measured value                    |
| threshold    | Float?          | Target threshold                  |
| details      | Json?           | Name, description, recommendation |
| analysisId   | String          | Analysis reference                |
| created_at   | DateTime        | Evaluation time                   |

**Indexes:**

- `analysisId`
- `trigger_code`
- Unique: `[analysisId, trigger_code]`

### IndustryBenchmark

Industry-specific performance benchmarks.

| Field                | Type     | Description                     |
| -------------------- | -------- | ------------------------------- |
| id                   | String   | CUID primary key                |
| industry_code        | String   | Unique code (e.g., "ECOMMERCE") |
| industry_name        | String   | Display name                    |
| avg_engagement_rate  | Float    | Expected engagement rate        |
| reactions_pct        | Float    | % reactions in interactions     |
| comments_pct         | Float    | % comments in interactions      |
| shares_pct           | Float    | % shares in interactions        |
| ideal_engagement_pct | Float    | Ideal engagement content %      |
| ideal_sales_pct      | Float    | Ideal sales content %           |
| ideal_brand_pct      | Float    | Ideal brand content %           |
| ideal_posts_per_week | Float    | Recommended posting frequency   |
| created_at           | DateTime | Record creation                 |
| updated_at           | DateTime | Last update                     |

### AnalyticsEvent

Event tracking for analytics.

| Field      | Type     | Description                 |
| ---------- | -------- | --------------------------- |
| id         | String   | CUID primary key            |
| event_type | String   | Event name                  |
| analysisId | String?  | Related analysis (optional) |
| metadata   | Json?    | Event-specific data         |
| ip_address | String?  | Client IP                   |
| user_agent | String?  | Client user agent           |
| created_at | DateTime | Event time                  |

**Indexes:**

- `event_type`
- `analysisId`
- `created_at`

**Event types:**

- `analysis_started`
- `analysis_completed`
- `analysis_failed`
- `report_viewed`
- `email_submitted`
- `email_send_success`
- `email_send_error`

---

## Enums

### AnalysisStatus

```prisma
enum AnalysisStatus {
  PENDING
  COLLECTING_DATA
  ANALYZING
  COMPLETED
  FAILED
}
```

### TriggerCategory

```prisma
enum TriggerCategory {
  BASIC
  CONTENT
  TECHNICAL
  TIMING
  SHARING
  PAGE_SETTINGS
}
```

### TriggerStatus

```prisma
enum TriggerStatus {
  EXCELLENT         // 85-100
  GOOD              // 70-84
  NEEDS_IMPROVEMENT // 40-69
  CRITICAL          // 0-39
}
```

---

## Cascade Behavior

| Parent       | Child          | On Delete |
| ------------ | -------------- | --------- |
| User         | Account        | CASCADE   |
| User         | Session        | CASCADE   |
| User         | FacebookPage   | CASCADE   |
| User         | Analysis       | CASCADE   |
| FacebookPage | Analysis       | SET NULL  |
| Analysis     | TriggerResult  | CASCADE   |
| Analysis     | AnalyticsEvent | SET NULL  |

---

## Common Queries

### Get analysis with results

```typescript
const analysis = await prisma.analysis.findUnique({
  where: { id },
  include: {
    triggerResults: true,
    facebookPage: true,
  },
})
```

### Get user's analyses

```typescript
const analyses = await prisma.analysis.findMany({
  where: { userId },
  orderBy: { created_at: 'desc' },
})
```

### Get trigger results by category

```typescript
const results = await prisma.triggerResult.findMany({
  where: {
    analysisId,
    category: 'BASIC',
  },
  orderBy: { score: 'asc' },
})
```

---

## Migrations

```bash
# Push schema changes (development)
npm run db:push

# Generate Prisma client
npm run db:generate

# Seed initial data
npm run db:seed

# Open Prisma Studio
npm run db:studio
```

**After schema changes:**

1. Run `npm run db:push`
2. Run `npm run db:generate`
3. Restart TypeScript server in IDE
