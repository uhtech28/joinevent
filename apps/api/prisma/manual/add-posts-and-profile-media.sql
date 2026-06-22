-- Manual fallback migration for the Facebook-style profile + posts feature.
-- Run only if `pnpm --filter @joinevents/api prisma:migrate` fails.
-- Idempotent: every change is wrapped in IF NOT EXISTS / safe-add guards.

-- ---------- 1. New columns on business_profiles ----------
ALTER TABLE business_profiles
  ADD COLUMN IF NOT EXISTS avatar_url TEXT,
  ADD COLUMN IF NOT EXISTS cover_url  TEXT,
  ADD COLUMN IF NOT EXISTS location   TEXT,
  ADD COLUMN IF NOT EXISTS posts_count INTEGER NOT NULL DEFAULT 0;

-- ---------- 2. posts table ----------
CREATE TABLE IF NOT EXISTS posts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id      UUID NOT NULL REFERENCES business_profiles(id),
  kind            TEXT NOT NULL DEFAULT 'text',
  content         TEXT NOT NULL,
  media_urls      JSONB,
  event_id        UUID,
  likes_count     INTEGER NOT NULL DEFAULT 0,
  comments_count  INTEGER NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at      TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS posts_profile_id_created_at_idx ON posts (profile_id, created_at DESC);
CREATE INDEX IF NOT EXISTS posts_created_at_idx ON posts (created_at DESC);

-- ---------- 3. post_likes ----------
CREATE TABLE IF NOT EXISTS post_likes (
  post_id    UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (post_id, user_id)
);
CREATE INDEX IF NOT EXISTS post_likes_user_id_idx ON post_likes (user_id);

-- ---------- 4. post_comments ----------
CREATE TABLE IF NOT EXISTS post_comments (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id    UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL,
  content    TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS post_comments_post_id_created_at_idx ON post_comments (post_id, created_at DESC);
CREATE INDEX IF NOT EXISTS post_comments_user_id_idx ON post_comments (user_id);
