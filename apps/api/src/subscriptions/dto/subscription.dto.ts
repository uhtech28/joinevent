import { z } from 'zod';

export const PLAN_CODES = ['society_plus', 'vendor_plus', 'organiser_pro'] as const;

export const subscribeSchema = z.object({
  planCode: z.enum(PLAN_CODES),
});

export type SubscribeDto = z.infer<typeof subscribeSchema>;

export type PublicPlan = {
  id: string;
  code: string;
  name: string;
  pricePaise: number;
  billingCycle: string;
  benefits: string[];
};

export type PublicSubscription = {
  id: string;
  planCode: string;
  planName: string;
  status: string;
  startedAt: string;
  nextBillingAt: string;
  cancelledAt: string | null;
};
