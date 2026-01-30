# Troubleshooting Guide

> Common issues and solutions for Orchideo.

---

## Facebook API Errors

### Token Expired

**Symptom:** Error code `TOKEN_EXPIRED` or `190` from Facebook.

**Cause:** User's Facebook access token has expired.

**Solution:**

1. User must sign out and sign back in
2. This refreshes the OAuth token

**Prevention:**

- Tokens are typically valid for 60 days
- Consider implementing token refresh flow

---

### Permission Denied

**Symptom:** Error code `PERMISSION_DENIED` or `200` from Facebook.

**Cause:** App doesn't have required permissions.

**Solution:**

1. Check Facebook App has approved permissions:
   - `pages_show_list`
   - `pages_read_engagement`
   - `pages_read_user_content`
   - `read_insights`
2. User needs to re-authorize with new scopes

**Debug:**

```bash
# Check user's granted permissions
curl "https://graph.facebook.com/v21.0/me/permissions?access_token=TOKEN"
```

---

### Page Not Found

**Symptom:** Error code `PAGE_NOT_FOUND` when creating analysis.

**Cause:** User doesn't have admin/editor access to the page.

**Solution:**

1. Verify user has page admin role in Facebook
2. Check page is not restricted or unpublished

---

### Rate Limiting

**Symptom:** Error code `4` or `17` from Facebook.

**Cause:** Too many API requests.

**Solution:**

1. Wait and retry (exponential backoff)
2. Reduce concurrent analyses
3. Cache page metadata

---

### Insights Not Available

**Symptom:** `insights28d: null` in analysis.

**Cause:** Page doesn't have enough activity for insights, or lacks `read_insights` permission.

**Solution:**

- This is expected for new/small pages
- Triggers use fallback evaluations

---

## Analysis Errors

### Analysis Timeout

**Symptom:** Error code `TIMEOUT`, analysis stuck at COLLECTING_DATA.

**Cause:** Facebook API slow or too much data.

**Solution:**

1. Increase `ANALYSIS_TIMEOUT_MS` env variable
2. Reduce `maxPosts` in collector options
3. Check Facebook API status

**Default timeout:** 60 seconds

---

### Decryption Error

**Symptom:** Error code `DECRYPTION_ERROR`.

**Cause:** `ENCRYPTION_KEY` changed after token was stored.

**Solution:**

1. User must disconnect and reconnect Facebook
2. Don't change `ENCRYPTION_KEY` in production

---

### No Posts Collected

**Symptom:** Analysis fails with "No posts collected".

**Cause:** Page has no posts in last 90 days, or posts are restricted.

**Solution:**

- Inform user page needs at least 5 posts for analysis

---

## Database Issues

### Prisma Client Not Generated

**Symptom:** TypeScript errors about missing Prisma types.

**Solution:**

```bash
npm run db:generate
# Restart TypeScript server in IDE (Cmd+Shift+P > Restart TS Server)
```

---

### Migration Mismatch

**Symptom:** Database schema doesn't match Prisma schema.

**Solution (development):**

```bash
npm run db:push
npm run db:generate
```

**Solution (production):**

```bash
npx prisma migrate deploy
```

---

### Connection Refused

**Symptom:** `ECONNREFUSED` when connecting to database.

**Solution:**

1. Check PostgreSQL is running:
   ```bash
   docker compose ps
   ```
2. Verify `DATABASE_URL` is correct
3. Check firewall/network settings

---

## Authentication Issues

### Session Not Found

**Symptom:** User appears logged out despite signing in.

**Cause:** `NEXTAUTH_SECRET` mismatch or session cookie issues.

**Solution:**

1. Ensure `NEXTAUTH_SECRET` is same across all instances
2. Check cookie domain matches app domain
3. Clear browser cookies and re-login

---

### OAuth Callback Error

**Symptom:** Error after Facebook redirect.

**Cause:** OAuth redirect URI mismatch.

**Solution:**

1. Check Facebook App settings
2. Valid OAuth Redirect URI must match:
   ```
   https://your-domain.com/api/auth/callback/facebook
   ```
3. Update `NEXTAUTH_URL` to match

---

## Email Issues

### Email Not Sending

**Symptom:** `sendReportEmail` returns error.

**Solution:**

1. Check SMTP configuration:
   ```bash
   SMTP_HOST=smtp.example.com
   SMTP_PORT=587
   SMTP_USER=user
   SMTP_PASSWORD=password
   ```
2. Test SMTP connection manually
3. Check spam folder

---

### Invalid Email Address

**Symptom:** Validation error on email send.

**Solution:**

- Ensure email passes Zod validation
- Check for typos in email address

---

## Development Issues

### Hot Reload Not Working

**Symptom:** Changes not reflected in browser.

**Solution:**

1. Restart dev server: `npm run dev`
2. Clear `.next` folder: `rm -rf .next`
3. Clear browser cache

---

### Type Errors After Schema Change

**Symptom:** TypeScript errors about Prisma types.

**Solution:**

```bash
npm run db:generate
# In VS Code: Cmd+Shift+P > "TypeScript: Restart TS Server"
```

---

### Build Failures

**Symptom:** `npm run build` fails.

**Debug:**

```bash
# Check for type errors
npm run type-check

# Check for lint errors
npm run lint

# Check for missing deps
npm ci
```

---

## Debug Logging

### Enable Debug Logs

```bash
# In .env.local
LOG_LEVEL=debug
```

### View Logs

```bash
# Development
npm run dev | npx pino-pretty

# Docker
docker compose logs -f app | jq '.'
```

### Specific Logger

```typescript
import { createLogger } from '@/lib/logging'
const log = createLogger('my-component')

log.debug({ data }, 'Debug info')
log.info({ result }, 'Operation completed')
log.error({ error }, 'Operation failed')
```

---

## Common Error Codes

| Code                   | HTTP | Description             | Fix                       |
| ---------------------- | ---- | ----------------------- | ------------------------- |
| UNAUTHORIZED           | 401  | Not logged in           | Sign in                   |
| FACEBOOK_NOT_CONNECTED | 400  | No FB account linked    | Connect Facebook          |
| PAGE_NOT_FOUND         | 400  | Can't access page       | Check page permissions    |
| TOKEN_EXPIRED          | 401  | Facebook token expired  | Re-login                  |
| PERMISSION_DENIED      | 403  | Missing FB permissions  | Re-authorize app          |
| COLLECTION_ERROR       | 500  | FB data fetch failed    | Check FB API, retry       |
| TIMEOUT                | 500  | Analysis took too long  | Retry or increase timeout |
| DECRYPTION_ERROR       | 500  | Token decryption failed | Reconnect Facebook        |
| INTERNAL_ERROR         | 500  | Unexpected error        | Check logs                |

---

## Getting Help

1. Check this guide first
2. Search existing issues on GitHub
3. Check logs for detailed error messages
4. Create issue with:
   - Error message
   - Steps to reproduce
   - Environment (dev/prod)
   - Relevant logs (redact sensitive data)
