-- ============================================================
-- Join Events — Postgres initialization
-- This script runs ONCE when the Postgres container is created.
-- It enables the extensions we'll use across the platform.
-- To re-run: docker compose down -v && docker compose up -d
-- ============================================================

-- PostGIS — geospatial queries (ST_DWithin, GEOGRAPHY type, etc.)
CREATE EXTENSION IF NOT EXISTS postgis;

-- UUID generation — used as the primary key on most tables.
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Case-insensitive text — used for email columns.
CREATE EXTENSION IF NOT EXISTS citext;

-- Trigram matching — powers fuzzy search until we move to Meilisearch.
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Cryptographic functions — used for token hashing inside the DB.
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Sanity check: log the versions to the container output.
DO $$
BEGIN
  RAISE NOTICE 'Join Events DB initialized.';
  RAISE NOTICE 'PostgreSQL: %', current_setting('server_version');
  RAISE NOTICE 'PostGIS:    %', (SELECT PostGIS_Version());
END $$;
