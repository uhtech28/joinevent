// Admin DTOs (Step 8).

import { z } from 'zod';

export const kycActionSchema = z.object({
  note: z.string().trim().min(2).max(500).optional(),
  reason: z
    .enum([
      'docs_unreadable',
      'docs_mismatch',
      'duplicate_account',
      'suspicious_activity',
      'incomplete_information',
      'other',
    ])
    .optional(),
});

export type KycActionDto = z.infer<typeof kycActionSchema>;

export type OverviewStats = {
  users: { total: number; verified: number; admins: number };
  businessProfiles: { total: number; verified: number; pendingKyc: number };
  events: { total: number; live: number; draft: number; cancelled: number };
  bookings: { confirmed: number; cancelled: number; released: number };
  reviews: { total: number; flagged: number };
  ledger: { debitsPaise: number; creditsPaise: number; balanced: boolean };
  recentAuditCount: number;
};

export type PendingKycCase = {
  id: string;
  username: string;
  displayName: string;
  type: 'organiser' | 'vendor';
  bio: string | null;
  createdAt: string;
  user: {
    id: string;
    phone: string | null;
    email: string | null;
    city: string | null;
    createdAt: string;
  };
  flags: string[]; // automated fraud signals (we add a few simple ones)
};

export type AdminAuditEntry = {
  id: string;
  action: string;
  targetTable: string;
  targetId: string;
  note: string | null;
  diff: Record<string, unknown>;
  ip: string | null;
  userAgent: string | null;
  createdAt: string;
  actor: {
    id: string;
    label: string;
  };
};
