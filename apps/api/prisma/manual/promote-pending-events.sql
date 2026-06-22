-- One-time backfill: promote events stuck in pending_verification (created
-- on a preview deploy where no admin is around to approve them) to live.
-- Safe to run multiple times — only affects rows in pending_verification.

UPDATE events
SET status = 'live'
WHERE status = 'pending_verification';
