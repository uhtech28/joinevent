// Auth DTOs validated with Zod inside the controller.
// Three sign-in methods: phone OTP, email/password, Google OAuth.

import { z } from 'zod';

// E.164 — leading "+", country code, 8-15 total digits.
const phoneE164 = z.string().regex(/^\+[1-9]\d{7,14}$/, 'Phone must be E.164 (e.g. +919876543210)');

// ---------- Phone OTP ----------
export const requestOtpSchema = z.object({
  phone: phoneE164,
});

export const verifyOtpSchema = z.object({
  phone: phoneE164,
  otp: z.string().regex(/^\d{4,8}$/, 'OTP must be 4-8 digits'),
});

// ---------- Email / password ----------
const emailSchema = z.string().email('Invalid email').max(255).toLowerCase();
// Min 8, must contain letter + digit. We can tighten this with zxcvbn later.
const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password too long')
  .regex(/[A-Za-z]/, 'Password must contain a letter')
  .regex(/[0-9]/, 'Password must contain a digit');

export const emailSignupSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  displayName: z.string().min(1).max(80).optional(),
});

export const emailSigninSchema = z.object({
  email: emailSchema,
  password: z.string().min(1).max(128),
});

export const verifyEmailSchema = z.object({
  token: z.string().min(20),
});

export const requestPasswordResetSchema = z.object({
  email: emailSchema,
});

export const resetPasswordSchema = z.object({
  token: z.string().min(20),
  password: passwordSchema,
});

// ---------- Onboarding ----------
export const onboardingSchema = z.object({
  role: z.enum(['organiser', 'vendor', 'user']),
  // When picking organiser/vendor we can optionally seed a business profile.
  displayName: z.string().min(1).max(80).optional(),
  city: z.string().min(1).max(80).optional(),
});

// ---------- Refresh / logout ----------
export const refreshSchema = z.object({
  refreshToken: z.string().min(20),
});

// ---------- Types ----------
export type RequestOtpDto = z.infer<typeof requestOtpSchema>;
export type VerifyOtpDto = z.infer<typeof verifyOtpSchema>;
export type EmailSignupDto = z.infer<typeof emailSignupSchema>;
export type EmailSigninDto = z.infer<typeof emailSigninSchema>;
export type RefreshDto = z.infer<typeof refreshSchema>;

export type AuthTokens = {
  accessToken: string;
  refreshToken: string;
  accessExpiresInSeconds: number;
  refreshExpiresInSeconds: number;
};

export type PublicUser = {
  id: string;
  phone: string | null;
  email: string | null;
  emailVerified: boolean;
  primaryRole: 'user' | 'organiser' | 'vendor' | string;
  isVerified: boolean;
  isAdmin: boolean;
  displayName: string | null;
  avatarUrl: string | null;
  city: string | null;
  onboardedAt: string | null;
  authMethods: Array<'phone' | 'email' | 'google'>;
};

export type OnboardingDto = z.infer<typeof onboardingSchema>;

// PATCH /auth/me — basic profile fields any signed-in user can update.
export const updateMeSchema = z.object({
  displayName: z
    .string()
    .trim()
    .min(1)
    .max(80)
    .nullable()
    .optional(),
  avatarUrl: z.string().url().max(500).nullable().optional(),
  city: z.string().trim().min(2).max(80).nullable().optional(),
});
export type UpdateMeDto = z.infer<typeof updateMeSchema>;
