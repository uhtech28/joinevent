import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type {
  NotificationsListResponse,
  PublicNotification,
  UnreadCountResponse,
} from './dto/notification.dto';

/**
 * NotificationsService — single fan-out point.
 *
 * The four domain services (bookings, reviews, followers, admin) call
 * `create()` after their primary mutation succeeds. We don't gate the
 * primary mutation on this — a failed notification should never roll
 * back a successful booking.
 */
@Injectable()
export class NotificationsService {
  private readonly log = new Logger(NotificationsService.name);

  constructor(private readonly db: PrismaService) {}

  // ============================================================
  async create(input: {
    userId: string;
    type: string;
    title: string;
    body?: string;
    link?: string;
    meta?: Record<string, unknown>;
  }): Promise<void> {
    try {
      await this.db.notification.create({
        data: {
          userId: input.userId,
          type: input.type,
          title: input.title,
          body: input.body ?? null,
          link: input.link ?? null,
          meta: (input.meta ?? {}) as Prisma.InputJsonValue,
        },
      });
    } catch (err) {
      // Best-effort: log and move on. Never throw from a side-effect.
      this.log.warn(
        `Notification create failed for user ${input.userId}: ${(err as Error).message}`,
      );
    }
  }

  // ============================================================
  async listForUser(
    userId: string,
    params: { limit?: number; cursor?: string; onlyUnread?: boolean } = {},
  ): Promise<NotificationsListResponse> {
    const limit = params.limit ?? 30;
    const rows = await this.db.notification.findMany({
      where: { userId, ...(params.onlyUnread && { readAt: null }) },
      orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
      take: limit + 1,
      ...(params.cursor ? { cursor: { id: params.cursor }, skip: 1 } : {}),
    });
    const hasMore = rows.length > limit;
    const sliced = hasMore ? rows.slice(0, limit) : rows;
    return {
      items: sliced.map((r) => this.toPublic(r)),
      nextCursor: hasMore ? sliced[sliced.length - 1].id : null,
    };
  }

  // ============================================================
  async unreadCount(userId: string): Promise<UnreadCountResponse> {
    const unread = await this.db.notification.count({
      where: { userId, readAt: null },
    });
    return { unread };
  }

  // ============================================================
  async markRead(userId: string, notificationId: string): Promise<{ ok: true }> {
    const row = await this.db.notification.findUnique({
      where: { id: notificationId },
    });
    if (!row || row.userId !== userId) {
      throw new NotFoundException({ code: 'notification_not_found' });
    }
    if (!row.readAt) {
      await this.db.notification.update({
        where: { id: notificationId },
        data: { readAt: new Date() },
      });
    }
    return { ok: true };
  }

  // ============================================================
  async markAllRead(userId: string): Promise<{ markedRead: number }> {
    const result = await this.db.notification.updateMany({
      where: { userId, readAt: null },
      data: { readAt: new Date() },
    });
    return { markedRead: result.count };
  }

  // ============================================================
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private toPublic(r: any): PublicNotification {
    return {
      id: r.id,
      type: r.type,
      title: r.title,
      body: r.body,
      link: r.link,
      meta: r.meta,
      readAt: r.readAt ? r.readAt.toISOString() : null,
      createdAt: r.createdAt.toISOString(),
    };
  }
}
