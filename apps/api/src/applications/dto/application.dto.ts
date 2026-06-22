// DTOs for the Applications module.

import { z } from 'zod';

export const APPLICATION_STATUSES = [
  'submitted',
  'under_review',
  'approved',
  'rejected',
  'payment_pending',
  'booked',
] as const;
export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number];

export const submitApplicationSchema = z.object({
  businessName: z.string().min(2).max(120),
  category: z.string().min(2).max(40),
  productType: z.string().max(120).optional(),
  message: z.string().max(1000).optional(),
});
export type SubmitApplicationDto = z.infer<typeof submitApplicationSchema>;

export const decideApplicationSchema = z.object({
  decision: z.enum(['approve', 'reject', 'under_review']),
  rejectionReason: z.string().max(500).optional(),
});
export type DecideApplicationDto = z.infer<typeof decideApplicationSchema>;

export type PublicApplication = {
  id: string;
  status: ApplicationStatus;
  businessName: string;
  category: string;
  productType: string | null;
  message: string | null;
  rejectionReason: string | null;
  createdAt: string;
  decisionAt: string | null;
  event: {
    id: string;
    slug: string;
    title: string;
    startsAt: string;
    endsAt: string;
    coverImage: string | null;
    organiserUsername: string;
  };
  applicant: {
    id: string;
    displayName: string | null;
    profileUsername: string | null;
    profileAvatarUrl: string | null;
  };
};
