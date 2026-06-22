#!/usr/bin/env bash
# Nightly Postgres backup.
# Cron: 0 2 * * * /opt/joinevents/scripts/pg-backup.sh >> /var/log/pg-backup.log 2>&1

set -euo pipefail

# ---- Config (override via env) ----
PG_HOST="${PG_HOST:-postgres}"
PG_USER="${PG_USER:-joinevents}"
PG_DB="${PG_DB:-joinevents}"
BACKUP_DIR="${BACKUP_DIR:-/backups}"
RETENTION_DAYS="${RETENTION_DAYS:-14}"
S3_BUCKET="${S3_BUCKET:-}"
S3_PREFIX="${S3_PREFIX:-postgres/}"

# ---- Backup ----
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
FILENAME="${PG_DB}_${TIMESTAMP}.sql.gz"
LOCAL_PATH="${BACKUP_DIR}/${FILENAME}"

mkdir -p "$BACKUP_DIR"

echo "[$(date)] pg_dump → $LOCAL_PATH"
PGPASSWORD="${PG_PASSWORD}" pg_dump \
  -h "$PG_HOST" -U "$PG_USER" -d "$PG_DB" \
  --format=custom \
  --no-owner \
  --no-privileges \
  --compress=9 \
  -f "$LOCAL_PATH"

# ---- Verify ----
if [ ! -s "$LOCAL_PATH" ]; then
  echo "❌ Backup file is empty"
  exit 1
fi
BYTES=$(stat -c%s "$LOCAL_PATH")
echo "[$(date)] Backup OK — ${BYTES} bytes"

# ---- Upload to S3 / R2 (optional) ----
if [ -n "$S3_BUCKET" ]; then
  echo "[$(date)] Uploading to s3://${S3_BUCKET}/${S3_PREFIX}${FILENAME}"
  aws s3 cp "$LOCAL_PATH" "s3://${S3_BUCKET}/${S3_PREFIX}${FILENAME}" \
    --storage-class STANDARD_IA \
    --no-progress
fi

# ---- Prune local backups older than RETENTION_DAYS ----
find "$BACKUP_DIR" -name "${PG_DB}_*.sql.gz" -mtime "+${RETENTION_DAYS}" -delete
echo "[$(date)] Pruned local backups older than ${RETENTION_DAYS}d"

echo "[$(date)] ✅ Done"
