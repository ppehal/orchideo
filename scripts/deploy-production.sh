#!/bin/bash
# =============================================================================
# Orchideo - Production Deployment Script
# =============================================================================
# USAGE:
#   ./scripts/deploy-production.sh [--skip-backup] [--skip-migrations]
#
# OPTIONS:
#   --skip-backup      Skip database backup before deployment
#   --skip-migrations  Skip running Prisma migrations
#   --help             Show this help message
#
# EXAMPLES:
#   ./scripts/deploy-production.sh                    # Full deployment
#   ./scripts/deploy-production.sh --skip-backup      # Skip backup
#
# =============================================================================

set -e  # Exit on error

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
ENV_FILE=".env.production"
COMPOSE_FILE="docker-compose.prod.yml"
BACKUP_DIR="/opt/orchideo/backups"

# Parse arguments
SKIP_BACKUP=false
SKIP_MIGRATIONS=false

while [[ $# -gt 0 ]]; do
  case $1 in
    --skip-backup)
      SKIP_BACKUP=true
      shift
      ;;
    --skip-migrations)
      SKIP_MIGRATIONS=true
      shift
      ;;
    --help)
      grep "^#" "$0" | tail -n +2 | head -n -1 | sed 's/^# //'
      exit 0
      ;;
    *)
      echo -e "${RED}Unknown option: $1${NC}"
      echo "Use --help for usage information"
      exit 1
      ;;
  esac
done

# Helper functions
log_info() {
  echo -e "${BLUE}ℹ${NC} $1"
}

log_success() {
  echo -e "${GREEN}✓${NC} $1"
}

log_warning() {
  echo -e "${YELLOW}⚠${NC} $1"
}

log_error() {
  echo -e "${RED}✗${NC} $1"
}

# Change to project directory
cd "$PROJECT_ROOT"

echo "============================================================================="
echo "  Orchideo - Production Deployment"
echo "============================================================================="
echo ""

# Pre-flight checks
log_info "Running pre-flight checks..."

# Check .env.production exists
if [ ! -f "$ENV_FILE" ]; then
  log_error "$ENV_FILE not found!"
  log_info "Create it from .env.production.template:"
  echo "  cp .env.production.template .env.production"
  exit 1
fi

# Check for CHANGE_ME placeholders
if grep -q "CHANGE_ME" "$ENV_FILE"; then
  log_error "$ENV_FILE contains CHANGE_ME placeholders!"
  log_info "Replace all CHANGE_ME values with real credentials"
  exit 1
fi

# Check mandatory variables
REQUIRED_VARS=(
  "POSTGRES_PASSWORD"
  "NEXTAUTH_SECRET"
  "FACEBOOK_APP_SECRET"
  "ENCRYPTION_KEY"
  "POSTMARK_API_TOKEN"
)

for var in "${REQUIRED_VARS[@]}"; do
  if ! grep -q "^$var=" "$ENV_FILE"; then
    log_error "Missing required variable: $var"
    exit 1
  fi
done

log_success "Pre-flight checks passed"
echo ""

# Git status
log_info "Current Git status:"
git branch --show-current
git log -1 --oneline
echo ""

# Confirmation
read -p "Deploy to PRODUCTION? (yes/no): " -r
echo
if [[ ! $REPLY =~ ^[Yy]es$ ]]; then
  log_warning "Deployment cancelled"
  exit 0
fi

# Database backup
if [ "$SKIP_BACKUP" = false ]; then
  log_info "Creating database backup..."

  mkdir -p "$BACKUP_DIR"

  BACKUP_FILE="$BACKUP_DIR/orchideo_$(date +%Y%m%d_%H%M%S).sql.gz"

  if docker ps | grep -q "orchideo-postgres-prod"; then
    docker exec orchideo-postgres-prod pg_dump -U orchideo orchideo | gzip > "$BACKUP_FILE"
    log_success "Backup created: $BACKUP_FILE"
  else
    log_warning "PostgreSQL container not running, skipping backup"
  fi

  echo ""
else
  log_warning "Skipping database backup (--skip-backup flag)"
  echo ""
fi

# Build Docker image
log_info "Building Docker image..."
docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" build

log_success "Docker image built"
echo ""

# Run Prisma migrations
if [ "$SKIP_MIGRATIONS" = false ]; then
  log_info "Running Prisma migrations..."

  # Start PostgreSQL if not running
  docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" up -d postgres

  # Wait for PostgreSQL to be healthy
  log_info "Waiting for PostgreSQL to be ready..."
  timeout=30
  counter=0
  until docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" ps postgres | grep -q "healthy" || [ $counter -eq $timeout ]; do
    sleep 1
    counter=$((counter + 1))
  done

  if [ $counter -eq $timeout ]; then
    log_error "PostgreSQL did not become healthy in time"
    exit 1
  fi

  # Run migrations
  docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" run --rm app npx prisma migrate deploy

  log_success "Migrations completed"
  echo ""
else
  log_warning "Skipping Prisma migrations (--skip-migrations flag)"
  echo ""
fi

# Deploy application
log_info "Deploying application..."
docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" up -d

log_success "Application deployed"
echo ""

# Wait for health check
log_info "Waiting for application to be healthy..."
sleep 5

timeout=60
counter=0
until docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" ps app | grep -q "healthy" || [ $counter -eq $timeout ]; do
  sleep 2
  counter=$((counter + 2))
  echo -n "."
done
echo ""

if [ $counter -eq $timeout ]; then
  log_error "Application did not become healthy in time"
  log_info "Check logs:"
  echo "  docker compose --env-file $ENV_FILE -f $COMPOSE_FILE logs app"
  exit 1
fi

log_success "Application is healthy"
echo ""

# Verify deployment
log_info "Verifying deployment..."

# Check containers
log_info "Container status:"
docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" ps

echo ""

# Check environment variables
log_info "Verifying environment variables..."
EXPECTED_VARS=("NODE_ENV=production" "FACEBOOK_APP_ID=1605455470467424")
for var in "${EXPECTED_VARS[@]}"; do
  if docker exec orchideo-app-prod env | grep -q "^$var"; then
    log_success "$var"
  else
    log_error "$var NOT SET"
  fi
done

echo ""

# Test health endpoint
log_info "Testing health endpoint..."
HEALTH_URL="${NEXT_PUBLIC_APP_URL:-https://app.orchideo.ppsys.eu}/api/health"

if curl -sf "$HEALTH_URL" > /dev/null 2>&1; then
  log_success "Health endpoint OK: $HEALTH_URL"
else
  log_warning "Health endpoint not accessible: $HEALTH_URL"
  log_info "This may be normal if reverse proxy is not yet configured"
fi

echo ""

# Display logs
log_info "Recent application logs:"
docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" logs app --tail 20

echo ""
echo "============================================================================="
echo -e "${GREEN}✓ Deployment Complete${NC}"
echo "============================================================================="
echo ""
echo "Next steps:"
echo "  1. Test application: ${NEXT_PUBLIC_APP_URL:-https://app.orchideo.ppsys.eu}"
echo "  2. Monitor logs: docker compose --env-file $ENV_FILE -f $COMPOSE_FILE logs -f app"
echo "  3. Run smoke tests (see DEPLOYMENT-CHECKLIST.md)"
echo ""
echo "Rollback (if needed):"
echo "  docker compose --env-file $ENV_FILE -f $COMPOSE_FILE down"
echo "  gunzip -c $BACKUP_FILE | docker exec -i orchideo-postgres-prod psql -U orchideo -d orchideo"
echo ""
