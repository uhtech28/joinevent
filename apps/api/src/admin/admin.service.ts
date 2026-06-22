import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { WalletService } from '../wallet/wallet.service';
import { NotificationsService } from '../notifications/notifications.service';
import type {
  AdminAuditEntry,
  KycActionDto,
  OverviewStats,
  PendingKycCase,
} from './dto/admin.dto';

@Injectable()
export class AdminService {
  private readonly log = new Logger(AdminService.name);

  constructor(
    private readonly db: PrismaService,
    private readonly wallet: WalletService,
    private readonly notifications: NotificationsService,
  ) {}

  // ============================================================
  // GET /admin/overview — platform stats + ledger invariant
  // ============================================================
  async overview(): Promise<OverviewStats> {
    const [
      usersTotal,
      usersVerified,
      adminCount,
      bpTotal,
      bpVerified,
      bpPending,
      eventsTotal,
      eventsLive,
      eventsDraft,
      eventsCancelled,
      bookingsConfirmed,
      bookingsCancelled,
      bookingsReleased,
      reviewsTotal,
      reviewsFlagged,
      auditCount,
      ledger,
    ] = await Promise.all([
      this.db.user.count({ where: { deletedAt: null } }),
      this.db.user.count({ where: { isVerified: true, deletedAt: null } }),
      this.db.user.count({ where: { isAdmin: true, deletedAt: null } }),
      this.db.businessProfile.count(),
      this.db.businessProfile.count({ where: { verified: true } }),
      this.db.businessProfile.count({ where: { kycStatus: 'pending' } }),
      this.db.event.count(),
      this.db.event.count({ where: { status: 'live' } }),
      this.db.event.count({ where: { status: 'draft' } }),
      this.db.event.count({ where: { status: 'cancelled' } }),
      this.db.booking.count({ where: { status: 'confirmed' } }),
      this.db.booking.count({ where: { status: 'cancelled' } }),
      this.db.booking.count({ where: { status: 'released' } }),
      this.db.review.count(),
      this.db.review.count({ where: { moderationStatus: 'flagged' } }),
      this.db.adminAuditLog.count({
        where: { createdAt: { gte: new Date(Date.now() - 7 * 86400 * 1000) } },
      }),
      this.wallet.ledgerInvariant(),
    ]);

    return {
      users: { total: usersTotal, verified: usersVerified, admins: adminCount },
      businessProfiles: { total: bpTotal, verified: bpVerified, pendingKyc: bpPending },
      events: {
        total: eventsTotal,
        live: eventsLive,
        draft: eventsDraft,
        cancelled: eventsCancelled,
      },
      bookings: {
        confirmed: bookingsConfirmed,
        cancelled: bookingsCancelled,
        released: bookingsReleased,
      },
      reviews: { total: reviewsTotal, flagged: reviewsFlagged },
      ledger,
      recentAuditCount: auditCount,
    };
  }

  // ============================================================
  // GET /admin/kyc/pending — queue with simple fraud flags
  // ============================================================
  async listPendingKyc(): Promise<PendingKycCase[]> {
    const rows = await this.db.businessProfile.findMany({
      where: { kycStatus: 'pending' },
      orderBy: { createdAt: 'asc' },
      take: 50,
      include: {
        user: {
          select: {
            id: true,
            phoneE164: true,
            email: true,
            city: true,
            createdAt: true,
          },
        },
      },
    });

    // Compute lightweight fraud signals up front.
    const cases: PendingKycCase[] = [];
    for (const r of rows) {
      const flags: string[] = [];

      // Signal: same phone has multiple pending profiles
      const sameUserPending = await this.db.businessProfile.count({
        where: { userId: r.userId, kycStatus: 'pending' },
      });
      if (sameUserPending > 1) flags.push('multiple_pending_per_user');

      // Signal: very fresh account
      const ageMs = Date.now() - new Date(r.user.createdAt).getTime();
      if (ageMs < 60 * 60 * 1000) flags.push('account_under_1h');

      // Signal: empty bio
      if (!r.bio || r.bio.trim().length < 10) flags.push('thin_bio');

      cases.push({
        id: r.id,
        username: r.username,
        displayName: r.displayName,
        type: r.type as 'organiser' | 'vendor',
        bio: r.bio,
        createdAt: r.createdAt.toISOString(),
        user: {
          id: r.user.id,
          phone: r.user.phoneE164,
          email: r.user.email,
          city: r.user.city,
          createdAt: r.user.createdAt.toISOString(),
        },
        flags,
      });
    }
    return cases;
  }

  // ============================================================
  // POST /admin/kyc/:profileId/approve
  // ============================================================
  async approveKyc(
    actorId: string,
    profileId: string,
    note: string | undefined,
    meta: { ip?: string; userAgent?: string },
  ): Promise<{ ok: true; kycStatus: 'approved' }> {
    await this.db.$transaction(async (tx) => {
      const profile = await tx.businessProfile.findUnique({ where: { id: profileId } });
      if (!profile) throw new NotFoundException({ code: 'profile_not_found' });
      if (profile.kycStatus === 'approved') {
        throw new BadRequestException({ code: 'already_approved' });
      }

      await tx.businessProfile.update({
        where: { id: profileId },
        data: { kycStatus: 'approved', verified: true },
      });

      await tx.adminAuditLog.create({
        data: {
          actorId,
          action: 'approve_kyc',
          targetTable: 'business_profiles',
          targetId: profileId,
          diff: { kycStatus: ['pending', 'approved'], verified: [profile.verified, true] },
          note: note ?? null,
          ip: meta.ip,
          userAgent: meta.userAgent,
        },
      });
    });

    // Notify the profile owner.
    const fresh = await this.db.businessProfile.findUnique({
      where: { id: profileId },
      select: { userId: true, username: true, displayName: true },
    });
    if (fresh) {
      void this.notifications.create({
        userId: fresh.userId,
        type: 'kyc_approved',
        title: `KYC approved for ${fresh.displayName}`,
        body: 'Your business profile is now verified. You can list events and receive payments.',
        link: `/org/${fresh.username}`,
        meta: { profileId, type: 'kyc_approved' },
      });
    }

    this.log.log(`KYC approved: ${profileId} (by ${actorId})`);
    return { ok: true, kycStatus: 'approved' };
  }

  // ============================================================
  // POST /admin/kyc/:profileId/reject
  // ============================================================
  async rejectKyc(
    actorId: string,
    profileId: string,
    input: KycActionDto,
    meta: { ip?: string; userAgent?: string },
  ): Promise<{ ok: true; kycStatus: 'rejected' }> {
    await this.db.$transaction(async (tx) => {
      const profile = await tx.businessProfile.findUnique({ where: { id: profileId } });
      if (!profile) throw new NotFoundException({ code: 'profile_not_found' });
      if (profile.kycStatus === 'rejected') {
        throw new BadRequestException({ code: 'already_rejected' });
      }

      await tx.businessProfile.update({
        where: { id: profileId },
        data: { kycStatus: 'rejected', verified: false },
      });

      await tx.adminAuditLog.create({
        data: {
          actorId,
          action: 'reject_kyc',
          targetTable: 'business_profiles',
          targetId: profileId,
          diff: {
            kycStatus: [profile.kycStatus, 'rejected'],
            verified: [profile.verified, false],
            reason: input.reason ?? null,
          },
          note: input.note ?? null,
          ip: meta.ip,
          userAgent: meta.userAgent,
        },
      });
    });

    // Notify the profile owner.
    const fresh = await this.db.businessProfile.findUnique({
      where: { id: profileId },
      select: { userId: true, username: true, displayName: true },
    });
    if (fresh) {
      void this.notifications.create({
        userId: fresh.userId,
        type: 'kyc_rejected',
        title: `KYC needs attention: ${fresh.displayName}`,
        body: input.note
          ? input.note
          : `Reason: ${input.reason ?? 'see admin note'}. Please update and resubmit.`,
        link: `/dashboard`,
        meta: { profileId, reason: input.reason ?? null, type: 'kyc_rejected' },
      });
    }

    this.log.log(`KYC rejected: ${profileId} (by ${actorId})`);
    return { ok: true, kycStatus: 'rejected' };
  }

  // ============================================================
  // GET /admin/audit-log — newest first
  // ============================================================
  async listAuditLog(limit = 50): Promise<AdminAuditEntry[]> {
    const rows = await this.db.adminAuditLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        actor: { select: { id: true, phoneE164: true, displayName: true } },
      },
    });
    return rows.map((r) => ({
      id: r.id,
      action: r.action,
      targetTable: r.targetTable,
      targetId: r.targetId,
      note: r.note,
      diff: (r.diff ?? {}) as Record<string, unknown>,
      ip: r.ip,
      userAgent: r.userAgent,
      createdAt: r.createdAt.toISOString(),
      actor: {
        id: r.actor.id,
        label:
          r.actor.displayName ??
          (r.actor.phoneE164 ? `User ${r.actor.phoneE164.slice(-4)}` : 'Admin'),
      },
    }));
  }
}
