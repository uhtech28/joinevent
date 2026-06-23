// DTOs for business-profile creation and read.

import { z } from 'zod';

// usernames are slug-style: lowercase, dashes, 3-32 chars.
const usernameRegex = /^[a-z0-9](?:[a-z0-9-]{1,30}[a-z0-9])$/;
const usernameField = z
  .string()
  .min(3)
  .max(32)
  .regex(usernameRegex, 'Username must be lowercase letters/digits/dashes (e.g. green-acres-rwa)');

// Accept absolute http(s) URLs OR relative paths (e.g. /api/v1/storage/profiles/…)
// returned by our own /uploads endpoint. Cap length to keep DB sane.
const url = z
  .string()
  .max(500)
  .refine((v) => /^https?:\/\//.test(v) || v.startsWith('/'), {
    message: 'Must be an absolute URL or a path starting with /',
  });

// Strict absolute URL for social links — must be http or https.
const absoluteUrl = z
  .string()
  .max(500)
  .refine((v) => /^https?:\/\//.test(v), {
    message: 'Must start with https:// or http://',
  });

export const createBusinessProfileSchema = z.object({
  username: usernameField,
  displayName: z.string().min(2).max(80),
  type: z.enum(['organiser', 'vendor']),
  bio: z.string().max(800).optional(),
  avatarUrl: url.optional(),
  coverUrl: url.optional(),
  location: z.string().max(120).optional(),
});

export type CreateBusinessProfileDto = z.infer<typeof createBusinessProfileSchema>;

// PATCH /business-profiles/me — owner edits their own profile.
// Type is immutable. Username CAN be changed but uniqueness is enforced.
export const updateBusinessProfileSchema = z.object({
  username: usernameField.optional(),
  displayName: z.string().min(2).max(80).optional(),
  bio: z.string().max(800).nullable().optional(),
  avatarUrl: url.nullable().optional(),
  coverUrl: url.nullable().optional(),
  location: z.string().max(120).nullable().optional(),
  websiteUrl: absoluteUrl.nullable().optional(),
  instagramUrl: absoluteUrl.nullable().optional(),
  facebookUrl: absoluteUrl.nullable().optional(),
  twitterUrl: absoluteUrl.nullable().optional(),
  linkedinUrl: absoluteUrl.nullable().optional(),
  youtubeUrl: absoluteUrl.nullable().optional(),
});

export type UpdateBusinessProfileDto = z.infer<typeof updateBusinessProfileSchema>;

export type PublicBusinessProfile = {
  id: string;
  userId: string;
  username: string;
  displayName: string;
  type: 'organiser' | 'vendor';
  bio: string | null;
  avatarUrl: string | null;
  coverUrl: string | null;
  location: string | null;
  websiteUrl: string | null;
  instagramUrl: string | null;
  facebookUrl: string | null;
  twitterUrl: string | null;
  linkedinUrl: string | null;
  youtubeUrl: string | null;
  verified: boolean;
  kycStatus: 'pending' | 'approved' | 'rejected';
  followersCount: number;
  postsCount: number;
  avgRating: number;
  createdAt: string;
  /** Populated on detail endpoints when the request is authenticated. */
  isFollowing?: boolean;
};
