// DTOs for the Posts module — Facebook-style feed content from a business profile.

import { z } from 'zod';

const url = z.string().url().max(500);

export const createPostSchema = z.object({
  content: z.string().min(1).max(2000),
  mediaUrls: z.array(url).max(4).optional(),
  eventId: z.string().uuid().optional(),
});

export type CreatePostDto = z.infer<typeof createPostSchema>;

export const createCommentSchema = z.object({
  content: z.string().min(1).max(800),
});

export type CreateCommentDto = z.infer<typeof createCommentSchema>;

// Public shape returned to the frontend.
export type PublicPost = {
  id: string;
  kind: 'text' | 'event' | 'image';
  content: string;
  mediaUrls: string[];
  eventId: string | null;
  likesCount: number;
  commentsCount: number;
  createdAt: string;
  liked: boolean;
  profile: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl: string | null;
    verified: boolean;
    type: 'organiser' | 'vendor';
  };
};

export type PublicComment = {
  id: string;
  content: string;
  createdAt: string;
  user: {
    id: string;
    displayName: string | null;
    avatarUrl: string | null;
  };
};
