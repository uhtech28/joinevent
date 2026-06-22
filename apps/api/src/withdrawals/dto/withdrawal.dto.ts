import { z } from 'zod';

export const requestWithdrawalSchema = z.object({
  amountPaise: z.number().int().min(10_000).max(10_000_000), // ₹100 to ₹1,00,000
  bankAccountRef: z.string().trim().min(6).max(40),
  ifsc: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z]{4}0[A-Z0-9]{6}$/, 'IFSC must be 11 chars (e.g. SBIN0123456)'),
  accountHolder: z.string().trim().min(2).max(80),
  note: z.string().trim().max(300).optional(),
});

export type RequestWithdrawalDto = z.infer<typeof requestWithdrawalSchema>;

export const decideWithdrawalSchema = z.object({
  approve: z.boolean(),
  note: z.string().trim().max(500).optional(),
});

export type DecideWithdrawalDto = z.infer<typeof decideWithdrawalSchema>;

export type PublicWithdrawal = {
  id: string;
  userId: string;
  amountPaise: number;
  feePaise: number;
  status: 'pending' | 'approved' | 'rejected' | 'paid';
  bankAccountRef: string | null;
  ifsc: string | null;
  accountHolder: string | null;
  note: string | null;
  createdAt: string;
  decidedAt: string | null;
};
