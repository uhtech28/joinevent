#!/bin/bash
# Replica bootstrap. Runs once before postgres starts (via custom entrypoint).
# Replaces $PGDATA with a base backup from the primary and configures
# standby.signal + primary_conninfo.
set -euo pipefail

PRIMARY_HOST="${PRIMARY_HOST:-postgres}"
SLOT_NAME="${SLOT_NAME:-replica1_slot}"

if [ -s "$PGDATA/PG_VERSION" ]; then
  echo "✓ Replica already initialised — starting postgres"
  exec docker-entrypoint.sh postgres
fi

echo "→ Bootstrapping replica from primary $PRIMARY_HOST (slot=$SLOT_NAME)..."

# Wait for the primary to be reachable.
until pg_isready -h "$PRIMARY_HOST" -U replicator -d postgres; do
  echo "  ... primary not ready, retrying in 2s"
  sleep 2
done

rm -rf "$PGDATA"
mkdir -p "$PGDATA"
chmod 0700 "$PGDATA"

PGPASSWORD=replicator_dev_password pg_basebackup \
  -h "$PRIMARY_HOST" \
  -U replicator \
  -D "$PGDATA" \
  -Fp -Xs -P -R \
  --slot="$SLOT_NAME"

# pg_basebackup -R writes primary_conninfo + standby.signal automatically.
chown -R postgres:postgres "$PGDATA" || true

echo "✓ Replica ready — starting postgres in standby mode"
exec docker-entrypoint.sh postgres
