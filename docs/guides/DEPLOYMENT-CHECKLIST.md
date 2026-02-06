# Orchideo - Production Deployment Checklist

**Kompletní checklist pro produkční nasazení**

**Používejte tento checklist před KAŽDÝM production deploymentem**

---

## 📋 Phase 1: Příprava (1-2 dny před)

### Environment Setup

- [ ] `.env.production` vytvořen z `.env.production.template`
- [ ] `POSTGRES_PASSWORD` vygenerován: `openssl rand -base64 32`
- [ ] `NEXTAUTH_SECRET` vygenerován: `openssl rand -base64 32`
- [ ] `ENCRYPTION_KEY` zkopírován z VPS dev (MUST be same!)
- [ ] `FACEBOOK_APP_SECRET` vyplněn
- [ ] `POSTMARK_API_TOKEN` vyplněn
- [ ] `NEXTAUTH_URL` nastaven na production domain
- [ ] `NEXT_PUBLIC_APP_URL` nastaven na production domain
- [ ] Všechny `CHANGE_ME` placeholders nahrazeny: `grep CHANGE_ME .env.production`

### Database Preparation

- [ ] PostgreSQL 16+ dostupný (Docker nebo managed)
- [ ] Database credentials otestovány
- [ ] Backup strategie definována
- [ ] Database disk space: min 20 GB free

### Facebook App Configuration

- [ ] Facebook App ID: `1605455470467424` verified
- [ ] App je v **Live Mode** (nebo Development s test users)
- [ ] OAuth Redirect URI přidán: `https://app.orchideo.ppsys.eu/api/auth/callback/facebook`
- [ ] App Domains obsahuje: `app.orchideo.ppsys.eu`
- [ ] Permissions schváleny (nebo Development Mode s <100 users)
  - [ ] `pages_show_list`
  - [ ] `pages_read_engagement`
  - [ ] `pages_read_user_content`
  - [ ] `read_insights`

### Infrastructure

- [ ] Server má min 4 GB RAM, 2 vCPU
- [ ] Docker 24.0+ nainstalován
- [ ] Docker Compose 2.20+ nainstalován
- [ ] Domain DNS nakonfigurována (A/CNAME záznam)
- [ ] SSL certifikát připraven (Let's Encrypt nebo custom)
- [ ] Reverse proxy (Traefik/nginx) nakonfigurován
- [ ] Firewall pravidla nastavena (80, 443, 22)

### Cloudflare R2 (Phase 2 - Optional)

- [ ] R2 bucket vytvořen: `orchideo-pdfs-prod`
- [ ] API Token vygenerován (Read & Write)
- [ ] `R2_ACCOUNT_ID` vyplněn v .env.production
- [ ] `R2_ACCESS_KEY_ID` vyplněn
- [ ] `R2_SECRET_ACCESS_KEY` vyplněn
- [ ] Custom domain nakonfigurována: `cdn.orchideo.ppsys.eu` (optional)

---

## 📋 Phase 2: Pre-Deployment Validace (1 hodina před)

### Code & Build

- [ ] `main` branch je up-to-date: `git pull origin main`
- [ ] Všechny testy prošly: `npm run ci`
- [ ] TypeScript kompilace OK: `npm run type-check`
- [ ] Linting OK: `npm run lint`
- [ ] Production build OK lokálně: `npm run build`

### Docker

- [ ] `docker-compose.prod.yml` je aktuální
- [ ] Dockerfile je aktuální
- [ ] Docker Compose config validní: `docker compose -f docker-compose.prod.yml config`
- [ ] Docker build prošel: `docker compose --env-file .env.production -f docker-compose.prod.yml build`

### Database Migrations

- [ ] Prisma schema je up-to-date
- [ ] Migrations vygenerovány: `npx prisma migrate dev`
- [ ] Migrations otestovány na staging/dev
- [ ] Backup current production DB (pokud existuje): `pg_dump`

### Security Review

- [ ] `.env.production` NENÍ v Git: `git status`
- [ ] Secrets jsou uloženy v password manageru (1Password, Bitwarden, etc.)
- [ ] SSH klíče jsou aktuální
- [ ] Firewall rules reviewed
- [ ] HTTPS enforcement nakonfigurován

---

## 📋 Phase 3: Deployment (30-60 minut)

### Database Setup

- [ ] Start PostgreSQL kontejneru:

  ```bash
  docker compose --env-file .env.production -f docker-compose.prod.yml up -d postgres
  ```

- [ ] Verify PostgreSQL je healthy:

  ```bash
  docker compose --env-file .env.production -f docker-compose.prod.yml ps
  ```

- [ ] Test database connection:

  ```bash
  docker exec orchideo-postgres-prod psql -U orchideo -d orchideo -c "SELECT 1;"
  ```

- [ ] Deploy Prisma migrations:

  ```bash
  docker compose --env-file .env.production -f docker-compose.prod.yml run --rm app npx prisma migrate deploy
  ```

- [ ] Generate Prisma client:

  ```bash
  docker compose --env-file .env.production -f docker-compose.prod.yml run --rm app npm run db:generate
  ```

- [ ] (Optional) Seed initial data:
  ```bash
  docker compose --env-file .env.production -f docker-compose.prod.yml run --rm app npm run db:seed
  ```

### Application Deployment

- [ ] Start application kontejneru:

  ```bash
  docker compose --env-file .env.production -f docker-compose.prod.yml up -d app
  ```

- [ ] Verify containers are running:

  ```bash
  docker compose --env-file .env.production -f docker-compose.prod.yml ps
  # Expected: All "Up (healthy)"
  ```

- [ ] Check application logs:

  ```bash
  docker compose --env-file .env.production -f docker-compose.prod.yml logs -f app
  # Expected: "✓ Ready in XXXXms"
  ```

- [ ] Verify environment variables in container:
  ```bash
  docker exec orchideo-app-prod env | grep -E "^(NODE_ENV|FACEBOOK_APP_ID|ENCRYPTION_KEY)" | sort
  # Expected: NODE_ENV=production, FACEBOOK_APP_ID=1605455470467424
  ```

### Reverse Proxy

- [ ] Traefik/nginx nakonfigurován pro production domain
- [ ] SSL certifikát aktivní: `curl -I https://app.orchideo.ppsys.eu`
- [ ] HTTPS vrací 200: `curl -I https://app.orchideo.ppsys.eu`

---

## 📋 Phase 4: Post-Deployment Validace (15-30 minut)

### Health Checks

- [ ] Health endpoint OK:

  ```bash
  curl https://app.orchideo.ppsys.eu/api/health
  # Expected: {"status":"healthy"}
  ```

- [ ] Homepage loads:

  ```bash
  curl -I https://app.orchideo.ppsys.eu
  # Expected: HTTP/2 200
  ```

- [ ] No errors in logs:
  ```bash
  docker compose --env-file .env.production -f docker-compose.prod.yml logs app --tail 100 | grep -i error
  # Expected: no critical errors
  ```

### Functional Testing

- [ ] **Homepage:** `https://app.orchideo.ppsys.eu` loads
- [ ] **Facebook Login:** Click "Login with Facebook" → redirects to FB
- [ ] **OAuth Callback:** After FB login → redirects back to app
- [ ] **Dashboard:** User is logged in, dashboard displays
- [ ] **Page Selection:** Can select Facebook page
- [ ] **Analysis:** Analysis runs successfully
- [ ] **Report Display:** Report shows correct data
- [ ] **PDF Export (Phase 2):** PDF download works
- [ ] **Email Notifications:** Email sent after analysis (if enabled)

### Performance Testing

- [ ] Page load time < 3s (initial load)
- [ ] API response time < 500ms (health endpoint)
- [ ] Memory usage reasonable:

  ```bash
  docker stats orchideo-app-prod --no-stream
  # Expected: < 1 GB
  ```

- [ ] CPU usage reasonable:
  ```bash
  docker stats orchideo-app-prod --no-stream
  # Expected: < 50% avg
  ```

### Security Testing

- [ ] HTTPS enforced (HTTP redirects to HTTPS)
- [ ] Security headers present:

  ```bash
  curl -I https://app.orchideo.ppsys.eu | grep -E "Strict-Transport-Security|X-Frame-Options|X-Content-Type-Options"
  ```

- [ ] No sensitive data in logs
- [ ] Database not publicly accessible

---

## 📋 Phase 5: Monitoring Setup (1 hodina)

### Logging

- [ ] Log aggregation nakonfigurován (optional)
- [ ] Log rotation nastaven:

  ```yaml
  logging:
    driver: json-file
    options:
      max-size: '10m'
      max-file: '3'
  ```

- [ ] Log level: `info` nebo `warn` pro production

### Backups

- [ ] Database backup script vytvořen: `/opt/orchideo/backup-db.sh`
- [ ] Crontab nakonfigurován: `crontab -l`
- [ ] Test backup:

  ```bash
  /opt/orchideo/backup-db.sh
  ls -lh /opt/orchideo/backups/
  ```

- [ ] Test restore (na test databázi):
  ```bash
  gunzip -c backup.sql.gz | docker exec -i orchideo-postgres-prod psql -U orchideo -d orchideo_test
  ```

### Monitoring (Optional)

- [ ] Uptime monitoring (UptimeRobot, Pingdom, etc.)
- [ ] Error tracking (Sentry) nakonfigurován
- [ ] Metrics export (Prometheus) nakonfigurován
- [ ] Alerting rules nastaveny

---

## 📋 Phase 6: Documentation & Handoff (30 minut)

### Documentation

- [ ] Production credentials uloženy v password manageru
- [ ] Deployment notes přidány do runbook
- [ ] Architecture diagram aktualizován (pokud změny)
- [ ] API documentation aktualizována (pokud změny)

### Team Communication

- [ ] Team notifikován o deployment
- [ ] Changelog sdílen
- [ ] Known issues dokumentovány
- [ ] Rollback postup připraven

### Rollback Preparedness

- [ ] Previous Docker image tagged: `orchideo:v1.x.x`
- [ ] Database backup před migracemi
- [ ] Rollback postup otestován (dry-run)

---

## ✅ Final Sign-Off

**Deployment úspěšný když:**

- ✅ Všechny checklist items zaškrtnuty
- ✅ Funkční testy prošly (všechny 8 kroků)
- ✅ Žádné critical errors v logách
- ✅ Performance je přijatelný
- ✅ Monitoring funguje
- ✅ Backupy fungují

**Sign-Off:**

```
Deployed by: ___________________
Date: _________________________
Time: _________________________
Version: ______________________
Git commit: ___________________

Notes:
_________________________________
_________________________________
_________________________________
```

---

## 🚨 Rollback Trigger

**Rollback OKAMŽITĚ pokud:**

- ❌ Critical errors v production logách (5+ za minutu)
- ❌ Database connection selhává
- ❌ Facebook OAuth nefunguje pro žádného uživatele
- ❌ Memory leak detected (> 2 GB usage)
- ❌ Response time > 10s consistently
- ❌ Health endpoint returns unhealthy

**Rollback Postup:**

```bash
# 1. Stop current version
docker compose --env-file .env.production -f docker-compose.prod.yml down

# 2. Restore previous version
git checkout <previous-commit>
docker compose --env-file .env.production -f docker-compose.prod.yml up -d

# 3. Restore database (if migrations failed)
gunzip -c /opt/orchideo/backups/orchideo_<timestamp>.sql.gz | \
  docker exec -i orchideo-postgres-prod psql -U orchideo -d orchideo

# 4. Verify rollback successful
curl -I https://app.orchideo.ppsys.eu
```

---

**Template Version:** 1.0
**Last Updated:** 2026-01-31
**Next Review:** Po každém major release
