# Orchideo Architecture

> System architecture overview for Orchideo - FB Triggers.

---

## High-Level Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         Orchideo                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────┐    ┌──────────────┐    ┌───────────────────┐     │
│  │   User   │───▶│  Next.js App │───▶│  PostgreSQL DB    │     │
│  │ (Browser)│    │  (Frontend)  │    │  (Prisma ORM)     │     │
│  └──────────┘    └──────┬───────┘    └───────────────────┘     │
│                         │                                        │
│                         ▼                                        │
│                  ┌──────────────┐                                │
│                  │ Facebook API │                                │
│                  │ (Graph API)  │                                │
│                  └──────────────┘                                │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Core Components

### 1. Data Collection Layer

Fetches data from Facebook Graph API:

- Page insights and metrics
- Post engagement data
- Audience demographics

### 2. Trigger Engine

Evaluates user-defined rules against collected data:

- Rule definition and storage
- Condition evaluation
- Threshold monitoring

### 3. Analysis Engine

Processes collected data:

- Trend detection
- Anomaly identification
- Performance scoring

### 4. Recommendation Generator

Produces actionable recommendations:

- Rule-based suggestions
- AI-powered insights (optional)
- Priority scoring

### 5. Report Builder

Generates output for users:

- Dashboard views
- PDF exports
- Email notifications

---

## Technology Stack

| Layer         | Technology                      |
| ------------- | ------------------------------- |
| Frontend      | Next.js 16, React 19, Tailwind  |
| Backend       | Next.js Server Actions          |
| Database      | PostgreSQL 16, Prisma ORM       |
| Auth          | NextAuth.js v5 (Facebook OAuth) |
| UI Components | shadcn/ui                       |
| External API  | Facebook Graph API              |

---

## Data Flow

```
1. User authenticates via Facebook OAuth
                    │
                    ▼
2. User selects FB page to analyze
                    │
                    ▼
3. System fetches page data via Graph API
                    │
                    ▼
4. Trigger Engine evaluates rules
                    │
                    ▼
5. Analysis Engine processes metrics
                    │
                    ▼
6. Recommendations generated
                    │
                    ▼
7. Results displayed / Report generated
```

---

## Security Model

- **Authentication**: Facebook OAuth only
- **Authorization**: Users can only access their own pages
- **Data Storage**: Minimal PII, tokens encrypted
- **API Security**: Rate limiting, token refresh

---

## Deployment

- **Environment**: Docker containers
- **Database**: Managed PostgreSQL
- **CI/CD**: GitHub Actions
- **Monitoring**: TBD

---

## Future Considerations

- [ ] Multi-platform support (Instagram, LinkedIn)
- [ ] Scheduled analysis runs
- [ ] Webhook notifications
- [ ] Team/organization features
