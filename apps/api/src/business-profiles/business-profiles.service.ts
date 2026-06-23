import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { FollowersService } from '../followers/followers.service';
import { EventsService, type PublicEvent } from '../events/events.service';
import { ReviewsService } from '../reviews/reviews.service';
import type { CreateBusinessProfileDto, PublicBusinessProfile } from './dto/business-profile.dto';

@Injectable()
export class BusinessProfilesService {
  constructor(
    private readonly db: PrismaService,
    private readonly followers: FollowersService,
    private readonly events: EventsService,
    private readonly reviews: ReviewsService,
  ) {}

  // ============================================================
  // GET /business-profiles/:username/events?when=upcoming|past  (Step 7c)
  // ============================================================
  async listEvents(
    username: string,
    when: 'upcoming' | 'past',
  ): Promise<PublicEvent[]> {
    const profile = await this.db.businessProfile.findUnique({
      where: { username },
      select: { id: true },
    });
    if (!profile) throw new NotFoundException(`Profile @${username} not found`);
    return this.events.listForOrganiser(profile.id, when);
  }

  // ============================================================
  // GET /business-profiles/:username/reviews  (Step 7c)
  // Returns items + summary for the whole organiser.
  // ============================================================
  async listReviews(username: string) {
    const profile = await this.db.businessProfile.findUnique({
      where: { username },
      select: { id: true },
    });
    if (!profile) throw new NotFoundException(`Profile @${username} not found`);
    const [items, summary] = await Promise.all([
      this.reviews.listForOrganiser(profile.id),
      this.reviews.organiserSummary(profile.id),
    ]);
    return { items, summary };
  }

  async create(userId: string, input: CreateBusinessProfileDto): Promise<PublicBusinessProfile> {
    // One profile of each type per user. Catch the unique violation specifically
    // (username conflict) and surface it cleanly.
    const existingOfType = await this.db.businessProfile.findFirst({
      where: { userId, type: input.type },
    });
    if (existingOfType) {
      throw new ConflictException({
        code: 'profile_exists',
        message: `You already have a ${input.type} profile`,
      });
    }

    try {
      const row = await this.db.businessProfile.create({
        data: {
          userId,
          username: input.username,
          displayName: input.displayName,
          type: input.type,
          bio: input.bio ?? null,
          avatarUrl: input.avatarUrl ?? null,
          coverUrl: input.coverUrl ?? null,
          location: input.location ?? null,
          // KYC is pending until admin verifies. In dev we auto-approve to keep
          // the create-event flow unblocked.
          kycStatus: process.env.NODE_ENV === 'production' ? 'pending' : 'approved',
          verified: process.env.NODE_ENV !== 'production',
        },
      });

      // Also bump the user's primary role to match.
      await this.db.user.update({
        where: { id: userId },
        data: { primaryRole: input.type },
      });

      return this.toPublic(row);
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        throw new ConflictException({
          code: 'username_taken',
          message: 'That username is already taken',
        });
      }
      throw err;
    }
  }

  async listMine(userId: string): Promise<PublicBusinessProfile[]> {
    const rows = await this.db.businessProfile.findMany({
      where: { userId },
      orderBy: { createdAt: 'asc' },
    });
    return rows.map((r) => this.toPublic(r));
  }

  // ============================================================
  // Discover — public list of organiser + vendor profiles, ordered for
  // a default Explore feed (verified first, then by followers, then newest).
  // Used by /dashboard/feed when there's no search query yet.
  // ============================================================
  async discover(
    type: 'organiser' | 'vendor' | undefined,
    limit: number,
  ): Promise<PublicBusinessProfile[]> {
    const rows = await this.db.businessProfile.findMany({
      where: type ? { type } : {},
      orderBy: [
        { verified: 'desc' },
        { followersCount: 'desc' },
        { createdAt: 'desc' },
      ],
      take: limit,
    });
    return rows.map((r) => this.toPublic(r));
  }

  // ============================================================
  // Search across username / displayName / bio / location.
  // Case-insensitive substring match; orders verified profiles first,
  // then by follower count.
  // ============================================================
  async search(
    term: string,
    type: 'organiser' | 'vendor' | undefined,
    limit: number,
  ): Promise<PublicBusinessProfile[]> {
    const rows = await this.db.businessProfile.findMany({
      where: {
        ...(type && { type }),
        OR: [
          { username: { contains: term, mode: 'insensitive' } },
          { displayName: { contains: term, mode: 'insensitive' } },
          { bio: { contains: term, mode: 'insensitive' } },
          { location: { contains: term, mode: 'insensitive' } },
        ],
      },
      orderBy: [
        { verified: 'desc' },
        { followersCount: 'desc' },
        { displayName: 'asc' },
      ],
      take: limit,
    });
    return rows.map((r) => this.toPublic(r));
  }

  async findByUsername(
    username: string,
    viewerUserId?: string,
  ): Promise<PublicBusinessProfile> {
    const row = await this.db.businessProfile.findUnique({ where: { username } });
    if (!row) throw new NotFoundException(`Profile @${username} not found`);
    const pub = this.toPublic(row);
    if (viewerUserId) {
      pub.isFollowing = await this.followers.isFollowing(viewerUserId, row.id);
    }
    return pub;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private toPublic(r: any): PublicBusinessProfile {
    return {
      id: r.id,
      userId: r.userId,
      username: r.username,
      displayName: r.displayName,
      type: r.type,
      bio: r.bio,
      avatarUrl: r.avatarUrl ?? null,
      coverUrl: r.coverUrl ?? null,
      location: r.location ?? null,
      websiteUrl: r.websiteUrl ?? null,
      instagramUrl: r.instagramUrl ?? null,
      facebookUrl: r.facebookUrl ?? null,
      twitterUrl: r.twitterUrl ?? null,
      linkedinUrl: r.linkedinUrl ?? null,
      youtubeUrl: r.youtubeUrl ?? null,
      verified: r.verified,
      kycStatus: r.kycStatus,
      followersCount: r.followersCount,
      postsCount: r.postsCount ?? 0,
      avgRating: Number(r.avgRating),
      createdAt: r.createdAt.toISOString(),
    };
  }

  // ============================================================
  // PATCH /business-profiles/me — owner updates their own profile.
  // Only the owner can edit; username + type are immutable.
  // ============================================================
  async updateMine(
    userId: string,
    input: {
      username?: string;
      displayName?: string;
      bio?: string | null;
      avatarUrl?: string | null;
      coverUrl?: string | null;
      location?: string | null;
      websiteUrl?: string | null;
      instagramUrl?: string | null;
      facebookUrl?: string | null;
      twitterUrl?: string | null;
      linkedinUrl?: string | null;
      youtubeUrl?: string | null;
    },
  ): Promise<PublicBusinessProfile> {
    const own = await this.db.businessProfile.findFirst({ where: { userId } });
    if (!own) {
      throw new NotFoundException({
        code: 'profile_not_found',
        message: 'You need to create a business profile first.',
      });
    }

    // Username change — uniqueness handled by DB unique constraint.
    const usernameChanging =
      input.username !== undefined && input.username !== own.username;

    try {
      const updated = await this.db.businessProfile.update({
        where: { id: own.id },
        data: {
          ...(usernameChanging && { username: input.username }),
          ...(input.displayName !== undefined && { displayName: input.displayName }),
          ...(input.bio !== undefined && { bio: input.bio }),
          ...(input.avatarUrl !== undefined && { avatarUrl: input.avatarUrl }),
          ...(input.coverUrl !== undefined && { coverUrl: input.coverUrl }),
          ...(input.location !== undefined && { location: input.location }),
          ...(input.websiteUrl !== undefined && { websiteUrl: input.websiteUrl }),
          ...(input.instagramUrl !== undefined && { instagramUrl: input.instagramUrl }),
          ...(input.facebookUrl !== undefined && { facebookUrl: input.facebookUrl }),
          ...(input.twitterUrl !== undefined && { twitterUrl: input.twitterUrl }),
          ...(input.linkedinUrl !== undefined && { linkedinUrl: input.linkedinUrl }),
          ...(input.youtubeUrl !== undefined && { youtubeUrl: input.youtubeUrl }),
        },
      });
      return this.toPublic(updated);
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        throw new ConflictException({
          code: 'username_taken',
          message: 'That username is already taken.',
        });
      }
      throw err;
    }
  }
  // -----------------------------------------------
  // Public followers list for a stall-owner profile.
  // Returns a lightweight roster — name + avatar only.
  // -----------------------------------------------
  async listFollowers(username: string): Promise<
    Array<{ id: string; displayName: string | null; avatarUrl: string | null }>
  > {
    const profile = await this.db.businessProfile.findUnique({
      where: { username },
      select: { id: true },
    });
    if (!profile) return [];
    const rows = await this.db.follower.findMany({
      where: { businessProfileId: profile.id },
      orderBy: { createdAt: 'desc' },
      take: 200,
      include: {
        follower: {
          select: { id: true, displayName: true, avatarUrl: true },
        },
      },
    });
    return rows.map((r) => ({
      id: r.follower.id,
      displayName: r.follower.displayName,
      avatarUrl: r.follower.avatarUrl,
    }));
  }

}
