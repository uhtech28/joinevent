import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type {
  CreatePostDto,
  CreateReplyDto,
  PublicPost,
  PublicReply,
} from './dto/post.dto';

@Injectable()
export class SocietyPostsService {
  constructor(private readonly db: PrismaService) {}

  async list(slug: string): Promise<PublicPost[]> {
    const society = await this.db.society.findUnique({ where: { slug }, select: { id: true } });
    if (!society) throw new NotFoundException({ code: 'society_not_found' });
    const rows = await this.db.societyPost.findMany({
      where: { societyId: society.id, moderation: 'approved' },
      orderBy: [{ pinnedAt: 'desc' }, { createdAt: 'desc' }],
      take: 50,
      include: {
        author: { select: { phoneE164: true, displayName: true } },
        _count: { select: { replies: true } },
      },
    });
    return rows.map((r) => ({
      id: r.id,
      societyId: r.societyId,
      title: r.title,
      body: r.body,
      author: { label: this.label(r.author) },
      createdAt: r.createdAt.toISOString(),
      replyCount: r._count.replies,
    }));
  }

  async create(userId: string, slug: string, input: CreatePostDto): Promise<PublicPost> {
    const society = await this.db.society.findUnique({ where: { slug }, select: { id: true } });
    if (!society) throw new NotFoundException({ code: 'society_not_found' });
    const row = await this.db.societyPost.create({
      data: {
        societyId: society.id,
        authorId: userId,
        title: input.title,
        body: input.body,
      },
      include: {
        author: { select: { phoneE164: true, displayName: true } },
        _count: { select: { replies: true } },
      },
    });
    return {
      id: row.id,
      societyId: row.societyId,
      title: row.title,
      body: row.body,
      author: { label: this.label(row.author) },
      createdAt: row.createdAt.toISOString(),
      replyCount: row._count.replies,
    };
  }

  async listReplies(postId: string): Promise<PublicReply[]> {
    const rows = await this.db.postReply.findMany({
      where: { postId },
      orderBy: { createdAt: 'asc' },
      include: { author: { select: { phoneE164: true, displayName: true } } },
    });
    return rows.map((r) => ({
      id: r.id,
      postId: r.postId,
      body: r.body,
      author: { label: this.label(r.author) },
      createdAt: r.createdAt.toISOString(),
    }));
  }

  async reply(userId: string, postId: string, input: CreateReplyDto): Promise<PublicReply> {
    const post = await this.db.societyPost.findUnique({ where: { id: postId } });
    if (!post) throw new NotFoundException({ code: 'post_not_found' });
    const row = await this.db.postReply.create({
      data: { postId, authorId: userId, body: input.body },
      include: { author: { select: { phoneE164: true, displayName: true } } },
    });
    return {
      id: row.id,
      postId: row.postId,
      body: row.body,
      author: { label: this.label(row.author) },
      createdAt: row.createdAt.toISOString(),
    };
  }

  private label(author: { phoneE164: string | null; displayName: string | null }): string {
    if (author.displayName) return author.displayName;
    if (author.phoneE164) return `User ${author.phoneE164.slice(-4)}`;
    return 'Anonymous';
  }
}
