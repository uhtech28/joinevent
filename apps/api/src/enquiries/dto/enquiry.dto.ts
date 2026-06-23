import { z } from 'zod';

export const createEnquirySchema = z.object({
  productId: z.string().uuid(),
  message: z.string().min(2).max(2000),
  buyerName: z.string().max(120).optional().nullable(),
  buyerPhone: z.string().max(40).optional().nullable(),
  buyerEmail: z.string().email().optional().nullable(),
});

export const replyEnquirySchema = z.object({
  reply: z.string().min(1).max(4000),
});

export type CreateEnquiryBody = z.infer<typeof createEnquirySchema>;
export type ReplyEnquiryBody = z.infer<typeof replyEnquirySchema>;

export type PublicEnquiry = {
  id: string;
  product: {
    id: string;
    name: string;
    imageUrls: string[];
  };
  message: string;
  buyerName: string | null;
  buyerPhone: string | null;
  buyerEmail: string | null;
  status: string;
  ownerReply: string | null;
  repliedAt: string | null;
  createdAt: string;
  fromUser: {
    id: string;
    displayName: string | null;
    avatarUrl: string | null;
  };
};
