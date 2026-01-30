# Deployment Guide

> Production deployment and infrastructure for Orchideo.

---

## Overview

Orchideo is a Next.js application deployed with Docker. Requires PostgreSQL database and environment configuration.

---

## Prerequisites

- Docker & Docker Compose
- PostgreSQL 15+
- Facebook App with OAuth configured
- SMTP server for emails (optional)

---

## Environment Variables

Copy and configure production environment:

```bash
cp .env.example .env.production
```

### Required Variables

| Variable            | Description                  | Example                          |
| ------------------- | ---------------------------- | -------------------------------- |
| DATABASE_URL        | PostgreSQL connection string | `postgresql://user:pass@host/db` |
| NEXTAUTH_SECRET     | Auth.js secret (32+ chars)   | `openssl rand -base64 32`        |
| NEXTAUTH_URL        | Application URL              | `https://app.orchideo.cz`        |
| FACEBOOK_APP_ID     | Facebook App ID              | `123456789`                      |
| FACEBOOK_APP_SECRET | Facebook App Secret          | `abc123...`                      |
| ENCRYPTION_KEY      | Token encryption key         | `openssl rand -base64 32`        |

### Optional Variables

| Variable               | Default | Description               |
| ---------------------- | ------- | ------------------------- |
| LOG_LEVEL              | info    | Pino log level            |
| ANALYSIS_TIMEOUT_MS    | 60000   | Analysis timeout (ms)     |
| REPORT_EXPIRATION_DAYS | 30      | Report validity period    |
| NEXT_PUBLIC_APP_URL    | -       | Public app URL for emails |

### Email Configuration

| Variable      | Description            |
| ------------- | ---------------------- |
| SMTP_HOST     | SMTP server hostname   |
| SMTP_PORT     | SMTP port (587 or 465) |
| SMTP_USER     | SMTP username          |
| SMTP_PASSWORD | SMTP password          |
| EMAIL_FROM    | Sender email address   |

---

## Docker Deployment

### docker-compose.yml

```yaml
version: '3.8'

services:
  app:
    build: .
    ports:
      - '3000:3000'
    environment:
      - DATABASE_URL=${DATABASE_URL}
      - NEXTAUTH_SECRET=${NEXTAUTH_SECRET}
      - NEXTAUTH_URL=${NEXTAUTH_URL}
      - FACEBOOK_APP_ID=${FACEBOOK_APP_ID}
      - FACEBOOK_APP_SECRET=${FACEBOOK_APP_SECRET}
      - ENCRYPTION_KEY=${ENCRYPTION_KEY}
    depends_on:
      - postgres
    restart: unless-stopped
    healthcheck:
      test: ['CMD', 'curl', '-f', 'http://localhost:3000/api/health']
      interval: 30s
      timeout: 10s
      retries: 3

  postgres:
    image: postgres:15-alpine
    environment:
      - POSTGRES_USER=orchideo
      - POSTGRES_PASSWORD=${DB_PASSWORD}
      - POSTGRES_DB=orchideo
    volumes:
      - postgres_data:/var/lib/postgresql/data
    restart: unless-stopped

volumes:
  postgres_data:
```

### Dockerfile

```dockerfile
FROM node:20-alpine AS base

# Install dependencies
FROM base AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

# Build application
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# Production image
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000
ENV PORT 3000

CMD ["node", "server.js"]
```

---

## Deployment Steps

### 1. Build and push image

```bash
docker build -t orchideo:latest .
docker tag orchideo:latest your-registry/orchideo:latest
docker push your-registry/orchideo:latest
```

### 2. Set up database

```bash
# Create database
docker compose up -d postgres

# Run migrations
docker compose run --rm app npx prisma migrate deploy

# Seed initial data (optional)
docker compose run --rm app npx prisma db seed
```

### 3. Start application

```bash
docker compose up -d
```

### 4. Verify deployment

```bash
# Check logs
docker compose logs -f app

# Check health
curl http://localhost:3000/api/health
```

---

## Database Setup

### Initial Migration

```bash
# Generate Prisma client
npx prisma generate

# Deploy migrations
npx prisma migrate deploy

# Seed benchmarks
npx prisma db seed
```

### Backup

```bash
# Backup
docker exec postgres pg_dump -U orchideo orchideo > backup.sql

# Restore
docker exec -i postgres psql -U orchideo orchideo < backup.sql
```

---

## Facebook App Configuration

### Required Settings

1. **App Dashboard** > **Settings** > **Basic**
   - App Domains: `app.orchideo.cz`
   - Privacy Policy URL: `https://app.orchideo.cz/privacy`

2. **Facebook Login** > **Settings**
   - Valid OAuth Redirect URIs: `https://app.orchideo.cz/api/auth/callback/facebook`
   - Client OAuth Login: Yes
   - Web OAuth Login: Yes

3. **Permissions** (must be approved for production)
   - `pages_show_list`
   - `pages_read_engagement`
   - `pages_read_user_content`
   - `read_insights`

### App Review

Before going live, submit for App Review:

1. Prepare video demo
2. Document data usage
3. Submit permissions for review

---

## Health Checks

### API Health Endpoint

```typescript
// src/app/api/health/route.ts
export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`
    return NextResponse.json({ status: 'healthy' })
  } catch {
    return NextResponse.json({ status: 'unhealthy' }, { status: 500 })
  }
}
```

### Docker Health Check

```yaml
healthcheck:
  test: ['CMD', 'curl', '-f', 'http://localhost:3000/api/health']
  interval: 30s
  timeout: 10s
  retries: 3
  start_period: 40s
```

---

## Monitoring

### Logging

Pino JSON logs to stdout:

```bash
docker compose logs -f app | jq '.'
```

Log levels: `trace`, `debug`, `info`, `warn`, `error`, `fatal`

### Metrics (optional)

Consider adding:

- Prometheus metrics endpoint
- Grafana dashboard
- Error tracking (Sentry)

---

## SSL/TLS

Use reverse proxy (nginx, Traefik, Caddy) for SSL:

### Caddy Example

```caddyfile
app.orchideo.cz {
  reverse_proxy localhost:3000
}
```

### nginx Example

```nginx
server {
  listen 443 ssl;
  server_name app.orchideo.cz;

  ssl_certificate /etc/letsencrypt/live/app.orchideo.cz/fullchain.pem;
  ssl_certificate_key /etc/letsencrypt/live/app.orchideo.cz/privkey.pem;

  location / {
    proxy_pass http://localhost:3000;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
  }
}
```

---

## Rollback

### Revert to previous version

```bash
# Pull previous image
docker pull your-registry/orchideo:previous-tag

# Update compose file or tag
docker compose down
docker compose up -d
```

### Database rollback

```bash
# Restore from backup
docker exec -i postgres psql -U orchideo orchideo < backup.sql
```

---

## Scaling

For higher load:

1. Use managed PostgreSQL (AWS RDS, DigitalOcean, etc.)
2. Add Redis for session storage
3. Run multiple app instances behind load balancer
4. Use CDN for static assets
