import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { promises as fs } from 'node:fs';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import type { PublicKycRequest, SubmitKycDto } from './dto/kyc.dto';

// Local-disk storage in dev. R2 takes over in prod by replacing this driver.
const STORAGE_ROOT = join(process.cwd(), 'uploads', 'kyc');

@Injectable()
export class KycService {
  private readonly log = new Logger(KycService.name);

  constructor(
    private readonly db: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  // ============================================================
  // POST /kyc/submit — multipart: structured fields + N document files
  // ============================================================
  async submit(
    userId: string,
    input: SubmitKycDto,
    files: Array<{ kind: string; original: Express.Multer.File }>,
  ): Promise<PublicKycRequest> {
    const profile = await this.db.businessProfile.findUnique({
      where: { id: input.businessProfileId },
    });
    if (!profile) throw new NotFoundException({ code: 'profile_not_found' });
    if (profile.userId !== userId) {
      throw new ForbiddenException({ code: 'not_owner' });
    }

    // Persist files. In dev → /apps/api/uploads/kyc/<id>/...
    const requestId = randomUUID();
    const dir = join(STORAGE_ROOT, requestId);
    await fs.mkdir(dir, { recursive: true });
    const docRows: Array<{
      kind: string;
      filename: string;
      contentType: string;
      sizeBytes: number;
      storageKey: string;
    }> = [];
    for (const f of files) {
      const safeName = `${randomUUID()}-${f.original.originalname.replace(/[^A-Za-z0-9._-]/g, '_')}`;
      const path = join(dir, safeName);
      await fs.writeFile(path, f.original.buffer);
      docRows.push({
        kind: f.kind,
        filename: f.original.originalname,
        contentType: f.original.mimetype,
        sizeBytes: f.original.size,
        storageKey: `kyc/${requestId}/${safeName}`,
      });
    }

    const created = await this.db.verificationRequest.create({
      data: {
        id: requestId,
        userId,
        businessProfileId: profile.id,
        status: 'submitted',
        companyName: input.companyName ?? null,
        registrationType: input.registrationType ?? null,
        registrationNo: input.registrationNo ?? null,
        panNumber: input.panNumber ?? null,
        aadhaarLast4: input.aadhaarLast4 ?? null,
        gstin: input.gstin ?? null,
        rwaPermissionNote: input.rwaPermissionNote ?? null,
        documents: { createMany: { data: docRows } },
      },
      include: { documents: true },
    });

    // Also flip the profile to kycStatus=pending so it shows in admin queue.
    await this.db.businessProfile.update({
      where: { id: profile.id },
      data: { kycStatus: 'pending', verified: false },
    });

    return this.toPublic(created);
  }

  async myLatest(userId: string): Promise<PublicKycRequest | null> {
    const row = await this.db.verificationRequest.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: { documents: true },
    });
    return row ? this.toPublic(row) : null;
  }

  // For admin KYC detail screen
  async adminGetForProfile(profileId: string): Promise<PublicKycRequest | null> {
    const row = await this.db.verificationRequest.findFirst({
      where: { businessProfileId: profileId },
      orderBy: { createdAt: 'desc' },
      include: { documents: true },
    });
    return row ? this.toPublic(row) : null;
  }

  // GET /admin/kyc/docs/:docId → streams the file
  async streamDocument(docId: string): Promise<{ path: string; doc: { filename: string; contentType: string } }> {
    const doc = await this.db.kycDocument.findUnique({ where: { id: docId } });
    if (!doc) throw new NotFoundException({ code: 'doc_not_found' });
    const path = join(process.cwd(), 'uploads', doc.storageKey.replace(/^kyc\//, 'kyc/'));
    try {
      await fs.access(path);
    } catch {
      throw new NotFoundException({ code: 'file_missing' });
    }
    return { path, doc: { filename: doc.filename, contentType: doc.contentType } };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private toPublic(r: any): PublicKycRequest {
    return {
      id: r.id,
      businessProfileId: r.businessProfileId,
      status: r.status,
      companyName: r.companyName,
      registrationType: r.registrationType,
      registrationNo: r.registrationNo,
      panNumber: r.panNumber ? `XXXXX${r.panNumber.slice(-4)}` : null,
      aadhaarLast4: r.aadhaarLast4,
      gstin: r.gstin,
      rwaPermissionNote: r.rwaPermissionNote,
      reviewerNote: r.reviewerNote,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      documents: (r.documents ?? []).map((d: any) => ({
        id: d.id,
        kind: d.kind,
        filename: d.filename,
        sizeBytes: d.sizeBytes,
        contentType: d.contentType,
        downloadUrl: `/api/v1/admin/kyc/docs/${d.id}`,
      })),
      createdAt: r.createdAt.toISOString(),
    };
  }
}
