import { z } from 'zod';

export const submitKycSchema = z.object({
  businessProfileId: z.string().uuid(),
  companyName: z.string().trim().max(120).optional(),
  registrationType: z
    .enum(['proprietorship', 'llp', 'rwa', 'society', 'company'])
    .optional(),
  registrationNo: z.string().trim().max(60).optional(),
  panNumber: z.string().trim().regex(/^[A-Z]{5}\d{4}[A-Z]$/, 'PAN must be 10 chars (e.g. AAAPA1234A)').optional(),
  aadhaarLast4: z.string().trim().regex(/^\d{4}$/, 'Aadhaar last 4 only').optional(),
  gstin: z.string().trim().regex(/^\d{2}[A-Z]{5}\d{4}[A-Z]\d[A-Z]\d$/).optional(),
  rwaPermissionNote: z.string().trim().max(2000).optional(),
});

export type SubmitKycDto = z.infer<typeof submitKycSchema>;

export type PublicKycRequest = {
  id: string;
  businessProfileId: string;
  status: 'submitted' | 'in_review' | 'approved' | 'rejected';
  companyName: string | null;
  registrationType: string | null;
  registrationNo: string | null;
  panNumber: string | null; // masked
  aadhaarLast4: string | null;
  gstin: string | null;
  rwaPermissionNote: string | null;
  reviewerNote: string | null;
  documents: Array<{
    id: string;
    kind: string;
    filename: string;
    sizeBytes: number;
    contentType: string;
    downloadUrl: string;
  }>;
  createdAt: string;
};
