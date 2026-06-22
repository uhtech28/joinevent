import { z } from 'zod';

export const topupSchema = z.object({
  amountPaise: z.number().int().min(1000).max(1_000_000), // ₹10 to ₹10,000
});

export type TopupDto = z.infer<typeof topupSchema>;

export type TopupResponse =
  | {
      provider: 'stub';
      status: 'completed';
      paymentEventId: string;
      newBalancePaise: number;
    }
  | {
      provider: 'payu';
      status: 'redirect_required';
      paymentEventId: string;
      paymentUrl: string;
    };
