#!/usr/bin/env bash
# Restore a Postgres backup. USE WITH CARE — this drops + recreates the DB.
# Usage: ./pg-restore.sh <backup-file.sql.gz>

set -euo pipefail

if [ $# -ne 1 ]; then
  echo "Usage: $0 <backup-file>"
  exit 1
fi

BACKUP_FILE="$1"
PG_HOST="${PG_HOST:-postgres}"
PG_USER="${PG_USER:-joinevents}"
PG_DB="${PG_DB:-joinevents}"

if [ ! -f "$BACKUP_FILE" ]; then
  echo "❌ Backup file not found: $BACKUP_FILE"
  exit 1
fi

echo "⚠  This will DROP and RECREATE database '$PG_DB' on '$PG_HOST'."
read -p "Type the DB name to confirm: " CONFIRM
if [ "$CONFIRM" != "$PG_DB" ]; then
  echo "❌ Aborted"
  exit 1
fi

PGPASSWORD="${PG_PASSWORD}" psql -h "$PG_HOST" -U "$PG_USER" -d postgres <<SQL
DROP DATABASE IF EXISTS "$PG_DB";
CREATE DATABASE "$PG_DB";
SQL

PGPASSWORD="${PG_PASSWORD}" pg_restore \
  -h "$PG_HOST" -U "$PG_USER" -d "$PG_DB" \
  --no-owner \
  --no-privileges \
  --clean \
  --if-exists \
  "$BACKUP_FILE"

echo "✅ Restore complete"
