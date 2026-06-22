-- One-time backfill: recompute every BusinessProfile.avg_rating using the
-- raw average (AVG(stars)) instead of the Bayesian-shrunk formula.
-- Idempotent — safe to run more than once.

UPDATE business_profiles bp
SET avg_rating = COALESCE((
  SELECT ROUND(AVG(r.stars)::numeric, 2)
  FROM reviews r
  JOIN events e ON e.id = r.event_id
  WHERE e.organiser_id = bp.id
    AND r.moderation_status = 'approved'
), 0);
