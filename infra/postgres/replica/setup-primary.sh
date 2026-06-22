#!/bin/bash
# Configure the primary for streaming replication.
# Runs once via docker-entrypoint-initdb.d on first boot.
set -euo pipefail

PSQL="psql -v ON_ERROR_STOP=1 --username $POSTGRES_USER --dbname $POSTGRES_DB"

# 1. Create replication role.
$PSQL <<-EOSQL
  DO \$\$ BEGIN
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'replicator') THEN
      CREATE ROLE replicator WITH REPLICATION LOGIN PASSWORD 'replicator_dev_password';
    END IF;
  END \$\$;
EOSQL

# 2. WAL settings already in primary.conf (mounted at /etc/postgresql/postgresql.conf).
# 3. Replication slots for each replica.
$PSQL <<-EOSQL
  SELECT pg_create_physical_replication_slot('replica1_slot')
    WHERE NOT EXISTS (SELECT FROM pg_replication_slots WHERE slot_name = 'replica1_slot');
  SELECT pg_create_physical_replication_slot('replica2_slot')
    WHERE NOT EXISTS (SELECT FROM pg_replication_slots WHERE slot_name = 'replica2_slot');
EOSQL

echo "✓ Primary configured for replication (role=replicator, slots=replica1,replica2)"
