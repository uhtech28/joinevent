-- Migration: products + product_enquiries (vendor e-commerce MVP).
-- Run once on Neon: psql "$DATABASE_URL" -f this-file.sql

CREATE TABLE IF NOT EXISTS products (
  id               UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id       UUID         NOT NULL REFERENCES business_profiles(id) ON DELETE CASCADE,
  name             TEXT         NOT NULL,
  description      TEXT,
  category         TEXT,
  price_from_paise INTEGER      NOT NULL,
  image_urls       TEXT[]       NOT NULL DEFAULT '{}',
  is_active        BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at       TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ  NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS products_profile_active_idx
  ON products (profile_id, is_active);

CREATE TABLE IF NOT EXISTS product_enquiries (
  id            UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id    UUID         NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  from_user_id  UUID         NOT NULL REFERENCES users(id),
  to_profile_id UUID         NOT NULL REFERENCES business_profiles(id),
  message       TEXT         NOT NULL,
  buyer_name    TEXT,
  buyer_phone   TEXT,
  buyer_email   TEXT,
  status        TEXT         NOT NULL DEFAULT 'new',
  owner_reply   TEXT,
  replied_at    TIMESTAMPTZ,
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS product_enquiries_to_status_idx
  ON product_enquiries (to_profile_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS product_enquiries_from_idx
  ON product_enquiries (from_user_id, created_at DESC);
