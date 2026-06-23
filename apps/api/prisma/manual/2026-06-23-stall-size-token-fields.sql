-- Migration: stalls gain size_text + token_paise; category becomes optional.
-- Run once on Neon: paste into Neon SQL editor.

ALTER TABLE stalls
  ADD COLUMN IF NOT EXISTS size_text   TEXT,
  ADD COLUMN IF NOT EXISTS token_paise INTEGER NOT NULL DEFAULT 0;

ALTER TABLE stalls
  ALTER COLUMN category DROP NOT NULL;
