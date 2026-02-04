# Environment Variables

> Configuration reference for Orchideo.

## Required Variables

### Database

| Variable       | Description           | Example                                    |
| -------------- | --------------------- | ------------------------------------------ |
| `DATABASE_URL` | PostgreSQL connection | `postgresql://user:pass@localhost:5432/db` |

### Authentication

| Variable              | Description         | Example                   |
| --------------------- | ------------------- | ------------------------- |
| `NEXTAUTH_SECRET`     | Auth.js secret      | `openssl rand -base64 32` |
| `NEXTAUTH_URL`        | App URL             | `http://localhost:3000`   |
| `FACEBOOK_APP_ID`     | Facebook App ID     | `123456789`               |
| `FACEBOOK_APP_SECRET` | Facebook App Secret | `abc123...`               |

### Encryption

| Variable         | Description          | Example                   |
| ---------------- | -------------------- | ------------------------- |
| `ENCRYPTION_KEY` | Token encryption key | `openssl rand -base64 32` |

## Optional Variables

### Application

| Variable                  | Default | Description                         |
| ------------------------- | ------- | ----------------------------------- |
| `NEXT_PUBLIC_APP_URL`     | -       | Public app URL                      |
| `REPORT_EXPIRATION_DAYS`  | -       | Days before report expires          |
| `MAX_FEED_POSTS`          | -       | Max posts to fetch from Facebook    |
| `MAX_FEED_PAGES`          | -       | Max pages to fetch                  |
| `FEED_TIMEOUT_MS`         | -       | Facebook API timeout (milliseconds) |
| `ANALYSIS_TIMEOUT_MS`     | -       | Analysis timeout (milliseconds)     |

### Logging

| Variable    | Default | Description    |
| ----------- | ------- | -------------- |
| `LOG_LEVEL` | `info`  | Pino log level |

### Storage

| Variable                 | Default | Description                  |
| ------------------------ | ------- | ---------------------------- |
| `STORAGE_TYPE`           | `local` | Storage type (local, r2)     |
| `STORAGE_LOCAL_PATH`     | -       | Local storage path           |
| `R2_ACCOUNT_ID`          | -       | Cloudflare R2 account ID     |
| `R2_ENDPOINT`            | -       | Cloudflare R2 endpoint       |
| `R2_ACCESS_KEY_ID`       | -       | Cloudflare R2 access key     |
| `R2_SECRET_ACCESS_KEY`   | -       | Cloudflare R2 secret key     |
| `R2_BUCKET_NAME`         | -       | Cloudflare R2 bucket name    |

### Email

| Variable              | Default | Description             |
| --------------------- | ------- | ----------------------- |
| `POSTMARK_API_TOKEN`  | -       | Postmark API token      |
| `POSTMARK_FROM_EMAIL` | -       | From email address      |

### Security

| Variable        | Default | Description                          |
| --------------- | ------- | ------------------------------------ |
| `ADMIN_EMAILS`  | -       | Comma-separated admin emails         |

### Development

| Variable           | Default | Description         |
| ------------------ | ------- | ------------------- |
| `CI`               | -       | CI environment flag |
| `NODE_ENV`         | -       | Node environment    |
| `NEXT_PUBLIC_ENV`  | -       | Public env indicator|

### Debug

| Variable              | Default | Description                                       |
| --------------------- | ------- | ------------------------------------------------- |
| `SHOW_DEBUG_FORMULAS` | `false` | Show calculation formulas in trigger detail pages |

> **Detailed guides:** See [ENVIRONMENT-VARIABLES.md](../development/ENVIRONMENT-VARIABLES.md) for troubleshooting and detailed usage.

## Example .env.local

```bash
# Database
DATABASE_URL="postgresql://orchideo:orchideo@localhost:5432/orchideo"

# Auth
NEXTAUTH_SECRET="your-secret-here"
NEXTAUTH_URL="http://localhost:3000"

# Facebook
FACEBOOK_APP_ID="your-app-id"
FACEBOOK_APP_SECRET="your-app-secret"

# Encryption
ENCRYPTION_KEY="your-encryption-key"

# Logging
LOG_LEVEL="debug"
```
