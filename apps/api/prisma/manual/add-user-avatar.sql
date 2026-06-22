-- Manual fallback migration: add `avatar_url` to the users table.
-- Run only if `pnpm --filter @joinevents/api prisma:migrate dev --name user_avatar`
-- can't be used. Idempotent — guarded by IF NOT EXISTS.

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS avatar_url TEXT;
