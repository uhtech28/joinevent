import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  type CreateEnquiryBody,
  type PublicEnquiry,
  type ReplyEnquiryBody,
} from './dto/enquiry.dto';

@Injectable()
export class EnquiriesService {
  constructor(private readonly db: PrismaService) {}

  private async vendorProfile(userId: string) {
    const profile = await this.db.businessProfile.findFirst({
      where: { userId, type: 'vendor' },
      select: { id: true },
    });
    if (!profile) {
      throw new ForbiddenException({
        code: 'not_vendor',
        message: 'Only stall-owner accounts can view enquiries.',
      });
    }
    return profile;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private toPublic(row: any): PublicEnquiry {
    return {
      id: row.id,
      product: {
        id: row.product.id,
        name: row.product.name,
        imageUrls: row.product.imageUrls ?? [],
      },
      message: row.message,
      buyerName: row.buyerName,
      buyerPhone: row.buyerPhone,
      buyerEmail: row.buyerEmail,
      status: row.status,
      ownerReply: row.ownerReply,
      repliedAt: row.repliedAt ? row.repliedAt.toISOString() : null,
      createdAt: row.createdAt.toISOString(),
      fromUser: {
        id: row.fromUser.id,
        displayName: row.fromUser.displayName,
        avatarUrl: row.fromUser.avatarUrl,
      },
    };
  }

  // ----------------------------------------------------------------
  // Create — any signed-in user can enquire about any product.
  // ----------------------------------------------------------------
  async create(userId: string, body: CreateEnquiryBody): Promise<PublicEnquiry> {
    const product = await this.db.product.findUnique({
      where: { id: body.productId },
      select: { id: true, profileId: true, isActive: true },
    });
    if (!product || !product.isActive) {
      throw new NotFoundException(`Product ${body.productId} not found`);
    }
    const row = await this.db.productEnquiry.create({
      data: {
        productId: product.id,
        fromUserId: userId,
        toProfileId: product.profileId,
        message: body.message.trim(),
        buyerName: body.buyerName?.trim() || null,
        buyerPhone: body.buyerPhone?.trim() || null,
        buyerEmail: body.buyerEmail?.trim() || null,
      },
      include: {
        product: { select: { id: true, name: true, imageUrls: true } },
        fromUser: { select: { id: true, displayName: true, avatarUrl: true } },
      },
    });
    return this.toPublic(row);
  }

  // ----------------------------------------------------------------
  // Owner inbox — vendor-only.
  // ----------------------------------------------------------------
  async listReceived(userId: string): Promise<PublicEnquiry[]> {
    const profile = await this.vendorProfile(userId);
    const rows = await this.db.productEnquiry.findMany({
      where: { toProfileId: profile.id },
      orderBy: { createdAt: 'desc' },
      include: {
        product: { select: { id: true, name: true, imageUrls: true } },
        fromUser: { select: { id: true, displayName: true, avatarUrl: true } },
      },
    });
    return rows.map((r) => this.toPublic(r));
  }

  async reply(
    userId: string,
    id: string,
    body: ReplyEnquiryBody,
  ): Promise<PublicEnquiry> {
    const profile = await this.vendorProfile(userId);
    const existing = await this.db.productEnquiry.findUnique({
      where: { id },
      select: { toProfileId: true },
    });
    if (!existing) throw new NotFoundException(`Enquiry ${id} not found`);
    if (existing.toProfileId !== profile.id) {
      throw new ForbiddenException({ code: 'not_owner' });
    }
    const row = await this.db.productEnquiry.update({
      where: { id },
      data: {
        ownerReply: body.reply.trim(),
        repliedAt: new Date(),
        status: 'replied',
      },
      include: {
        product: { select: { id: true, name: true, imageUrls: true } },
        fromUser: { select: { id: true, displayName: true, avatarUrl: true } },
      },
    });
    return this.toPublic(row);
  }

  async markRead(userId: string, id: string): Promise<PublicEnquiry> {
    const profile = await this.vendorProfile(userId);
    const existing = await this.db.productEnquiry.findUnique({
      where: { id },
      select: { toProfileId: true, status: true },
    });
    if (!existing) throw new NotFoundException(`Enquiry ${id} not found`);
    if (existing.toProfileId !== profile.id) {
      throw new ForbiddenException({ code: 'not_owner' });
    }
    const row = await this.db.productEnquiry.update({
      where: { id },
      data: { status: existing.status === 'new' ? 'read' : existing.status },
      include: {
        product: { select: { id: true, name: true, imageUrls: true } },
        fromUser: { select: { id: true, displayName: true, avatarUrl: true } },
      },
    });
    return this.toPublic(row);
  }
}
