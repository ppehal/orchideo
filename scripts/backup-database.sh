#!/bin/bash
# =============================================================================
# Orchideo - Database Backup Script
# =============================================================================
# USAGE:
#   ./scripts/backup-database.sh [OPTIONS]
#
# OPTIONS:
#   --container NAME   Container name (default: orchideo-postgres-prod)
#   --user USER        PostgreSQL user (default: orchideo)
#   --database DB      Database name (default: orchideo)
#   --output DIR       Backup directory (default: /opt/orchideo/backups)
#   --retention DAYS   Keep backups for N days (default: 30)
#   --help             Show this help message
#
# EXAMPLES:
#   ./scripts/backup-database.sh                     # Default settings
#   ./scripts/backup-database.sh --retention 7       # Keep 7 days
#   ./scripts/backup-database.sh --container orchideo-postgres  # VPS dev
#
# CRONTAB:
#   # Daily backup at 2 AM
#   0 2 * * * /opt/orchideo/scripts/backup-database.sh >> /var/log/orchideo-backup.log 2>&1
#
# =============================================================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Default configuration
CONTAINER_NAME="orchideo-postgres-prod"
PG_USER="orchideo"
PG_DATABASE="orchideo"
BACKUP_DIR="/opt/orchideo/backups"
RETENTION_DAYS=30

# Parse arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --container)
      CONTAINER_NAME="$2"
      shift 2
      ;;
    --user)
      PG_USER="$2"
      shift 2
      ;;
    --database)
      PG_DATABASE="$2"
      shift 2
      ;;
    --output)
      BACKUP_DIR="$2"
      shift 2
      ;;
    --retention)
      RETENTION_DAYS="$2"
      shift 2
      ;;
    --help)
      grep "^#" "$0" | tail -n +2 | head -n -1 | sed 's/^# //'
      exit 0
      ;;
    *)
      echo -e "${RED}Unknown option: $1${NC}"
      exit 1
      ;;
  esac
done

# Helper functions
log_info() {
  echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

log_success() {
  echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} ✓ $1"
}

log_error() {
  echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} ✗ $1"
}

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Check container exists
if ! docker ps | grep -q "$CONTAINER_NAME"; then
  log_error "Container $CONTAINER_NAME is not running"
  exit 1
fi

# Generate backup filename
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/${PG_DATABASE}_${TIMESTAMP}.sql.gz"

log_info "Starting database backup..."
log_info "Container: $CONTAINER_NAME"
log_info "Database: $PG_DATABASE"
log_info "Output: $BACKUP_FILE"

# Create backup
docker exec "$CONTAINER_NAME" pg_dump -U "$PG_USER" "$PG_DATABASE" | gzip > "$BACKUP_FILE"

# Check backup was created
if [ ! -f "$BACKUP_FILE" ]; then
  log_error "Backup file was not created: $BACKUP_FILE"
  exit 1
fi

# Get backup size
BACKUP_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)

log_success "Backup created: $BACKUP_FILE ($BACKUP_SIZE)"

# Clean old backups
log_info "Cleaning backups older than $RETENTION_DAYS days..."

DELETED_COUNT=$(find "$BACKUP_DIR" -name "${PG_DATABASE}_*.sql.gz" -mtime +$RETENTION_DAYS -delete -print | wc -l)

if [ "$DELETED_COUNT" -gt 0 ]; then
  log_success "Deleted $DELETED_COUNT old backup(s)"
else
  log_info "No old backups to delete"
fi

# List recent backups
log_info "Recent backups:"
ls -lht "$BACKUP_DIR"/${PG_DATABASE}_*.sql.gz | head -5

# Verify backup integrity (optional)
log_info "Verifying backup integrity..."

gunzip -t "$BACKUP_FILE" 2>&1

if [ $? -eq 0 ]; then
  log_success "Backup integrity OK"
else
  log_error "Backup integrity check failed!"
  exit 1
fi

log_success "Backup completed successfully"

# Display restore command
echo ""
echo "To restore this backup:"
echo "  gunzip -c $BACKUP_FILE | docker exec -i $CONTAINER_NAME psql -U $PG_USER -d $PG_DATABASE"
echo ""
