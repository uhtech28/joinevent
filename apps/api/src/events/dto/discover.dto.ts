// Validation for POST /api/v1/discover.
// We accept the location in the body (not a query string) because it's
// semi-private user data — bodies don't end up in CDN logs or browser histories.

import { z } from 'zod';

export const discoverSchema = z.object({
  // Roughly the bounding box of inhabited India (with margin).
  lat: z.coerce.number().min(6).max(36),
  lng: z.coerce.number().min(68).max(98),
  // Radius in metres. Defaults to 5 km. Capped at 50 km so a misclick
  // can't accidentally turn into a full-table scan.
  radiusM: z.coerce.number().int().min(500).max(50_000).default(5000),
  // Days-ahead window for the feed. 30 default; max 365.
  daysAhead: z.coerce.number().int().min(1).max(365).default(30),
  // Optional category filter (e.g. ['food', 'home-decor']).
  categories: z.array(z.string().min(2)).max(10).optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export type DiscoverDto = z.infer<typeof discoverSchema>;
