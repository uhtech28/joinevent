import { z } from 'zod';

export const createProductSchema = z.object({
  name: z.string().min(1).max(120),
  description: z.string().max(2000).optional().nullable(),
  category: z.string().max(60).optional().nullable(),
  priceFromPaise: z.number().int().min(0).max(50_000_000),
  imageUrls: z.array(z.string().url()).min(1).max(8),
});

export const updateProductSchema = createProductSchema
  .extend({ isActive: z.boolean().optional() })
  .partial();

export type CreateProductBody = z.infer<typeof createProductSchema>;
export type UpdateProductBody = z.infer<typeof updateProductSchema>;

export type PublicProduct = {
  id: string;
  profileId: string;
  name: string;
  description: string | null;
  category: string | null;
  priceFromPaise: number;
  imageUrls: string[];
  isActive: boolean;
  createdAt: string;
};
