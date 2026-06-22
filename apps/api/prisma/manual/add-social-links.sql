-- Manual fallback migration for the social-link columns on business_profiles.
-- Run only if `pnpm --filter @joinevents/api prisma:migrate` fails on this change.
-- Idempotent: every column is guarded by IF NOT EXISTS.

ALTER TABLE business_profiles
  ADD COLUMN IF NOT EXISTS website_url   TEXT,
  ADD COLUMN IF NOT EXISTS instagram_url TEXT,
  ADD COLUMN IF NOT EXISTS facebook_url  TEXT,
  ADD COLUMN IF NOT EXISTS twitter_url   TEXT,
  ADD COLUMN IF NOT EXISTS linkedin_url  TEXT,
  ADD COLUMN IF NOT EXISTS youtube_url   TEXT;
