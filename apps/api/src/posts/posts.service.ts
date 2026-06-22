import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type {
  CreateCommentDto,
  CreatePostDto,
  PublicComment,
  PublicPost,
} from './dto/post.dto';

@Injectable()
export class PostsService {
  constructor(private readonly db: PrismaService) {}

  // ============================================================
  // POST /posts — owner creates a post on their own profile.
  // Resolves the caller's first business profile and posts as it.
  // ============================================================
  async create(userId: string, input: CreatePostDto): Promise<PublicPost> {
    const profile = await this.db.businessProfile.findFirst({
      where: { userId },
    });
    if (!profile) {
      throw new ForbiddenException({
        code: 'no_profile',
        message: 'Create a business profile before posting.',
      });
    }

    const kind = input.eventId
      ? 'event'
      : input.mediaUrls && input.mediaUrls.length > 0
        ? 'image'
        : 'text';

    const created = await this.db.post.create({
      data: {
        profileId: profile.id,
        kind,
        content: input.content,
        mediaUrls:
          input.mediaUrls && input.mediaUrls.length > 0
            ? (input.mediaUrls as Prisma.InputJsonValue)
            : Prisma.JsonNull,
        eventId: input.eventId ?? null,
      },
    });

    // Denormalised counter on the profile.
    await this.db.businessProfile.update({
      where: { id: profile.id },
      data: { postsCount: { increment: 1 } },
    });

    return this.toPublicPost(created, profile, false);
  }

  // ============================================================
  // GET /posts/profile/:username — public feed for one profile.
  // ============================================================
  async listForProfile(
    username: string,
    viewerUserId: string | null,
    cursor?: string,
    limit = 20,
  ): Promise<{ items: PublicPost[]; nextCursor: string | null }> {
    const profile = await this.db.businessProfile.findUnique({
      where: { username },
    });
    if (!profile) {
      throw new NotFoundException(`Profile @${username} not found`);
    }

    const take = Math.min(Math.max(limit, 1), 50);
    const rows = await this.db.post.findMany({
      where: { profileId: profile.id, deletedAt: null },
      orderBy: { createdAt: 'desc' },
      take: take + 1,
      ...(cursor && { cursor: { id: cursor }, skip: 1 }),
    });

    const hasNext = rows.length > take;
    const slice = hasNext ? rows.slice(0, take) : rows;
    const liked = viewerUserId
      ? await this.likedSet(viewerUserId, slice.map((p) => p.id))
      : new Set<string>();

    return {
      items: slice.map((p) => this.toPublicPost(p, profile, liked.has(p.id))),
      nextCursor: hasNext ? slice[slice.length - 1].id : null,
    };
  }

  // ============================================================
  // GET /posts/feed — posts from profiles the viewer follows.
  // ============================================================
  async feed(
    viewerUserId: string,
    cursor?: string,
    limit = 20,
  ): Promise<{ items: PublicPost[]; nextCursor: string | null }> {
    const follows = await this.db.follower.findMany({
      where: { followerUserId: viewerUserId },
      select: { businessProfileId: true },
    });
    if (follows.length === 0) {
      return { items: [], nextCursor: null };
    }
    const profileIds = follows.map((f) => f.businessProfileId);

    const take = Math.min(Math.max(limit, 1), 50);
    const rows = await this.db.post.findMany({
      where: { profileId: { in: profileIds }, deletedAt: null },
      orderBy: { createdAt: 'desc' },
      take: take + 1,
      ...(cursor && { cursor: { id: cursor }, skip: 1 }),
      include: { profile: true },
    });

    const hasNext = rows.length > take;
    const slice = hasNext ? rows.slice(0, take) : rows;
    const liked = await this.likedSet(viewerUserId, slice.map((p) => p.id));

    return {
      items: slice.map((p) => this.toPublicPost(p, p.profile, liked.has(p.id))),
      nextCursor: hasNext ? slice[slice.length - 1].id : null,
    };
  }

  // ============================================================
  // POST /posts/:id/like — toggle like.
  // Returns { liked, likesCount }.
  // ============================================================
  async toggleLike(
    userId: string,
    postId: string,
  ): Promise<{ liked: boolean; likesCount: number }> {
    const post = await this.db.post.findUnique({ where: { id: postId } });
    if (!post || post.deletedAt) {
      throw new NotFoundException('Post not found');
    }

    const existing = await this.db.postLike.findUnique({
      where: { postId_userId: { postId, userId } },
    });

    if (existing) {
      await this.db.$transaction([
        this.db.postLike.delete({ where: { postId_userId: { postId, userId } } }),
        this.db.post.update({
          where: { id: postId },
          data: { likesCount: { decrement: 1 } },
        }),
      ]);
      return { liked: false, likesCount: Math.max(0, post.likesCount - 1) };
    }

    await this.db.$transaction([
      this.db.postLike.create({ data: { postId, userId } }),
      this.db.post.update({
        where: { id: postId },
        data: { likesCount: { increment: 1 } },
      }),
    ]);
    return { liked: true, likesCount: post.likesCount + 1 };
  }

  // ============================================================
  // POST /posts/:id/comments — add a comment.
  // ============================================================
  async addComment(
    userId: string,
    postId: string,
    input: CreateCommentDto,
  ): Promise<PublicComment> {
    const post = await this.db.post.findUnique({ where: { id: postId } });
    if (!post || post.deletedAt) {
      throw new NotFoundException('Post not found');
    }

    const [comment] = await this.db.$transaction([
      this.db.postComment.create({
        data: { postId, userId, content: input.content },
        include: { post: false },
      }),
      this.db.post.update({
        where: { id: postId },
        data: { commentsCount: { increment: 1 } },
      }),
    ]);

    const user = await this.db.user.findUnique({
      where: { id: userId },
      select: { id: true, displayName: true, avatarUrl: true },
    });

    return {
      id: comment.id,
      content: comment.content,
      createdAt: comment.createdAt.toISOString(),
      user: {
        id: user!.id,
        displayName: user!.displayName ?? null,
        avatarUrl: user!.avatarUrl ?? null,
      },
    };
  }

  // ============================================================
  // GET /posts/:id/comments — list comments, newest first.
  // ============================================================
  async listComments(postId: string, limit = 30): Promise<PublicComment[]> {
    const rows = await this.db.postComment.findMany({
      where: { postId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
      take: Math.min(Math.max(limit, 1), 100),
    });
    if (rows.length === 0) return [];

    const userIds = Array.from(new Set(rows.map((r) => r.userId)));
    const users = await this.db.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, displayName: true, avatarUrl: true },
    });
    const byId = new Map(users.map((u) => [u.id, u]));

    return rows.map((c) => ({
      id: c.id,
      content: c.content,
      createdAt: c.createdAt.toISOString(),
      user: {
        id: c.userId,
        displayName: byId.get(c.userId)?.displayName ?? null,
        avatarUrl: byId.get(c.userId)?.avatarUrl ?? null,
      },
    }));
  }

  // ============================================================
  // DELETE /posts/:id — owner-only soft delete.
  // ============================================================
  async deleteOwn(userId: string, postId: string): Promise<{ ok: true }> {
    const post = await this.db.post.findUnique({
      where: { id: postId },
      include: { profile: true },
    });
    if (!post || post.deletedAt) throw new NotFoundException('Post not found');
    if (post.profile.userId !== userId) {
      throw new ForbiddenException('You do not own this post');
    }
    await this.db.$transaction([
      this.db.post.update({
        where: { id: postId },
        data: { deletedAt: new Date() },
      }),
      this.db.businessProfile.update({
        where: { id: post.profileId },
        data: { postsCount: { decrement: 1 } },
      }),
    ]);
    return { ok: true };
  }

  // ============================================================
  // Helpers
  // ============================================================
  private async likedSet(userId: string, postIds: string[]): Promise<Set<string>> {
    if (postIds.length === 0) return new Set();
    const rows = await this.db.postLike.findMany({
      where: { userId, postId: { in: postIds } },
      select: { postId: true },
    });
    return new Set(rows.map((r) => r.postId));
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private toPublicPost(p: any, profile: any, liked: boolean): PublicPost {
    return {
      id: p.id,
      kind: p.kind,
      content: p.content,
      mediaUrls: Array.isArray(p.mediaUrls) ? (p.mediaUrls as string[]) : [],
      eventId: p.eventId ?? null,
      likesCount: p.likesCount,
      commentsCount: p.commentsCount,
      createdAt: p.createdAt.toISOString(),
      liked,
      profile: {
        id: profile.id,
        username: profile.username,
        displayName: profile.displayName,
        avatarUrl: profile.avatarUrl ?? null,
        verified: profile.verified,
        type: profile.type,
      },
    };
  }
}
