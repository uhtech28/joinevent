// Reviews DTOs.

import { z } from 'zod';

export const createReviewSchema = z.object({
  stars: z.coerce.number().int().min(1).max(5),
  body: z.string().trim().min(2).max(1000).optional(),
});

export type CreateReviewDto = z.infer<typeof createReviewSchema>;

export const listReviewsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(10),
  cursor: z.string().uuid().optional(),
});

export type ListReviewsQuery = z.infer<typeof listReviewsQuerySchema>;

export type PublicReview = {
  id: string;
  stars: number;
  body: string | null;
  createdAt: string;
  author: {
    /** Short label like "User 3210" derived from phone last-4 or displayName. */
    label: string;
  };
};

export type EventReviewsSummary = {
  count: number;
  average: number; // raw average (1-5) — not Bayesian, intentionally
  bayesian: number; // shrunk average (1-5)
  histogram: { 1: number; 2: number; 3: number; 4: number; 5: number };
};
