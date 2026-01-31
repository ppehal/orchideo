# Orchideo - Production Deployment Guide

**Kompletní průvodce pro nasazení Orchideo do produkčního prostředí**

**Datum vytvoření:** 2026-01-31
**Platforma:** Docker + PostgreSQL + Traefik/nginx
**Prostředí:** Production

---

## 📋 Obsah

1. [Přehled](#přehled)
2. [Předpoklady](#předpoklady)
3. [Příprava Environment Variables](#příprava-environment-variables)
4. [Databázový Setup](#databázový-setup)
5. [Docker Build & Deploy](#docker-build--deploy)
6. [Reverse Proxy Setup (Traefik)](#reverse-proxy-setup-traefik)
7. [Facebook App Konfigurace](#facebook-app-konfigurace)
8. [Cloudflare R2 Storage](#cloudflare-r2-storage)
9. [Validace Nasazení](#validace-nasazení)
10. [Monitoring & Logs](#monitoring--logs)
11. [Troubleshooting](#troubleshooting)
12. [Rollback Postup](#rollback-postup)

---

## Přehled

**Orchideo** je Next.js aplikace pro analýzu Facebook stránek, nasazená pomocí Docker kontejnerů s PostgreSQL databází.

### Architektura

```
Internet
   ↓
Traefik (SSL/TLS)
   ↓
orchideo-app-prod (Next.js kontejner)
   ↓
orchideo-postgres-prod (PostgreSQL 16)
```

### Klíčové Komponenty

- **Next.js 16** (React 19, App Router)
- **PostgreSQL 16** (databáze uživatelů, stránek, reportů)
- **Prisma ORM** (database migrations)
- **NextAuth v5** (Facebook OAuth)
- **Puppeteer + Chromium** (PDF export)
- **Cloudflare R2** (PDF storage - Phase 2)

---

## Předpoklady

### Software Requirements

- [x] **Docker** 24.0+ & **Docker Compose** 2.20+
- [x] **Git** 2.40+
- [x] **Node.js** 20+ (pro lokální testování)
- [x] **PostgreSQL** 16+ (nebo Docker kontejner)

### Účty & Credentials

- [x] **Facebook Developer Account**
  - App ID: `1605455470467424` (production)
  - App permissions schválené pro production
- [x] **Postmark Account**
  - API token pro odesílání emailů
- [x] **Cloudflare Account** (Phase 2)
  - R2 bucket pro PDF storage
- [x] **Domain & SSL**
  - Domain: `orchideo.ppsys.eu` (nebo vlastní)
  - SSL certifikát (Let's Encrypt přes Traefik)

### Server Requirements

**Minimální:**
- 2 vCPU
- 4 GB RAM
- 20 GB SSD

**Doporučené:**
- 4 vCPU
- 8 GB RAM
- 50 GB SSD

---

## Příprava Environment Variables

### 1. Vytvořit .env.production

```bash
cd /path/to/orchideo
cp .env.production.template .env.production
```

### 2. Vyplnit Mandatory Values

Otevřít `.env.production` a upravit:

```env
# Database
POSTGRES_PASSWORD="<STRONG_RANDOM_PASSWORD>"
DATABASE_URL="postgresql://orchideo:<PASSWORD>@postgres:5432/orchideo"

# NextAuth
NEXTAUTH_SECRET="<GENERATE_NEW>"  # openssl rand -base64 32

# Facebook (use production credentials)
FACEBOOK_APP_SECRET="9651f82bfc6d439209d856fffe6e1ee0"

# Encryption (CRITICAL: use SAME as VPS dev)
ENCRYPTION_KEY="9NV0ifaDaw1ZobhavkvXDXE7t4MnOp7/gdAUzApkkJk="

# Postmark
POSTMARK_API_TOKEN="c82f2544-e919-4657-b9c8-5481869172c9"
```

### 3. Vygenerovat Secrets

```bash
# NEXTAUTH_SECRET (unique per environment)
openssl rand -base64 32

# POSTGRES_PASSWORD (strong random password)
openssl rand -base64 32 | tr -d "=+/" | cut -c1-32
```

### 4. Validovat .env.production

```bash
# Zkontrolovat žádný CHANGE_ME není přítomen
grep -n "CHANGE_ME" .env.production
# Očekáváno: žádný výstup

# Zkontrolovat mandatory variables jsou nastaveny
for var in POSTGRES_PASSWORD NEXTAUTH_SECRET FACEBOOK_APP_SECRET ENCRYPTION_KEY; do
  grep "^$var=" .env.production || echo "Missing: $var"
done
```

---

## Databázový Setup

### Option A: Docker PostgreSQL (Doporučeno pro začátek)

**Výhody:**
- Jednoduchý setup
- Zahrnutý v docker-compose.prod.yml
- Automatické backupy pomocí volumes

**Nevýhody:**
- Nutné spravovat backupy ručně
- Single point of failure

**Setup:**

```bash
# 1. Start pouze PostgreSQL kontejneru
docker compose --env-file .env.production -f docker-compose.prod.yml up -d postgres

# 2. Počkat na healthy status
docker compose --env-file .env.production -f docker-compose.prod.yml ps

# 3. Test připojení
docker exec orchideo-postgres-prod psql -U orchideo -d orchideo -c "SELECT version();"
```

### Option B: Managed PostgreSQL (Doporučeno pro production)

**Výhody:**
- Automatické backupy
- High availability
- Managed updates & scaling

**Providers:**
- AWS RDS
- DigitalOcean Managed Databases
- Azure Database for PostgreSQL
- Google Cloud SQL

**Setup:**

```bash
# 1. Vytvořit managed PostgreSQL instance (přes provider UI)
# 2. Povolit IP adresu serveru v firewall rules
# 3. Získat connection string
# 4. Aktualizovat .env.production:

DATABASE_URL="postgresql://user:password@host.region.provider.com:5432/orchideo?sslmode=require"

# 5. Odstranit postgres service z docker-compose.prod.yml
```

### Prisma Migrations

```bash
# 1. Generate Prisma client (locally nebo v kontejneru)
npm run db:generate

# 2. Deploy migrations to production database
npx prisma migrate deploy

# NEBO v Docker kontejneru:
docker compose --env-file .env.production -f docker-compose.prod.yml run --rm app npx prisma migrate deploy

# 3. (Optional) Seed initial data
docker compose --env-file .env.production -f docker-compose.prod.yml run --rm app npx prisma db seed
```

### Database Backups

**Automatický backup script:**

```bash
#!/bin/bash
# /opt/orchideo/backup-db.sh

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/opt/orchideo/backups"
CONTAINER="orchideo-postgres-prod"

mkdir -p $BACKUP_DIR

docker exec $CONTAINER pg_dump -U orchideo orchideo | gzip > "$BACKUP_DIR/orchideo_$DATE.sql.gz"

# Keep last 30 days
find $BACKUP_DIR -name "orchideo_*.sql.gz" -mtime +30 -delete

echo "Backup created: orchideo_$DATE.sql.gz"
```

**Crontab (daily at 2 AM):**

```bash
0 2 * * * /opt/orchideo/backup-db.sh >> /var/log/orchideo-backup.log 2>&1
```

---

## Docker Build & Deploy

### 1. Clone Repository

```bash
cd /opt
git clone https://github.com/your-org/orchideo.git
cd orchideo
git checkout main  # nebo production branch
```

### 2. Build Docker Image

```bash
# Build production image
docker compose --env-file .env.production -f docker-compose.prod.yml build

# Verify image was created
docker images | grep orchideo
```

### 3. Deploy Aplikace

```bash
# Start all services
docker compose --env-file .env.production -f docker-compose.prod.yml up -d

# Check status
docker compose --env-file .env.production -f docker-compose.prod.yml ps

# Expected output:
# NAME                     STATUS        PORTS
# orchideo-app-prod        Up (healthy)  0.0.0.0:3000->3000/tcp
# orchideo-postgres-prod   Up (healthy)  5432/tcp
```

### 4. Verify Logs

```bash
# Check application logs
docker compose --env-file .env.production -f docker-compose.prod.yml logs -f app

# Expected output:
# orchideo-app-prod  | ▲ Next.js 16.1.6
# orchideo-app-prod  | - Local:        http://localhost:3000
# orchideo-app-prod  | ✓ Ready in XXXXms
```

---

## Reverse Proxy Setup (Traefik)

### Současný Setup (VPS orchideo.ppsys.eu)

VPS již používá Traefik pro SSL/TLS. Orchideo production bude na **stejném VPS** jako development, ale s **odlišnou subdoménou nebo portem**.

### Option A: Production na Subdoméně

**Domain:** `app.orchideo.ppsys.eu` (production)
**Domain:** `orchideo.ppsys.eu` (development)

**docker-compose.prod.yml labels:**

```yaml
app:
  labels:
    - traefik.enable=true
    - traefik.docker.network=srv_default
    - traefik.http.services.orchideo-prod.loadbalancer.server.port=3000

    # Router
    - traefik.http.routers.orchideo-prod.rule=Host(`app.orchideo.ppsys.eu`)
    - traefik.http.routers.orchideo-prod.entrypoints=websecure
    - traefik.http.routers.orchideo-prod.tls=true
    - traefik.http.routers.orchideo-prod.tls.certresolver=letscloudflare
    - traefik.http.routers.orchideo-prod.service=orchideo-prod

    # Security headers
    - traefik.http.middlewares.orchideo-prod-sec.headers.stsSeconds=31536000
    - traefik.http.middlewares.orchideo-prod-sec.headers.stsIncludeSubdomains=true
    - traefik.http.middlewares.orchideo-prod-sec.headers.frameDeny=true
    - traefik.http.middlewares.orchideo-prod-sec.headers.contentTypeNosniff=true

    # NO X-Robots-Tag for production (allow indexing)

    # Compression
    - traefik.http.middlewares.orchideo-prod-compress.compress=true

    # Middleware chain
    - traefik.http.middlewares.orchideo-prod-chain.chain.middlewares=orchideo-prod-sec,orchideo-prod-compress
    - traefik.http.routers.orchideo-prod.middlewares=orchideo-prod-chain@docker

  networks:
    - orchideo_internal
    - srv_default  # Traefik network
```

### Option B: Production na Samostatném Serveru

Pokud production bude na **jiném serveru**, použít nginx nebo standalone Traefik:

**nginx config (`/etc/nginx/sites-available/orchideo`):**

```nginx
server {
    listen 443 ssl http2;
    server_name app.orchideo.ppsys.eu;

    ssl_certificate /etc/letsencrypt/live/app.orchideo.ppsys.eu/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/app.orchideo.ppsys.eu/privkey.pem;

    # Security headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "DENY" always;
    add_header X-Content-Type-Options "nosniff" always;

    # Proxy to Next.js
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Logging
    access_log /var/log/nginx/orchideo-access.log;
    error_log /var/log/nginx/orchideo-error.log;
}
```

---

## Facebook App Konfigurace

### 1. Production App Settings

**Facebook Developer Console:** https://developers.facebook.com/apps/1605455470467424

### 2. Basic Settings

**Settings → Basic:**

- **App Domains:** `app.orchideo.ppsys.eu` (nebo `orchideo.ppsys.eu`)
- **Privacy Policy URL:** `https://app.orchideo.ppsys.eu/privacy`
- **Terms of Service URL:** `https://app.orchideo.ppsys.eu/terms`
- **App Icon:** Upload 1024x1024 logo

### 3. Facebook Login Settings

**Products → Facebook Login → Settings:**

- **Valid OAuth Redirect URIs:**
  ```
  https://app.orchideo.ppsys.eu/api/auth/callback/facebook
  https://orchideo.ppsys.eu/api/auth/callback/facebook
  ```

- **Client OAuth Login:** ✅ Yes
- **Web OAuth Login:** ✅ Yes
- **Use Strict Mode for Redirect URIs:** ✅ Yes

### 4. Permissions (App Review Required)

Pro production je nutné projít **App Review** pro tyto permissions:

| Permission | Důvod | Status |
|------------|-------|--------|
| `pages_show_list` | Seznam stránek uživatele | ⚠️ Vyžaduje review |
| `pages_read_engagement` | Metriky zapojení (likes, shares) | ⚠️ Vyžaduje review |
| `pages_read_user_content` | Obsah postů | ⚠️ Vyžaduje review |
| `read_insights` | Insights & analytics | ⚠️ Vyžaduje review |

### 5. App Review Proces

**Příprava:**

1. **Vytvořit demo video** (max 5 minut):
   - Login flow
   - Vybraní Facebook stránky
   - Analýza a zobrazení reportu
   - Důraz na využití každé permission

2. **Vyplnit Business Verification:**
   - Business name: INVIX s.r.o.
   - Business address
   - Business documents (výpis z OR)

3. **Submit for Review:**
   - Dashboard → App Review → Permissions and Features
   - Request permissions
   - Upload demo video
   - Explain usage: "Orchideo provides Facebook Page analytics for business owners..."

**Timeline:** 3-7 dnů

**Fallback:** Pokud review selhá, použít **Development Mode** s test users (max 100 uživatelů).

### 6. Development Mode vs Live Mode

**Development Mode:**
- ✅ Funguje pro admins, developers, testers
- ❌ Nedostupné pro veřejnost
- Max 100 test users

**Live Mode:**
- ✅ Veřejně dostupné
- ✅ Neomezený počet uživatelů
- ⚠️ Vyžaduje App Review

**Přepnutí do Live Mode:**

Dashboard → Settings → Basic → **App Mode** → Switch to Live

---

## Cloudflare R2 Storage

### 1. Vytvoření R2 Bucket

**Cloudflare Dashboard:**

1. R2 → Create Bucket
2. Bucket name: `orchideo-pdfs-prod`
3. Location hint: Western Europe (nebo nejbližší)

### 2. Vytvoření API Token

**R2 → Manage R2 API Tokens → Create API Token:**

- **Token name:** `orchideo-prod-token`
- **Permissions:** Object Read & Write
- **Bucket:** `orchideo-pdfs-prod`

**Save credentials:**
```
Account ID: <ACCOUNT_ID>
Access Key ID: <ACCESS_KEY_ID>
Secret Access Key: <SECRET_ACCESS_KEY>
```

### 3. Public Access (Optional)

**Pro veřejné PDF URLs:**

R2 → `orchideo-pdfs-prod` → Settings → **Public Access:**

- Connect custom domain: `cdn.orchideo.ppsys.eu`
- DNS: Přidat CNAME záznam `cdn` → `<bucket>.r2.cloudflarestorage.com`

### 4. Update .env.production

```env
STORAGE_TYPE=r2
R2_ACCOUNT_ID=<ACCOUNT_ID>
R2_ENDPOINT=https://<ACCOUNT_ID>.r2.cloudflarestorage.com
R2_ACCESS_KEY_ID=<ACCESS_KEY_ID>
R2_SECRET_ACCESS_KEY=<SECRET_ACCESS_KEY>
R2_BUCKET_NAME=orchideo-pdfs-prod
R2_PUBLIC_URL=https://cdn.orchideo.ppsys.eu
```

### 5. Test R2 Upload

```bash
# V production kontejneru
docker exec -it orchideo-app-prod npm run test-r2

# Nebo manuálně curl:
docker exec -it orchideo-app-prod sh
curl -X PUT https://<ACCOUNT_ID>.r2.cloudflarestorage.com/orchideo-pdfs-prod/test.txt \
  -H "Authorization: AWS4-HMAC-SHA256 ..." \
  -d "test content"
```

---

## Validace Nasazení

### Pre-Deployment Checklist

```bash
# 1. Verify .env.production has all secrets
grep -E "^(POSTGRES_PASSWORD|NEXTAUTH_SECRET|FACEBOOK_APP_SECRET|ENCRYPTION_KEY)=" .env.production | wc -l
# Expected: 4

# 2. Verify no CHANGE_ME placeholders
grep "CHANGE_ME" .env.production
# Expected: no output

# 3. Verify Docker Compose config
docker compose --env-file .env.production -f docker-compose.prod.yml config | head -50

# 4. Verify Dockerfile builds
docker compose --env-file .env.production -f docker-compose.prod.yml build --no-cache

# 5. Verify database is accessible
docker compose --env-file .env.production -f docker-compose.prod.yml up -d postgres
docker exec orchideo-postgres-prod psql -U orchideo -d orchideo -c "SELECT 1;"
```

### Post-Deployment Validation

```bash
# 1. Verify containers are running
docker compose --env-file .env.production -f docker-compose.prod.yml ps
# Expected: All "Up (healthy)"

# 2. Verify environment variables in container
docker exec orchideo-app-prod env | grep -E "^(NODE_ENV|FACEBOOK_APP_ID|ENCRYPTION_KEY)" | sort

# Expected:
# ENCRYPTION_KEY=9NV0ifaDaw1ZobhavkvXDXE7t4MnOp7/gdAUzApkkJk=
# FACEBOOK_APP_ID=1605455470467424
# NODE_ENV=production

# 3. Test HTTPS access
curl -I https://app.orchideo.ppsys.eu
# Expected: HTTP/2 200

# 4. Test health endpoint
curl https://app.orchideo.ppsys.eu/api/health
# Expected: {"status":"healthy"}

# 5. Check application logs
docker compose --env-file .env.production -f docker-compose.prod.yml logs app --tail 50
# Expected: No errors

# 6. Test Facebook OAuth flow (manual)
# Open: https://app.orchideo.ppsys.eu
# Click: Login with Facebook
# Expected: Redirect to FB → back to app → logged in

# 7. Test database connection
docker exec orchideo-app-prod npx prisma db pull
# Expected: No errors

# 8. Verify Prisma migrations
docker exec orchideo-app-prod npx prisma migrate status
# Expected: "Database schema is up to date!"
```

### Smoke Tests

**Manual testing:**

1. ✅ Homepage loads (`https://app.orchideo.ppsys.eu`)
2. ✅ Facebook login works
3. ✅ Dashboard displays after login
4. ✅ Page selection works
5. ✅ Analysis runs successfully
6. ✅ Report displays correctly
7. ✅ PDF export works (Phase 2)
8. ✅ Email notifications sent (if enabled)

---

## Monitoring & Logs

### Application Logs

```bash
# Real-time logs
docker compose --env-file .env.production -f docker-compose.prod.yml logs -f app

# Last 100 lines
docker compose --env-file .env.production -f docker-compose.prod.yml logs app --tail 100

# Filter by log level (using jq)
docker compose --env-file .env.production -f docker-compose.prod.yml logs app --tail 1000 | jq 'select(.level >= 40)'
# level 40 = warn, 50 = error
```

### Disk Usage Monitoring

```bash
# Check storage volume size
docker system df -v | grep orchideo

# Check PostgreSQL data size
docker exec orchideo-postgres-prod du -sh /var/lib/postgresql/data

# Check PDF storage (if local)
du -sh /opt/orchideo/storage
```

### Performance Monitoring

**Option A: Docker Stats**

```bash
docker stats orchideo-app-prod orchideo-postgres-prod
```

**Option B: Prometheus + Grafana (Advanced)**

TODO: Add Prometheus metrics export

### Error Tracking (Optional)

**Sentry Integration:**

```env
# .env.production
SENTRY_DSN=https://xxxxx@sentry.io/xxxxx
```

**Next.js config:**

```typescript
// next.config.js
const { withSentryConfig } = require('@sentry/nextjs');

module.exports = withSentryConfig({
  // existing config
});
```

---

## Troubleshooting

### Problem: Container Won't Start

**Symptom:**
```
orchideo-app-prod exited with code 1
```

**Diagnosis:**
```bash
docker compose --env-file .env.production -f docker-compose.prod.yml logs app
```

**Common Causes:**

1. **Missing environment variable:**
   ```
   Error: NEXTAUTH_SECRET is not set
   ```
   **Fix:** Add to `.env.production`

2. **Database connection failed:**
   ```
   Error: P1001: Can't reach database server
   ```
   **Fix:**
   - Check `DATABASE_URL` is correct
   - Verify postgres container is healthy
   - Check network connectivity

3. **Prisma client not generated:**
   ```
   Error: Cannot find module '@prisma/client'
   ```
   **Fix:**
   ```bash
   docker compose --env-file .env.production -f docker-compose.prod.yml run --rm app npm run db:generate
   docker compose --env-file .env.production -f docker-compose.prod.yml restart app
   ```

### Problem: HTTPS Returns 502 Bad Gateway

**Symptom:**
```bash
curl -I https://app.orchideo.ppsys.eu
# HTTP/2 502
```

**Diagnosis:**
```bash
# Check Traefik logs
docker logs traefik --tail 50

# Check app is listening on port 3000
docker exec orchideo-app-prod netstat -tlnp | grep 3000
```

**Fix:**
- Verify app container is healthy
- Check Traefik labels in docker-compose.prod.yml
- Verify network `srv_default` exists

### Problem: Facebook OAuth Fails

**Symptom:**
```
Error: redirect_uri_mismatch
```

**Fix:**
1. Facebook Developer Console → App → Facebook Login → Settings
2. Verify **Valid OAuth Redirect URIs** contains:
   ```
   https://app.orchideo.ppsys.eu/api/auth/callback/facebook
   ```
3. Save and wait 1-2 minutes for propagation

### Problem: Database Migration Fails

**Symptom:**
```
Error: P3009: migrate.lock is locked
```

**Fix:**
```bash
# Unlock migrations
docker exec orchideo-postgres-prod psql -U orchideo -d orchideo -c "DELETE FROM _prisma_migrations WHERE migration_name = 'migration-lock';"

# Retry
docker compose --env-file .env.production -f docker-compose.prod.yml run --rm app npx prisma migrate deploy
```

### Problem: High Memory Usage

**Symptom:**
```bash
docker stats orchideo-app-prod
# MEM USAGE: 1.5 GiB / 2 GiB (75%)
```

**Diagnosis:**
```bash
# Check for memory leaks
docker exec orchideo-app-prod node --expose-gc -e "console.log(process.memoryUsage())"
```

**Fix:**
- Increase container memory limit in docker-compose.prod.yml:
  ```yaml
  app:
    deploy:
      resources:
        limits:
          memory: 4G
  ```
- Restart container

---

## Rollback Postup

### Scenario 1: Rollback k Předchozí Verzi Aplikace

```bash
# 1. Identify current version
docker images | grep orchideo

# 2. Pull previous version (if using registry)
docker pull registry.example.com/orchideo:v1.2.3

# 3. Update docker-compose.prod.yml
# Change image tag or rebuild from previous git commit

# 4. Stop current version
docker compose --env-file .env.production -f docker-compose.prod.yml down

# 5. Start previous version
docker compose --env-file .env.production -f docker-compose.prod.yml up -d

# 6. Verify
curl -I https://app.orchideo.ppsys.eu
```

### Scenario 2: Rollback Database Migration

**⚠️ DANGER: Data loss možný!**

```bash
# 1. Restore database from backup
docker exec -i orchideo-postgres-prod psql -U orchideo -d orchideo < /opt/orchideo/backups/orchideo_20260130_020000.sql.gz

# 2. Verify migration status
docker exec orchideo-app-prod npx prisma migrate status

# 3. Rollback to specific migration
# Prisma doesn't support rollback - restore full backup instead
```

### Scenario 3: Emergency Shutdown

```bash
# Stop all services immediately
docker compose --env-file .env.production -f docker-compose.prod.yml down

# Verify stopped
docker ps | grep orchideo

# Display maintenance page (configure in reverse proxy)
```

---

## Production Checklist

### Pre-Deployment

- [ ] `.env.production` vytvořen a validován
- [ ] Všechny secrets vygenerovány (NEXTAUTH_SECRET, POSTGRES_PASSWORD)
- [ ] Facebook App v **Live Mode** (nebo Development s test users)
- [ ] Facebook OAuth redirect URI nakonfigurováno
- [ ] PostgreSQL databáze připravena (Docker nebo managed)
- [ ] Cloudflare R2 bucket vytvořen (Phase 2)
- [ ] Domain DNS nakonfigurována
- [ ] SSL certifikát funguje
- [ ] Backup strategie nastavena

### Deployment

- [ ] Docker image úspěšně built
- [ ] Prisma migrations deployed
- [ ] Kontejnery jsou **Up (healthy)**
- [ ] Environment variables správně nastaveny v kontejneru
- [ ] HTTPS vrací 200 OK
- [ ] Health endpoint funguje

### Post-Deployment

- [ ] Facebook login funguje
- [ ] Analýza stránky funguje
- [ ] Report se zobrazuje
- [ ] PDF export funguje (Phase 2)
- [ ] Email notifikace fungují
- [ ] Logs neobsahují errors
- [ ] Monitoring nakonfigurován
- [ ] Backupy fungují (test restore)

### Documentation

- [ ] Production credentials uloženy v password manageru
- [ ] Runbook aktualizován
- [ ] Team informován o nasazení
- [ ] Rollback postup otestován

---

## Kontakty & Podpora

**Project Owner:** INVIX s.r.o.
**Email:** support@invix.cz
**Documentation:** `/opt/orchideo/docs/`

**Emergency Contacts:**
- DevOps: TBD
- Database Admin: TBD
- Facebook App Admin: TBD

---

**Poslední aktualizace:** 2026-01-31
**Verze dokumentace:** 1.0
**Status:** Production Ready ✅
