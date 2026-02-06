# Environment Variables

This document lists all environment variables used in the Orchideo project.

## Debug Visualization

### SHOW_DEBUG_FORMULAS

**Type**: `boolean` (string "true" or "false")
**Default**: `false`
**Location**: `.env.vps`, `.env.local`, `.env.production`

Controls whether debug visualization cards are shown on trigger detail pages.

**Values**:

- `"true"` - Show debug cards (calculation steps, thresholds, benchmarks, keyword matches)
- `"false"` - Hide debug cards (production mode)

**Usage**:

```typescript
const showFormulas = process.env.SHOW_DEBUG_FORMULAS === 'true'
```

**Development Setup** (`.env.vps`):

```bash
SHOW_DEBUG_FORMULAS=true
```

**Production Setup** (`.env.production`):

```bash
SHOW_DEBUG_FORMULAS=false
```

**Restart Required**: Yes

```bash
# VPS Development
./QUICK-START.sh restart

# Local Development
npm run dev  # Restart dev server
```

**Verification**:

```bash
# Check if variable is loaded
docker exec orchideo-app env | grep SHOW_DEBUG_FORMULAS

# Should output:
# SHOW_DEBUG_FORMULAS=true
```

**Features Controlled**:

- ✅ FormulaCard (existing)
- ✅ CalculationStepsCard (new)
- ✅ ThresholdVisualizationCard (new)
- ✅ BenchmarkContextCard (new)
- ✅ PostClassificationCard (new)

**Impact**:

- UI: Debug cards shown/hidden
- Performance: Minimal (cards collapsed by default, lazy rendering)
- Database: No impact (debug data always stored, just not displayed)

**Debugging**:
If debug cards don't appear:

1. Check `.env.vps` has `SHOW_DEBUG_FORMULAS=true`
2. Restart containers: `./QUICK-START.sh restart`
3. Verify variable loaded: `docker exec orchideo-app env | grep SHOW_DEBUG`
4. Create NEW analysis (old analyses won't have debug data)
5. Check browser console for errors

**Related Documentation**:

- [DEBUG-VISUALIZATION-IMPLEMENTATION.md](./DEBUG-VISUALIZATION-IMPLEMENTATION.md)
- [CLAUDE.md](../../CLAUDE.md) - Section on debug visualization

---

## Other Environment Variables

(This section can be expanded with other environment variables as needed)

### Database

- `DATABASE_URL` - PostgreSQL connection string
- `POSTGRES_PASSWORD` - PostgreSQL password (VPS only)

### Authentication

- `NEXTAUTH_URL` - Base URL for NextAuth
- `NEXTAUTH_SECRET` - Secret for NextAuth encryption
- `FACEBOOK_APP_ID` - Facebook OAuth app ID
- `FACEBOOK_APP_SECRET` - Facebook OAuth app secret
- `FACEBOOK_CONFIG_ID` - Facebook config ID

### Email

- `POSTMARK_API_TOKEN` - Postmark API token
- `POSTMARK_FROM_EMAIL` - From email address

### Application

- `NEXT_PUBLIC_APP_URL` - Public app URL
- `REPORT_EXPIRATION_DAYS` - Days before report expires
- `MAX_FEED_POSTS` - Max posts to fetch from Facebook
- `MAX_FEED_PAGES` - Max pages to fetch
- `FEED_TIMEOUT_MS` - Facebook API timeout
- `ANALYSIS_TIMEOUT_MS` - Analysis timeout

### Logging

- `LOG_LEVEL` - Logging level (debug, info, warn, error)

### Storage

- `STORAGE_TYPE` - Storage type (local, r2)
- `STORAGE_LOCAL_PATH` - Local storage path
- `R2_ACCOUNT_ID` - Cloudflare R2 account ID
- `R2_ENDPOINT` - Cloudflare R2 endpoint
- `R2_ACCESS_KEY_ID` - Cloudflare R2 access key
- `R2_SECRET_ACCESS_KEY` - Cloudflare R2 secret key
- `R2_BUCKET_NAME` - Cloudflare R2 bucket name

### Security

- `ENCRYPTION_KEY` - Encryption key for sensitive data
- `ADMIN_EMAILS` - Comma-separated list of admin emails

### Node.js

- `NODE_ENV` - Node environment (development, production)
- `NEXT_PUBLIC_ENV` - Public environment indicator
