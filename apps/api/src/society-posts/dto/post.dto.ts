import { z } from 'zod';

export const createPostSchema = z.object({
  title: z.string().trim().min(3).max(140),
  body: z.string().trim().min(10).max(4000),
});
export type CreatePostDto = z.infer<typeof createPostSchema>;

export const createReplySchema = z.object({
  body: z.string().trim().min(2).max(2000),
});
export type CreateReplyDto = z.infer<typeof createReplySchema>;

export type PublicPost = {
  id: string;
  societyId: string;
  title: string;
  body: string;
  author: { label: string };
  createdAt: string;
  replyCount: number;
};

export type PublicReply = {
  id: string;
  postId: string;
  body: string;
  author: { label: string };
  createdAt: string;
};
