import { z } from 'zod';

export const TIERS = {
  boost: { label: 'Boost', durationDays: 3, pricePaise: 49_900 },
  spotlight: { label: 'Spotlight', durationDays: 7, pricePaise: 1_49_900 },
  city: { label: 'City Feature', durationDays: 1, pricePaise: 2_49_900 },
} as const;

export type Tier = keyof typeof TIERS;

export const boostSchema = z.object({
  tier: z.enum(['boost', 'spotlight', 'city']),
});

export type BoostDto = z.infer<typeof boostSchema>;

export type PublicFeatured = {
  id: string;
  eventId: string;
  tier: Tier;
  pricePaise: number;
  startsAt: string;
  endsAt: string;
  active: boolean;
  createdAt: string;
};
