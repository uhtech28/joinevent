import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import type { FollowedProfile, FollowToggleResponse } from './dto/follower.dto';

@Injectable()
export class FollowersService {
  private readonly log = new Logger(FollowersService.name);

  constructor(
    private readonly db: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  // ============================================================
  // POST /business-profiles/:username/follow
  // Atomic: insert follower row + bump count.
  // ============================================================
  async follow(userId: string, username: string): Promise<FollowToggleResponse> {
    const profile = await this.db.businessProfile.findUnique({ where: { username } });
    if (!profile) throw new NotFoundException({ code: 'profile_not_found' });
    if (profile.userId === userId) {
      throw new BadRequestException({
        code: 'cannot_follow_self',
        message: "You can't follow yourself",
      });
    }

    try {
      const result = await this.db.$transaction(async (tx) => {
        await tx.follower.create({
          data: { followerUserId: userId, businessProfileId: profile.id },
        });
        const updated = await tx.businessProfile.update({
          where: { id: profile.id },
          data: { followersCount: { increment: 1 } },
          select: { followersCount: true },
        });
        return updated.followersCount;
      });
      // Notify the followed user (best-effort).
      const follower = await this.db.user.findUnique({
        where: { id: userId },
        select: { phoneE164: true, displayName: true },
      });
      const followerLabel =
        follower?.displayName ??
        (follower?.phoneE164 ? `User ${follower.phoneE164.slice(-4)}` : 'Someone');
      void this.notifications.create({
        userId: profile.userId,
        type: 'new_follower',
        title: `${followerLabel} followed @${profile.username}`,
        body: `Your profile has ${result} follower${result === 1 ? '' : 's'} now.`,
        link: `/org/${profile.username}`,
        meta: {
          profileId: profile.id,
          followerUserId: userId,
          type: 'new_follower',
        },
      });
      return { isFollowing: true, followersCount: result };
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        // Already following — return current state idempotently.
        const fresh = await this.db.businessProfile.findUnique({
          where: { id: profile.id },
          select: { followersCount: true },
        });
        return { isFollowing: true, followersCount: fresh?.followersCount ?? 0 };
      }
      throw err;
    }
  }

  // ============================================================
  // DELETE /business-profiles/:username/follow
  // Atomic: delete follower row + decrement count.
  // ============================================================
  async unfollow(userId: string, username: string): Promise<FollowToggleResponse> {
    const profile = await this.db.businessProfile.findUnique({ where: { username } });
    if (!profile) throw new NotFoundException({ code: 'profile_not_found' });

    const result = await this.db.$transaction(async (tx) => {
      const { count } = await tx.follower.deleteMany({
        where: { followerUserId: userId, businessProfileId: profile.id },
      });
      if (count === 0) {
        const fresh = await tx.businessProfile.findUnique({
          where: { id: profile.id },
          select: { followersCount: true },
        });
        return fresh?.followersCount ?? 0;
      }
      // Use GREATEST to defend against any historical drift (should never go below 0).
      const updated = await tx.$queryRaw<Array<{ followers_count: number }>>(Prisma.sql`
        UPDATE "business_profiles"
        SET "followers_count" = GREATEST(0, "followers_count" - 1)
        WHERE "id" = ${profile.id}::uuid
        RETURNING "followers_count"
      `);
      return updated[0]!.followers_count;
    });
    return { isFollowing: false, followersCount: result };
  }

  // ============================================================
  // GET /following — profiles the current user follows
  // ============================================================
  async listFollowing(userId: string): Promise<FollowedProfile[]> {
    const rows = await this.db.follower.findMany({
      where: { followerUserId: userId },
      orderBy: { createdAt: 'desc' },
      include: {
        profile: {
          select: {
            id: true,
            username: true,
            displayName: true,
            type: true,
            verified: true,
            followersCount: true,
            avgRating: true,
          },
        },
      },
    });
    return rows.map((r) => ({
      id: r.profile.id,
      username: r.profile.username,
      displayName: r.profile.displayName,
      type: r.profile.type as 'organiser' | 'vendor',
      verified: r.profile.verified,
      followersCount: r.profile.followersCount,
      avgRating: Number(r.profile.avgRating),
      followedAt: r.createdAt.toISOString(),
    }));
  }

  // ============================================================
  // Used by BusinessProfileService to populate isFollowing on detail.
  // ============================================================
  async isFollowing(userId: string, businessProfileId: string): Promise<boolean> {
    const row = await this.db.follower.findFirst({
      where: { followerUserId: userId, businessProfileId },
      select: { id: true },
    });
    return !!row;
  }
}
