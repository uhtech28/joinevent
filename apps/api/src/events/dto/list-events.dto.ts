// Query validation for GET /api/v1/events using Zod.

import { z } from 'zod';

export const listEventsQuerySchema = z.object({
  city: z.string().trim().min(2).optional(),
  category: z.string().trim().min(2).optional(),
  societySlug: z.string().trim().min(2).optional(),
  verifiedOnly: z.preprocess(
    (v) => v === 'true' || v === '1' || v === true,
    z.boolean().optional(),
  ),
  minPricePaise: z.coerce.number().int().min(0).optional(),
  maxPricePaise: z.coerce.number().int().min(0).optional(),
  q: z.string().trim().min(2).max(120).optional(),
  sort: z.enum(['date', 'trending', 'featured']).default('date'),
  limit: z.coerce.number().int().min(1).max(50).default(12),
  cursor: z.string().uuid().optional(),
});

export type ListEventsQuery = z.infer<typeof listEventsQuerySchema>;
