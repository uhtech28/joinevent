// DTOs for event creation + update (Step 5).

import { z } from 'zod';

const stallInput = z.object({
  // 'type' is the free-text label the organiser types (e.g. "Food").
  // Stored on the same `category` column for back-compat. Optional.
  category: z.string().min(1).max(60).optional().nullable(),
  // Free-text size (e.g. "10x10 ft", "Small"). Optional.
  sizeText: z.string().min(1).max(60).optional().nullable(),
  // Total amount for the stall (in paise).
  pricePaise: z.number().int().min(0).max(10_000_000), // ≤ ₹1,00,000
  // Advance / token amount. Defaults to 0 server-side.
  tokenPaise: z.number().int().min(0).max(10_000_000).optional().default(0),
  // Each row in the new UI represents one stall, so we let the client send
  // `available` if present (legacy callers) but default to 1.
  available: z.number().int().min(1).max(200).optional().default(1),
  facilities: z.record(z.unknown()).optional(),
});

// Accept absolute http(s) URLs OR relative paths returned by our /uploads endpoint.
const imageUrl = z
  .string()
  .max(500)
  .refine((v) => /^https?:\/\//.test(v) || v.startsWith('/'), {
    message: 'Must be an absolute URL or a path starting with /',
  });

export const createEventSchema = z.object({
  title: z.string().min(3).max(140),
  description: z.string().min(20).max(8_000),
  societySlug: z.string().min(2).optional(),
  addressText: z.string().min(5).max(300),
  latitude: z.number().min(6).max(36),
  longitude: z.number().min(68).max(98),
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime(),
  // Legacy single-image field kept for backwards compatibility.
  coverImageUrl: imageUrl.optional(),
  // New multi-image field — up to 8 cover photos.
  coverImageUrls: z.array(imageUrl).max(8).optional(),
  capacity: z.number().int().min(0).max(50_000).optional(),
  metadata: z.record(z.unknown()).optional(),
  stalls: z.array(stallInput).max(20).default([]),
});

export type CreateEventDto = z.infer<typeof createEventSchema>;

// PATCH allows any subset of the create fields.
export const updateEventSchema = createEventSchema.partial();
export type UpdateEventDto = z.infer<typeof updateEventSchema>;
