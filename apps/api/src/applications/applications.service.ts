import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import {
  APPLICATION_STATUSES,
  type ApplicationStatus,
  type DecideApplicationDto,
  type PublicApplication,
  type SubmitApplicationDto,
} from './dto/application.dto';

type ApplicationStatusFilter = ApplicationStatus | 'all';

@Injectable()
export class ApplicationsService {
  constructor(
    private readonly db: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  // ============================================================
  // POST /events/:slug/apply — vendor submits an application
  // ============================================================
  async submit(
    applicantUserId: string,
    eventSlug: string,
    input: SubmitApplicationDto,
  ): Promise<PublicApplication> {
    const event = await this.db.event.findUnique({
      where: { slug: eventSlug },
      include: { organiser: { select: { userId: true, username: true } } },
    });
    if (!event) throw new NotFoundException('Event not found');
    if (event.status === 'cancelled') {
      throw new BadRequestException({ code: 'event_cancelled', message: 'Event is cancelled.' });
    }
    if (new Date(event.endsAt).getTime() < Date.now()) {
      throw new BadRequestException({ code: 'event_ended', message: 'Event has ended.' });
    }
    if (event.organiser.userId === applicantUserId) {
      throw new BadRequestException({
        code: 'self_apply',
        message: "Organisers can't apply to their own event.",
      });
    }

    // Find the applicant's vendor profile if any (snapshot is optional).
    const profile = await this.db.businessProfile.findFirst({
      where: { userId: applicantUserId, type: 'vendor' },
    });

    try {
      const created = await this.db.eventApplication.create({
        data: {
          eventId: event.id,
          applicantUserId,
          profileId: profile?.id,
          businessName: input.businessName.trim(),
          category: input.category.trim(),
          productType: input.productType?.trim() || null,
          message: input.message?.trim() || null,
          status: 'submitted',
        },
        include: this.publicInclude(),
      });

      // Notify the organiser.
      await this.notifications.create({
        userId: event.organiser.userId,
        type: 'application_received',
        title: 'New stall application',
        body: `${input.businessName} applied to ${event.title}.`,
        link: `/dashboard/applications`,
      });

      return this.toPublic(created);
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        throw new ConflictException({
          code: 'already_applied',
          message: 'You have already applied to this event.',
        });
      }
      throw err;
    }
  }

  // ============================================================
  // GET /applications/mine — vendor sees own applications
  // ============================================================
  async listMine(
    userId: string,
    statusFilter: ApplicationStatusFilter = 'all',
  ): Promise<PublicApplication[]> {
    const rows = await this.db.eventApplication.findMany({
      where: {
        applicantUserId: userId,
        ...(statusFilter !== 'all' && { status: statusFilter }),
      },
      orderBy: { createdAt: 'desc' },
      include: this.publicInclude(),
    });
    return rows.map((r) => this.toPublic(r));
  }

  // ============================================================
  // GET /applications/received — organiser sees apps for their events
  // ============================================================
  async listReceived(
    organiserUserId: string,
    statusFilter: ApplicationStatusFilter = 'all',
  ): Promise<PublicApplication[]> {
    // Resolve the organiser's business profile(s) → event IDs.
    const orgProfiles = await this.db.businessProfile.findMany({
      where: { userId: organiserUserId, type: 'organiser' },
      select: { id: true },
    });
    if (orgProfiles.length === 0) return [];

    const rows = await this.db.eventApplication.findMany({
      where: {
        event: { organiserId: { in: orgProfiles.map((p) => p.id) } },
        ...(statusFilter !== 'all' && { status: statusFilter }),
      },
      orderBy: { createdAt: 'desc' },
      include: this.publicInclude(),
    });
    return rows.map((r) => this.toPublic(r));
  }

  // ============================================================
  // PATCH /applications/:id/decide — organiser approves / rejects
  // ============================================================
  async decide(
    organiserUserId: string,
    applicationId: string,
    input: DecideApplicationDto,
  ): Promise<PublicApplication> {
    const app = await this.db.eventApplication.findUnique({
      where: { id: applicationId },
      include: {
        event: { include: { organiser: { select: { userId: true, username: true } } } },
      },
    });
    if (!app) throw new NotFoundException('Application not found');
    if (app.event.organiser.userId !== organiserUserId) {
      throw new ForbiddenException('Only the event organiser can decide.');
    }

    // State-machine guard. From a terminal state (booked, rejected) you can't
    // move further.
    if (app.status === 'booked' || app.status === 'rejected') {
      throw new BadRequestException({
        code: 'terminal_state',
        message: `Application is already ${app.status}.`,
      });
    }

    let nextStatus: ApplicationStatus;
    let rejectionReason: string | null = null;
    if (input.decision === 'approve') {
      nextStatus = 'approved';
    } else if (input.decision === 'reject') {
      nextStatus = 'rejected';
      rejectionReason = input.rejectionReason?.trim() || null;
    } else {
      nextStatus = 'under_review';
    }

    const updated = await this.db.eventApplication.update({
      where: { id: applicationId },
      data: {
        status: nextStatus,
        decisionAt: input.decision === 'under_review' ? null : new Date(),
        decisionBy: input.decision === 'under_review' ? null : organiserUserId,
        rejectionReason,
      },
      include: this.publicInclude(),
    });

    // Notify the applicant.
    const verb =
      nextStatus === 'approved'
        ? 'approved'
        : nextStatus === 'rejected'
          ? 'rejected'
          : 'is under review';
    await this.notifications.create({
      userId: updated.applicantUserId,
      type: `application_${nextStatus}`,
      title: `Your stall application was ${verb}`,
      body: `${app.event.title}: ${updated.businessName}`,
      link: '/dashboard/bookings',
    });

    return this.toPublic(updated);
  }

  // ============================================================
  // Internal — bookings.service can call this when a booking gets
  // created via the application flow, to mark the app as 'booked'.
  // ============================================================
  async markBooked(applicationId: string, bookingId: string): Promise<void> {
    await this.db.eventApplication.updateMany({
      where: { id: applicationId, status: { in: ['approved', 'payment_pending'] } },
      data: { status: 'booked', bookingId },
    });
  }

  // ============================================================
  // Helpers
  // ============================================================
  private publicInclude(): Prisma.EventApplicationInclude {
    return {
      event: {
        select: {
          id: true,
          slug: true,
          title: true,
          startsAt: true,
          endsAt: true,
          coverImages: true,
          organiser: { select: { username: true } },
        },
      },
      applicant: {
        select: {
          id: true,
          displayName: true,
        },
      },
      profile: {
        select: {
          username: true,
          avatarUrl: true,
        },
      },
    };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private toPublic(row: any): PublicApplication {
    return {
      id: row.id,
      status: APPLICATION_STATUSES.includes(row.status)
        ? (row.status as ApplicationStatus)
        : 'submitted',
      businessName: row.businessName,
      category: row.category,
      productType: row.productType ?? null,
      message: row.message ?? null,
      rejectionReason: row.rejectionReason ?? null,
      createdAt: row.createdAt.toISOString(),
      decisionAt: row.decisionAt?.toISOString() ?? null,
      event: {
        id: row.event.id,
        slug: row.event.slug,
        title: row.event.title,
        startsAt: row.event.startsAt.toISOString(),
        endsAt: row.event.endsAt.toISOString(),
        coverImage: row.event.coverImages?.[0] ?? null,
        organiserUsername: row.event.organiser.username,
      },
      applicant: {
        id: row.applicant.id,
        displayName: row.applicant.displayName ?? null,
        profileUsername: row.profile?.username ?? null,
        profileAvatarUrl: row.profile?.avatarUrl ?? null,
      },
    };
  }
}
