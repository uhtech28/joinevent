import {
  BadRequestException,
  ConflictException,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { createHash, randomBytes, randomInt, timingSafeEqual } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { SmsService } from './sms.service';
import { EmailService } from './email.service';
import { loadEnv } from '../env';
import type { AuthTokens, PublicUser } from './dto/auth.dto';

// bcrypt is lazy-loaded so dev doesn't need the dep if you only use OTP.
type BcryptNs = typeof import('bcrypt');
let bcryptCache: BcryptNs | null = null;
function bcrypt(): BcryptNs {
  if (bcryptCache) return bcryptCache;
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  bcryptCache = require('bcrypt') as BcryptNs;
  return bcryptCache;
}

class TooManyRequests extends HttpException {
  constructor(message: string) {
    super({ statusCode: 429, message, code: 'too_many_requests' }, HttpStatus.TOO_MANY_REQUESTS);
  }
}

@Injectable()
export class AuthService {
  private readonly log = new Logger(AuthService.name);

  constructor(
    private readonly db: PrismaService,
    private readonly redis: RedisService,
    private readonly jwt: JwtService,
    private readonly sms: SmsService,
    private readonly email: EmailService,
  ) {}

  // ============================================================
  // PHONE — OTP request / verify (unchanged behaviour from Step 3)
  // ============================================================
  async requestOtp(phone: string): Promise<{ delivered: true; otpDevOnly?: string }> {
    const env = loadEnv();
    const rateKey = `otp:rate:${phone}`;
    const count = await this.redis.incrWithTtl(rateKey, env.OTP_REQUEST_WINDOW_SECONDS);
    if (count > env.OTP_REQUEST_LIMIT) {
      throw new TooManyRequests(`Too many OTP requests. Try again in a few minutes.`);
    }
    const otp = this.generateOtp(env.OTP_LENGTH);
    const hash = this.hashOtp(otp, phone);
    await this.redis.set(`otp:hash:${phone}`, hash, env.OTP_TTL_SECONDS);
    await this.sms.sendOtp(phone, otp);
    return {
      delivered: true,
      ...(env.OTP_RETURN_IN_RESPONSE ? { otpDevOnly: otp } : {}),
    };
  }

  async verifyOtp(
    phone: string,
    otp: string,
    meta: { ip?: string; userAgent?: string },
  ): Promise<{ user: PublicUser; tokens: AuthTokens }> {
    const stored = await this.redis.get(`otp:hash:${phone}`);
    if (!stored) {
      throw new UnauthorizedException({ code: 'otp_expired', message: 'OTP expired or not requested' });
    }
    const candidate = this.hashOtp(otp, phone);
    if (!this.constantTimeEqual(stored, candidate)) {
      throw new UnauthorizedException({ code: 'otp_invalid', message: 'OTP did not match' });
    }
    await this.redis.del(`otp:hash:${phone}`);
    await this.redis.del(`otp:rate:${phone}`);

    const user = await this.db.user.upsert({
      where: { phoneE164: phone },
      update: {},
      create: {
        phoneE164: phone,
        authProvider: 'otp',
        primaryRole: 'user',
        isVerified: true,
      },
    });

    const tokens = await this.issueTokens(user.id, meta);
    return { user: this.toPublicUser(user), tokens };
  }

  // ============================================================
  // EMAIL — signup / signin / verify / password reset
  // ============================================================

  async emailSignup(
    email: string,
    password: string,
    displayName: string | undefined,
    meta: { ip?: string; userAgent?: string },
  ): Promise<{ user: PublicUser; tokens: AuthTokens; verificationSent: boolean }> {
    const env = loadEnv();
    const existing = await this.db.user.findUnique({ where: { email } });

    if (existing && existing.passwordHash) {
      throw new ConflictException({
        code: 'email_taken',
        message: 'An account with this email already exists. Try signing in instead.',
      });
    }

    if (password.length < env.PASSWORD_MIN_LENGTH) {
      throw new BadRequestException({
        code: 'weak_password',
        message: `Password must be at least ${env.PASSWORD_MIN_LENGTH} characters`,
      });
    }
    const hash = await bcrypt().hash(password, env.BCRYPT_ROUNDS);

    let user;
    if (existing) {
      // User exists from Google / phone — attach password.
      user = await this.db.user.update({
        where: { id: existing.id },
        data: { passwordHash: hash, displayName: existing.displayName ?? displayName ?? null },
      });
    } else {
      user = await this.db.user.create({
        data: {
          email,
          passwordHash: hash,
          displayName: displayName ?? null,
          authProvider: 'email',
          primaryRole: 'user',
          isVerified: false,
        },
      });
    }

    // Issue a verification token (24h) + send email.
    const sent = await this.sendVerificationEmail(user.id, email);

    const tokens = await this.issueTokens(user.id, meta);
    return { user: this.toPublicUser(user), tokens, verificationSent: sent };
  }

  async emailSignin(
    email: string,
    password: string,
    meta: { ip?: string; userAgent?: string },
  ): Promise<{ user: PublicUser; tokens: AuthTokens }> {
    const user = await this.db.user.findUnique({ where: { email } });

    // If the account doesn't exist (or has no password set), don't try bcrypt
    // at all — but still burn ~60 ms so timing-side-channels can't easily
    // distinguish "unknown email" from "wrong password".
    if (!user || !user.passwordHash || user.deletedAt) {
      await new Promise((r) => setTimeout(r, 60));
      throw new UnauthorizedException({
        code: 'invalid_credentials',
        message: 'Email or password is incorrect',
      });
    }

    const ok = await bcrypt().compare(password, user.passwordHash);
    if (!ok) {
      throw new UnauthorizedException({
        code: 'invalid_credentials',
        message: 'Email or password is incorrect',
      });
    }

    const tokens = await this.issueTokens(user.id, meta);
    return { user: this.toPublicUser(user), tokens };
  }

  async verifyEmail(token: string): Promise<{ ok: true }> {
    const key = `email_verify:${this.tokenHash(token)}`;
    const userId = await this.redis.get(key);
    if (!userId) {
      throw new BadRequestException({ code: 'token_invalid', message: 'Verification link expired or invalid' });
    }
    await this.redis.del(key);
    await this.db.user.update({
      where: { id: userId },
      data: { emailVerifiedAt: new Date(), isVerified: true },
    });
    return { ok: true };
  }

  async requestPasswordReset(email: string): Promise<{ ok: true }> {
    const user = await this.db.user.findUnique({ where: { email } });
    // Always return ok so we don't leak whether the email is registered.
    if (!user || !user.passwordHash) return { ok: true };

    const token = randomBytes(32).toString('hex');
    await this.redis.set(`password_reset:${this.tokenHash(token)}`, user.id, 3600); // 1h
    const link = `${process.env.PUBLIC_WEB_URL ?? 'http://localhost:3000'}/reset-password?token=${token}`;
    await this.email.resetPassword(email, link);
    return { ok: true };
  }

  async resetPassword(token: string, password: string): Promise<{ ok: true }> {
    const env = loadEnv();
    const key = `password_reset:${this.tokenHash(token)}`;
    const userId = await this.redis.get(key);
    if (!userId) {
      throw new BadRequestException({ code: 'token_invalid', message: 'Reset link expired or invalid' });
    }
    if (password.length < env.PASSWORD_MIN_LENGTH) {
      throw new BadRequestException({ code: 'weak_password' });
    }
    await this.redis.del(key);
    const hash = await bcrypt().hash(password, env.BCRYPT_ROUNDS);
    await this.db.user.update({ where: { id: userId }, data: { passwordHash: hash } });
    // Belt + braces: revoke all sessions so a thief loses access.
    await this.db.userSession.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    return { ok: true };
  }

  // ============================================================
  // GOOGLE OAUTH — handle the verified Google profile
  // Called by passport-google-oauth20's verify callback.
  // ============================================================
  async upsertGoogleUser(
    profile: { googleId: string; email: string; displayName?: string },
    meta: { ip?: string; userAgent?: string },
  ): Promise<{ user: PublicUser; tokens: AuthTokens }> {
    // 1. Try to find by googleId first.
    let user = await this.db.user.findUnique({ where: { googleId: profile.googleId } });

    if (!user) {
      // 2. Otherwise, link by email (account merge).
      const byEmail = await this.db.user.findUnique({ where: { email: profile.email } });
      if (byEmail) {
        user = await this.db.user.update({
          where: { id: byEmail.id },
          data: {
            googleId: profile.googleId,
            emailVerifiedAt: byEmail.emailVerifiedAt ?? new Date(),
            isVerified: true,
            displayName: byEmail.displayName ?? profile.displayName ?? null,
          },
        });
      } else {
        // 3. Brand new user.
        user = await this.db.user.create({
          data: {
            googleId: profile.googleId,
            email: profile.email,
            emailVerifiedAt: new Date(), // Google verified the email
            authProvider: 'google',
            primaryRole: 'user',
            isVerified: true,
            displayName: profile.displayName ?? null,
          },
        });
      }
    }

    const tokens = await this.issueTokens(user.id, meta);
    return { user: this.toPublicUser(user), tokens };
  }

  // ============================================================
  // REFRESH / LOGOUT / ME (unchanged)
  // ============================================================
  async refresh(
    refreshToken: string,
    meta: { ip?: string; userAgent?: string },
  ): Promise<{ user: PublicUser; tokens: AuthTokens }> {
    const hash = this.hashRefreshToken(refreshToken);
    const session = await this.db.userSession.findFirst({ where: { refreshTokenHash: hash } });

    if (!session) {
      throw new UnauthorizedException({ code: 'refresh_invalid', message: 'Refresh token not recognised' });
    }
    if (session.revokedAt) {
      await this.db.userSession.updateMany({
        where: { userId: session.userId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      throw new UnauthorizedException({ code: 'refresh_reused', message: 'Refresh token reuse detected; all sessions revoked' });
    }
    if (session.expiresAt < new Date()) {
      throw new UnauthorizedException({ code: 'refresh_expired', message: 'Refresh token expired' });
    }
    const user = await this.db.user.findUnique({ where: { id: session.userId } });
    if (!user || user.deletedAt) {
      throw new UnauthorizedException({ code: 'user_inactive', message: 'User no longer active' });
    }
    await this.db.userSession.update({
      where: { id: session.id },
      data: { revokedAt: new Date(), lastUsedAt: new Date() },
    });
    const tokens = await this.issueTokens(user.id, meta);
    return { user: this.toPublicUser(user), tokens };
  }

  async logout(refreshToken: string): Promise<void> {
    const hash = this.hashRefreshToken(refreshToken);
    await this.db.userSession.updateMany({
      where: { refreshTokenHash: hash, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  // ============================================================
  // ACCOUNT DELETE — soft delete: sets deletedAt + revokes all sessions.
  // Anonymises identifying fields so the username/email/phone is freed up
  // for a future re-signup. Domain rows (events, reviews, bookings) stay intact.
  // ============================================================
  async softDeleteUser(userId: string): Promise<void> {
    const user = await this.db.user.findUnique({ where: { id: userId } });
    if (!user || user.deletedAt) return;
    const now = new Date();
    const suffix = `-deleted-${now.getTime()}`;
    await this.db.$transaction([
      this.db.user.update({
        where: { id: userId },
        data: {
          deletedAt: now,
          phoneE164: user.phoneE164 ? `${user.phoneE164}${suffix}` : null,
          email: user.email ? `${user.email}${suffix}` : null,
          googleId: user.googleId ? `${user.googleId}${suffix}` : null,
          passwordHash: null,
        },
      }),
      this.db.userSession.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: now },
      }),
    ]);
  }

  async findUserPublic(userId: string): Promise<PublicUser | null> {
    const user = await this.db.user.findUnique({ where: { id: userId } });
    if (!user || user.deletedAt) return null;
    return this.toPublicUser(user);
  }

  // ============================================================
  // PATCH /auth/me — current user updates their basic profile.
  // For member-role users this is how they pick the display name + avatar
  // shown on their comments. Organisers/vendors use BusinessProfile.updateMine
  // instead — this endpoint only writes to the User row.
  // ============================================================
  async updateMe(
    userId: string,
    input: { displayName?: string | null; avatarUrl?: string | null; city?: string | null },
  ): Promise<PublicUser> {
    const user = await this.db.user.findUnique({ where: { id: userId } });
    if (!user || user.deletedAt) {
      throw new UnauthorizedException({ code: 'user_inactive' });
    }
    try {
      const updated = await this.db.user.update({
        where: { id: userId },
        data: {
          ...(input.displayName !== undefined && { displayName: input.displayName }),
          ...(input.avatarUrl !== undefined && { avatarUrl: input.avatarUrl }),
          ...(input.city !== undefined && { city: input.city }),
        },
      });
      return this.toPublicUser(updated);
    } catch (err) {
      // Surface the real cause to the API terminal instead of a generic 500.
      // The most common one in dev is "column users.avatar_url does not exist"
      // when the new migration hasn't been applied yet.
      // eslint-disable-next-line no-console
      console.error(
        `[auth.updateMe] failed for user ${userId}: ${(err as Error).message}`,
      );
      throw err;
    }
  }

  // ============================================================
  // ONBOARDING — first-run role picker
  // ============================================================
  async onboard(
    userId: string,
    input: { role: 'organiser' | 'vendor' | 'user'; displayName?: string; city?: string },
  ): Promise<PublicUser> {
    const user = await this.db.user.findUnique({ where: { id: userId } });
    if (!user || user.deletedAt) {
      throw new UnauthorizedException({ code: 'user_inactive' });
    }
    if (user.onboardedAt) {
      // Idempotent: returning the same shape lets the frontend treat re-runs as no-ops.
      return this.toPublicUser(user);
    }

    // Build the patch in one transaction with optional BusinessProfile creation.
    const updated = await this.db.$transaction(async (tx) => {
      const u = await tx.user.update({
        where: { id: userId },
        data: {
          primaryRole: input.role,
          onboardedAt: new Date(),
          displayName: input.displayName ?? user.displayName,
          city: input.city ?? user.city,
        },
      });

      // Auto-create a BusinessProfile shell for organisers/vendors so they
      // land on a dashboard that actually shows the right sections.
      if (input.role !== 'user') {
        const username = this.generateUsername(
          input.displayName ?? u.email ?? u.phoneE164 ?? `user-${u.id.slice(0, 6)}`,
        );
        await tx.businessProfile.create({
          data: {
            userId: u.id,
            username,
            displayName: input.displayName ?? u.displayName ?? username,
            type: input.role, // 'organiser' | 'vendor' — only field that exists in schema
            verified: false,
          },
        });
      }
      return u;
    });

    return this.toPublicUser(updated);
  }

  /** Username generator: slugify display name, append 4 random chars to avoid collisions. */
  private generateUsername(seed: string): string {
    const base = seed
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 24);
    const rand = randomBytes(2).toString('hex'); // 4 hex chars
    return base ? `${base}-${rand}` : `member-${rand}`;
  }

  // ============================================================
  // helpers
  // ============================================================
  private async sendVerificationEmail(userId: string, email: string): Promise<boolean> {
    const token = randomBytes(32).toString('hex');
    await this.redis.set(`email_verify:${this.tokenHash(token)}`, userId, 86400); // 24h
    const link = `${process.env.PUBLIC_WEB_URL ?? 'http://localhost:3000'}/verify-email?token=${token}`;
    const res = await this.email.verifyEmail(email, link);
    return res.delivered;
  }

  private generateOtp(length: number): string {
    const max = 10 ** length;
    return randomInt(0, max).toString().padStart(length, '0');
  }

  private hashOtp(otp: string, phone: string): string {
    const env = loadEnv();
    return createHash('sha256').update(`${env.JWT_SECRET}:${phone}:${otp}`).digest('hex');
  }

  private hashRefreshToken(token: string): string {
    const env = loadEnv();
    return createHash('sha256').update(`${env.JWT_SECRET}:${token}`).digest('hex');
  }

  private tokenHash(token: string): string {
    const env = loadEnv();
    return createHash('sha256').update(`${env.JWT_SECRET}:tok:${token}`).digest('hex');
  }

  private constantTimeEqual(a: string, b: string): boolean {
    if (a.length !== b.length) return false;
    return timingSafeEqual(Buffer.from(a, 'hex'), Buffer.from(b, 'hex'));
  }

  private async issueTokens(
    userId: string,
    meta: { ip?: string; userAgent?: string },
  ): Promise<AuthTokens> {
    const env = loadEnv();
    const refreshToken = randomBytes(32).toString('hex'); // opaque, not a JWT
    const refreshHash = this.hashRefreshToken(refreshToken);
    const refreshExpires = new Date(Date.now() + env.JWT_REFRESH_TTL_DAYS * 86400 * 1000);

    await this.db.userSession.create({
      data: {
        userId,
        refreshTokenHash: refreshHash,
        expiresAt: refreshExpires,
        ip: meta.ip,
        userAgent: meta.userAgent,
      },
    });

    const accessToken = await this.jwt.signAsync(
      { sub: userId },
      { expiresIn: env.JWT_ACCESS_TTL },
    );

    return {
      accessToken,
      refreshToken,
      accessExpiresInSeconds: this.ttlToSeconds(env.JWT_ACCESS_TTL),
      refreshExpiresInSeconds: env.JWT_REFRESH_TTL_DAYS * 86400,
    };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private toPublicUser(u: any): PublicUser {
    const methods: Array<'phone' | 'email' | 'google'> = [];
    if (u.phoneE164) methods.push('phone');
    if (u.passwordHash) methods.push('email');
    if (u.googleId) methods.push('google');
    return {
      id: u.id,
      phone: u.phoneE164,
      email: u.email,
      emailVerified: !!u.emailVerifiedAt,
      primaryRole: u.primaryRole,
      isVerified: u.isVerified,
      isAdmin: u.isAdmin ?? false,
      displayName: u.displayName,
      avatarUrl: u.avatarUrl ?? null,
      city: u.city,
      onboardedAt: u.onboardedAt ? new Date(u.onboardedAt).toISOString() : null,
      authMethods: methods,
    };
  }

  private ttlToSeconds(ttl: string): number {
    const m = ttl.match(/^(\d+)([smhd])$/);
    if (!m) return 900;
    const n = parseInt(m[1], 10);
    return n * { s: 1, m: 60, h: 3600, d: 86400 }[m[2] as 's' | 'm' | 'h' | 'd'];
  }
}

export { TooManyRequests };
