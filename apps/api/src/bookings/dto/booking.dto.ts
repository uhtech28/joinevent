// DTOs and shared types for the bookings surface.

import { z } from 'zod';

export const PLATFORM_FEE_BPS = 1_000; // 10.00% in basis points

export const bookStallParamsSchema = z.object({
  eventId: z.string().uuid(),
  stallId: z.string().uuid(),
});

export type BookStallParams = z.infer<typeof bookStallParamsSchema>;

export type PublicBooking = {
  id: string;
  stallId: string;
  amountPaise: number;
  platformFeePaise: number;
  escrowHeldPaise: number;
  status: 'confirmed' | 'cancelled' | 'released';
  bookingTxnId: string;
  createdAt: string;
  stall?: {
    category: string | null;
    pricePaise: number;
  };
  event?: {
    slug: string;
    title: string;
    startsAt: string;
    endsAt: string;
    addressText: string;
  };
};

export type BookStallResponse = {
  booking: PublicBooking;
  newWalletBalancePaise: number;
};
