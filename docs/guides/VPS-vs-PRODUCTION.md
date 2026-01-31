# Orchideo - VPS Development vs Production Comparison

**Porovnání VPS development a production prostředí**

**Datum:** 2026-01-31

---

## 🎯 Účel Dokumentu

Tento dokument vysvětluje **rozdíly** mezi VPS development a production prostředím projektu Orchideo, aby bylo jasné:

1. Jaké hodnoty jsou **stejné** v obou prostředích
2. Jaké hodnoty musí být **odlišné**
3. Proč tomu tak je
4. Jak spravovat oba prostředí současně

---

## 📊 Vysokoúrovňový Přehled

| Aspekt | VPS Dev | Production | Důvod Rozdílu |
|--------|---------|-----------|---------------|
| **Domain** | `orchideo.ppsys.eu` | `app.orchideo.ppsys.eu` | Separace prostředí |
| **Docker Compose** | `docker-compose.vps.yml` | `docker-compose.prod.yml` | Odlišná konfigurace |
| **Env File** | `.env.vps` | `.env.production` | Odlišné secrets |
| **NODE_ENV** | `development` | `production` | Build optimalizace |
| **Hot Reload** | ✅ Enabled | ❌ Disabled | Development feature |
| **Log Level** | `debug` | `info` / `warn` | Debug vs performance |
| **Storage** | Local (`./storage`) | Cloudflare R2 | Scalability |
| **Facebook App** | **SAME** | **SAME** | Shared production app |
| **Database** | Docker local | Docker nebo managed | Dev vs prod reliability |
| **SSL** | Let's Encrypt (Traefik) | Let's Encrypt (Traefik) | Same cert provider |

---

## 🔐 Environment Variables - Detailní Srovnání

### 1. MUSÍ být ODLIŠNÉ

Tyto hodnoty **NESMÍ** být stejné mezi VPS dev a production:

| Variable | VPS Dev Value | Production Value | Důvod |
|----------|---------------|------------------|-------|
| `NODE_ENV` | `development` | `production` | Build optimalizace, error handling |
| `NEXT_PUBLIC_ENV` | `development` | `production` | Frontend environment detection |
| `NEXTAUTH_SECRET` | `ePRrbkb...AdLw=` (dev) | `<UNIQUE>` (prod) | Bezpečnostní separace sessions |
| `POSTGRES_PASSWORD` | `5aedc92...59fad` (dev) | `<UNIQUE>` (prod) | Database security |
| `LOG_LEVEL` | `debug` | `info` nebo `warn` | Performance vs troubleshooting |
| `STORAGE_TYPE` | `local` | `r2` | Development vs production storage |
| `NEXTAUTH_URL` | `https://orchideo.ppsys.eu` | `https://app.orchideo.ppsys.eu` | Odlišná subdoména |
| `NEXT_PUBLIC_APP_URL` | `https://orchideo.ppsys.eu` | `https://app.orchideo.ppsys.eu` | Odlišná subdoména |

**⚠️ Kritické:**

- **NIKDY nepoužívat** production `NEXTAUTH_SECRET` ve VPS dev
- **NIKDY nepoužívat** production `POSTGRES_PASSWORD` ve VPS dev
- Pokud sdílíte databázi, **MUSÍTE** použít odlišná DB names

---

### 2. MUSÍ být STEJNÉ

Tyto hodnoty **MUSÍ** být identické mezi VPS dev a production:

| Variable | Shared Value | Důvod |
|----------|--------------|-------|
| `FACEBOOK_APP_ID` | `1605455470467424` | Stejná FB app pro dev i prod |
| `FACEBOOK_APP_SECRET` | `9651f82b...e6e1ee0` | Stejná FB app credentials |
| `FACEBOOK_CONFIG_ID` | `655031237668794` | Stejná FB config |
| `ENCRYPTION_KEY` | `9NV0ifa...ApkkJk=` | **KRITICKÉ** - šifrované FB tokeny v DB |
| `POSTMARK_API_TOKEN` | `c82f254...9172c9` | Stejný email provider |
| `POSTMARK_FROM_EMAIL` | `noreply@invix.cz` | Stejný sender email |
| `MAX_FEED_POSTS` | `300` | Konzistentní business logic |
| `MAX_FEED_PAGES` | `5` | Konzistentní business logic |
| `FEED_TIMEOUT_MS` | `10000` | Konzistentní timeouts |
| `ANALYSIS_TIMEOUT_MS` | `60000` | Konzistentní timeouts |
| `REPORT_EXPIRATION_DAYS` | `30` | Konzistentní business rules |

**🚨 KRITICKÉ - ENCRYPTION_KEY:**

```
ENCRYPTION_KEY MUSÍ být STEJNÝ v obou prostředích!

Důvod:
- Facebook page_access_token jsou šifrované v databázi
- Pokud se ENCRYPTION_KEY liší, VPS dev nebude moci dešifrovat tokeny z prod DB
- Změna ENCRYPTION_KEY invaliduje všechny existující tokeny v databázi

Nikdy neměňte ENCRYPTION_KEY po prvním deploymenty!
```

---

### 3. Mohou být ODLIŠNÉ (optional)

Tyto hodnoty mohou být odlišné podle potřeby:

| Variable | VPS Dev | Production | Poznámka |
|----------|---------|-----------|----------|
| `R2_*` | N/A (local storage) | Configured | R2 jen pro production |
| `SENTRY_DSN` | N/A | Configured | Error tracking jen pro prod |
| `GOOGLE_CLIENT_ID/SECRET` | Test app | Prod app | Pokud implementováno |

---

## 🏗️ Infrastructure Srovnání

### VPS Development

```yaml
# docker-compose.vps.yml
services:
  app:
    container_name: orchideo-app
    command: npm run dev  # Hot reload
    ports:
      - (none - Traefik proxy)
    volumes:
      - ./:/app:cached  # Source code mount
      - /app/node_modules  # Exclude
    environment:
      - NODE_ENV=development
    labels:
      # Traefik routing
      - traefik.http.routers.orchideo-dev.rule=Host(`orchideo.ppsys.eu`)
      # X-Robots-Tag: noindex (prevent search indexing)

  postgres:
    container_name: orchideo-postgres
    volumes:
      - postgres_data:/var/lib/postgresql/data
```

**Charakteristiky:**
- ✅ Hot reload enabled (npm run dev)
- ✅ Source code mounted (./:/app)
- ✅ Debug logging
- ✅ X-Robots-Tag noindex
- ❌ No health checks critical
- ❌ No production optimizations

### Production

```yaml
# docker-compose.prod.yml
services:
  app:
    container_name: orchideo-app-prod
    build:
      dockerfile: Dockerfile  # Production build
    ports:
      - "3000:3000"
    volumes:
      - ./storage:/app/storage  # Only storage
    environment:
      - NODE_ENV=production
    labels:
      # Traefik routing
      - traefik.http.routers.orchideo-prod.rule=Host(`app.orchideo.ppsys.eu`)
      # NO X-Robots-Tag (allow indexing)
    healthcheck:
      test: ['CMD', 'wget', '--spider', 'http://localhost:3000/api/health']

  postgres:
    container_name: orchideo-postgres-prod
    volumes:
      - postgres_data:/var/lib/postgresql/data
```

**Charakteristiky:**
- ✅ Production build (optimized)
- ✅ No source code mount
- ✅ Health checks enabled
- ✅ Allow search indexing
- ✅ Resource limits (memory, CPU)
- ❌ No hot reload

---

## 🗄️ Database Srovnání

### VPS Development

**Option:** Docker PostgreSQL (současný setup)

```yaml
postgres:
  image: postgres:16-alpine
  container_name: orchideo-postgres
  environment:
    POSTGRES_USER: orchideo
    POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    POSTGRES_DB: orchideo
  volumes:
    - postgres_data:/var/lib/postgresql/data
```

**Přístup:**
```bash
# Database URL
DATABASE_URL="postgresql://orchideo:PASSWORD@postgres:5432/orchideo"

# Direct access
docker exec -it orchideo-postgres psql -U orchideo -d orchideo
```

**Backup:**
- Manuální: `docker exec orchideo-postgres pg_dump ...`
- Retention: 7-14 dní

### Production

**Option A:** Docker PostgreSQL (stejný jako dev)

**Option B:** Managed PostgreSQL (doporučeno)

```env
# AWS RDS / DigitalOcean / Azure
DATABASE_URL="postgresql://user:pass@host.region.provider.com:5432/orchideo?sslmode=require"
```

**Výhody Managed DB:**
- ✅ Automatické backupy (point-in-time recovery)
- ✅ High availability
- ✅ Automatic failover
- ✅ Monitoring & alerts
- ✅ Easy scaling

**Backup:**
- Automatický: Provider-managed
- Retention: 30+ dní
- Point-in-time recovery: 7 dní

---

## 📦 Storage Srovnání

### VPS Development

```env
STORAGE_TYPE=local
STORAGE_LOCAL_PATH=./storage
```

**Directory:**
```
/home/app/projects/orchideo/storage/
├── reports/
│   └── user_123_page_456_20260131.pdf
└── temp/
```

**Charakteristiky:**
- ✅ Jednoduché
- ✅ Rychlé pro development
- ✅ Žádné additional costs
- ❌ Není scalable
- ❌ Žádný CDN
- ❌ Backup jen s server backup

### Production

```env
STORAGE_TYPE=r2
R2_ACCOUNT_ID=abc123
R2_ENDPOINT=https://abc123.r2.cloudflarestorage.com
R2_ACCESS_KEY_ID=xxx
R2_SECRET_ACCESS_KEY=yyy
R2_BUCKET_NAME=orchideo-pdfs-prod
R2_PUBLIC_URL=https://cdn.orchideo.ppsys.eu
```

**Charakteristiky:**
- ✅ Scalable
- ✅ CDN enabled
- ✅ Geograficky distribuované
- ✅ Automatické backupy
- ✅ Low cost ($0.015/GB)
- ❌ Složitější setup
- ❌ Monthly costs

---

## 🚀 Deployment Workflow Srovnání

### VPS Development

**Git workflow:**
```bash
git checkout stage
git pull origin stage
# Docker automatically rebuilds on code change (hot reload)
```

**Manual restart:**
```bash
cd /home/app/projects/orchideo
docker compose --env-file .env.vps -f docker-compose.vps.yml restart app
```

**Deployment frequency:** Continuous (on every git push to stage)

### Production

**Git workflow:**
```bash
git checkout main
git pull origin main
docker compose --env-file .env.production -f docker-compose.prod.yml build
docker compose --env-file .env.production -f docker-compose.prod.yml up -d
```

**Deployment frequency:** Scheduled releases (weekly/biweekly)

**Release process:**
1. Merge `stage` → `main`
2. Tag release: `git tag v1.2.3`
3. Build Docker image
4. Run migrations
5. Deploy
6. Smoke test
7. Monitor

---

## 🔍 Monitoring & Logging Srovnání

### VPS Development

**Logging:**
```env
LOG_LEVEL=debug
```

**Output:**
```json
{
  "level": 20,
  "time": "2026-01-31T14:00:00.000Z",
  "msg": "Database query executed",
  "query": "SELECT * FROM users WHERE id = $1",
  "duration": 3.5
}
```

**Monitoring:**
- Manual log checking: `docker logs orchideo-app -f`
- No automated alerts
- No metrics aggregation

### Production

**Logging:**
```env
LOG_LEVEL=info
```

**Output:**
```json
{
  "level": 30,
  "time": "2026-01-31T14:00:00.000Z",
  "msg": "Request completed",
  "method": "GET",
  "url": "/api/analysis",
  "duration": 234
}
```

**Monitoring:**
- Automated log aggregation (optional: Loki, CloudWatch)
- Error tracking: Sentry
- Metrics: Prometheus + Grafana
- Uptime monitoring: UptimeRobot
- Alerts: Email/Slack on critical errors

---

## 🛡️ Security Srovnání

### VPS Development

**Security Posture:**
- ⚠️ `X-Robots-Tag: noindex, nofollow` (prevent search indexing)
- ⚠️ Development secrets (less critical)
- ⚠️ Shared server with other dev projects
- ✅ HTTPS enforced
- ✅ Security headers (HSTS, X-Frame-Options)

**Access Control:**
- SSH access: Development team
- Database access: Docker container + admins
- Facebook App: Development Mode (<100 users)

### Production

**Security Posture:**
- ✅ Production secrets (high security)
- ✅ Dedicated server/resources
- ✅ HTTPS enforced
- ✅ Security headers
- ✅ Rate limiting (optional)
- ✅ WAF (optional)

**Access Control:**
- SSH access: Limited (ops team only)
- Database access: Limited (read-only replicas)
- Facebook App: Live Mode (public access)

---

## 📝 Configuration Files Srovnání

### VPS Development

**Files:**
```
/home/app/projects/orchideo/
├── .env.vps                      # Environment variables
├── docker-compose.vps.yml        # Docker Compose config
├── Dockerfile.dev                # Development Dockerfile
└── QUICK-START.sh                # Helper script
```

**Key Config:**
```yaml
# docker-compose.vps.yml
command: npm run dev
volumes:
  - ./:/app:cached  # Source mount
environment:
  - NODE_ENV=development
labels:
  - traefik.http.routers.orchideo-dev.rule=Host(`orchideo.ppsys.eu`)
```

### Production

**Files:**
```
/opt/orchideo/
├── .env.production               # Environment variables
├── docker-compose.prod.yml       # Docker Compose config
├── Dockerfile                    # Production Dockerfile
└── backup-db.sh                  # Backup script
```

**Key Config:**
```yaml
# docker-compose.prod.yml
build:
  dockerfile: Dockerfile
volumes:
  - ./storage:/app/storage  # Only storage mount
environment:
  - NODE_ENV=production
labels:
  - traefik.http.routers.orchideo-prod.rule=Host(`app.orchideo.ppsys.eu`)
healthcheck:
  test: ['CMD', 'wget', '--spider', 'http://localhost:3000/api/health']
```

---

## 🔄 Synchronizace Dat mezi Prostředími

### Shared Database Scenario

**⚠️ Pokud VPS dev a production sdílejí databázi:**

```env
# CRITICAL: ENCRYPTION_KEY MUSÍ být stejný!
ENCRYPTION_KEY="9NV0ifaDaw1ZobhavkvXDXE7t4MnOp7/gdAUzApkkJk="
```

**Důvod:**
- Facebook `page_access_token` jsou šifrované
- Dev i prod musí používat stejný klíč pro dešifrování
- Změna klíče = invaliduje všechny tokeny

### Separate Database Scenario

**VPS Dev:**
```env
DATABASE_URL="postgresql://orchideo:DEV_PASS@postgres:5432/orchideo"
```

**Production:**
```env
DATABASE_URL="postgresql://orchideo:PROD_PASS@prod-db.amazonaws.com:5432/orchideo"
```

**Data synchronizace (optional):**

```bash
# Production → VPS Dev (pro testing s real data)
pg_dump -h prod-db.amazonaws.com -U orchideo orchideo | \
  docker exec -i orchideo-postgres psql -U orchideo -d orchideo_dev
```

**⚠️ Sanitize production data před import do dev!**

---

## 🎯 Best Practices

### VPS Development

1. **Never use production secrets** v development
2. **Use local storage** místo R2 (rychlejší, levnější)
3. **Enable debug logging** pro troubleshooting
4. **Use hot reload** pro rychlejší development
5. **Test migrations** před production deployment
6. **Use X-Robots-Tag noindex** pro zabránění indexování

### Production

1. **Use unique secrets** odlišné od development
2. **Use managed database** pro reliability
3. **Use R2 storage** pro scalability
4. **Enable health checks** pro monitoring
5. **Set log level to info/warn** pro performance
6. **Enable automated backups** (daily)
7. **Monitor error rates** (Sentry, CloudWatch)
8. **Use resource limits** (CPU, memory)

---

## 📊 Quick Reference Table

| Feature | VPS Dev | Production |
|---------|---------|-----------|
| **Domain** | orchideo.ppsys.eu | app.orchideo.ppsys.eu |
| **NODE_ENV** | development | production |
| **Hot Reload** | ✅ Yes | ❌ No |
| **Source Mount** | ✅ Yes | ❌ No |
| **Log Level** | debug | info/warn |
| **Storage** | local | R2 |
| **Database** | Docker local | Managed DB |
| **Health Checks** | ❌ Optional | ✅ Required |
| **Monitoring** | Manual | Automated |
| **Backups** | Manual | Automated |
| **X-Robots** | noindex | (none) |
| **Facebook App** | **SAME** | **SAME** |
| **ENCRYPTION_KEY** | **SAME** | **SAME** |

---

## 🚨 Common Pitfalls

### ❌ WRONG: Using production NEXTAUTH_SECRET in dev

```env
# VPS .env.vps - WRONG!
NEXTAUTH_SECRET="production_secret_here"  # ❌ Security risk
```

**Fix:** Use unique secret per environment

---

### ❌ WRONG: Different ENCRYPTION_KEY in dev vs prod

```env
# VPS .env.vps
ENCRYPTION_KEY="key_dev_123"  # ❌ Won't decrypt prod tokens

# Production .env.production
ENCRYPTION_KEY="key_prod_456"  # ❌ Won't decrypt dev tokens
```

**Fix:** Use SAME encryption key in both

---

### ❌ WRONG: Using local storage in production

```env
# Production .env.production - WRONG for scale!
STORAGE_TYPE=local  # ❌ Not scalable
```

**Fix:** Use R2 for production

---

### ❌ WRONG: Debug logging in production

```env
# Production .env.production - WRONG!
LOG_LEVEL=debug  # ❌ Performance impact
```

**Fix:** Use `info` or `warn` in production

---

## ✅ Validation Script

**Verify your configuration:**

```bash
#!/bin/bash
# validate-env.sh

echo "=== Validating VPS Dev vs Production Config ==="

# Check NODE_ENV differs
VPS_NODE_ENV=$(grep "^NODE_ENV=" .env.vps | cut -d'=' -f2)
PROD_NODE_ENV=$(grep "^NODE_ENV=" .env.production | cut -d'=' -f2)

if [ "$VPS_NODE_ENV" = "development" ] && [ "$PROD_NODE_ENV" = "production" ]; then
  echo "✅ NODE_ENV: Different (correct)"
else
  echo "❌ NODE_ENV: Not different (WRONG)"
fi

# Check ENCRYPTION_KEY is same
VPS_ENC=$(grep "^ENCRYPTION_KEY=" .env.vps | cut -d'=' -f2-)
PROD_ENC=$(grep "^ENCRYPTION_KEY=" .env.production | cut -d'=' -f2-)

if [ "$VPS_ENC" = "$PROD_ENC" ]; then
  echo "✅ ENCRYPTION_KEY: Same (correct)"
else
  echo "❌ ENCRYPTION_KEY: Different (WRONG - will break token decryption!)"
fi

# Check NEXTAUTH_SECRET differs
VPS_AUTH=$(grep "^NEXTAUTH_SECRET=" .env.vps | cut -d'=' -f2-)
PROD_AUTH=$(grep "^NEXTAUTH_SECRET=" .env.production | cut -d'=' -f2-)

if [ "$VPS_AUTH" != "$PROD_AUTH" ]; then
  echo "✅ NEXTAUTH_SECRET: Different (correct)"
else
  echo "⚠️ NEXTAUTH_SECRET: Same (SECURITY RISK)"
fi

echo "=== Validation Complete ==="
```

---

**Last Updated:** 2026-01-31
**Version:** 1.0
**Reviewers:** DevOps Team
