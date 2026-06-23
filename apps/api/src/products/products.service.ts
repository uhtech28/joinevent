import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  type CreateProductBody,
  type PublicProduct,
  type UpdateProductBody,
} from './dto/product.dto';

// Vendor-only product catalogue. The feature is gated behind primaryRole +
// the existence of a BusinessProfile of type='vendor'.
@Injectable()
export class ProductsService {
  constructor(private readonly db: PrismaService) {}

  // ----------------------------------------------------------------
  // Helpers
  // ----------------------------------------------------------------
  private async vendorProfile(userId: string) {
    const profile = await this.db.businessProfile.findFirst({
      where: { userId, type: 'vendor' },
      select: { id: true, username: true },
    });
    if (!profile) {
      throw new ForbiddenException({
        code: 'not_vendor',
        message: 'Only stall-owner accounts can manage products.',
      });
    }
    return profile;
  }

  private toPublic(row: {
    id: string;
    profileId: string;
    name: string;
    description: string | null;
    category: string | null;
    priceFromPaise: number;
    imageUrls: string[];
    isActive: boolean;
    createdAt: Date;
  }): PublicProduct {
    return {
      id: row.id,
      profileId: row.profileId,
      name: row.name,
      description: row.description,
      category: row.category,
      priceFromPaise: row.priceFromPaise,
      imageUrls: row.imageUrls ?? [],
      isActive: row.isActive,
      createdAt: row.createdAt.toISOString(),
    };
  }

  // ----------------------------------------------------------------
  // Public reads — anyone can browse a stall owner's catalogue.
  // ----------------------------------------------------------------
  async listForUsername(username: string): Promise<PublicProduct[]> {
    const profile = await this.db.businessProfile.findUnique({
      where: { username },
      select: { id: true, type: true },
    });
    if (!profile || profile.type !== 'vendor') return [];
    const rows = await this.db.product.findMany({
      where: { profileId: profile.id, isActive: true },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map((r) => this.toPublic(r));
  }

  async findById(id: string): Promise<PublicProduct> {
    const row = await this.db.product.findUnique({ where: { id } });
    if (!row) throw new NotFoundException(`Product ${id} not found`);
    return this.toPublic(row);
  }

  // ----------------------------------------------------------------
  // Owner reads / writes — vendor-only.
  // ----------------------------------------------------------------
  async listMine(userId: string): Promise<PublicProduct[]> {
    const profile = await this.vendorProfile(userId);
    const rows = await this.db.product.findMany({
      where: { profileId: profile.id },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map((r) => this.toPublic(r));
  }

  async create(userId: string, body: CreateProductBody): Promise<PublicProduct> {
    const profile = await this.vendorProfile(userId);
    const row = await this.db.product.create({
      data: {
        profileId: profile.id,
        name: body.name.trim(),
        description: body.description?.trim() || null,
        category: body.category?.trim() || null,
        priceFromPaise: body.priceFromPaise,
        imageUrls: body.imageUrls,
      },
    });
    return this.toPublic(row);
  }

  async update(
    userId: string,
    id: string,
    body: UpdateProductBody,
  ): Promise<PublicProduct> {
    const profile = await this.vendorProfile(userId);
    const existing = await this.db.product.findUnique({
      where: { id },
      select: { profileId: true },
    });
    if (!existing) throw new NotFoundException(`Product ${id} not found`);
    if (existing.profileId !== profile.id) {
      throw new ForbiddenException({ code: 'not_owner' });
    }
    if (
      body.imageUrls !== undefined &&
      (body.imageUrls.length < 1 || body.imageUrls.length > 8)
    ) {
      throw new BadRequestException({ code: 'image_count_invalid' });
    }
    const row = await this.db.product.update({
      where: { id },
      data: {
        name: body.name?.trim(),
        description: body.description?.trim() ?? undefined,
        category: body.category?.trim() ?? undefined,
        priceFromPaise: body.priceFromPaise,
        imageUrls: body.imageUrls,
        isActive: body.isActive,
      },
    });
    return this.toPublic(row);
  }

  async remove(userId: string, id: string): Promise<{ ok: true }> {
    const profile = await this.vendorProfile(userId);
    const existing = await this.db.product.findUnique({
      where: { id },
      select: { profileId: true },
    });
    if (!existing) throw new NotFoundException(`Product ${id} not found`);
    if (existing.profileId !== profile.id) {
      throw new ForbiddenException({ code: 'not_owner' });
    }
    await this.db.product.delete({ where: { id } });
    return { ok: true };
  }
}
