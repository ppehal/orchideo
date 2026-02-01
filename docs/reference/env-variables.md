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

### Logging

| Variable    | Default | Description    |
| ----------- | ------- | -------------- |
| `LOG_LEVEL` | `info`  | Pino log level |

### Development

| Variable | Default | Description         |
| -------- | ------- | ------------------- |
| `CI`     | -       | CI environment flag |

### Debug

| Variable              | Default | Description                                       |
| --------------------- | ------- | ------------------------------------------------- |
| `SHOW_DEBUG_FORMULAS` | `false` | Show calculation formulas in trigger detail pages |

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
