import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Patch,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Request, Response } from 'express';
import {
  emailSigninSchema,
  emailSignupSchema,
  onboardingSchema,
  refreshSchema,
  requestOtpSchema,
  requestPasswordResetSchema,
  resetPasswordSchema,
  updateMeSchema,
  verifyEmailSchema,
  verifyOtpSchema,
  type PublicUser,
} from './dto/auth.dto';
import { AuthService } from './auth.service';
import { GoogleAuthService } from './google.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser } from './decorators/current-user.decorator';
import { loadEnv } from '../env';

function meta(req: Request) {
  return {
    ip: req.ip,
    userAgent: req.headers['user-agent'] ?? undefined,
  };
}

@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly google: GoogleAuthService,
  ) {}

  // ============================================================
  // PHONE OTP
  // ============================================================

  @Throttle({ default: { ttl: 60_000, limit: 5 } })
  @Post('otp/request')
  @HttpCode(200)
  async requestOtp(@Body() raw: unknown) {
    const parsed = requestOtpSchema.safeParse(raw);
    if (!parsed.success) {
      throw new BadRequestException({ code: 'invalid_payload', issues: parsed.error.flatten() });
    }
    return this.auth.requestOtp(parsed.data.phone);
  }

  @Throttle({ default: { ttl: 60_000, limit: 10 } })
  @Post('otp/verify')
  @HttpCode(200)
  async verifyOtp(@Body() raw: unknown, @Req() req: Request) {
    const parsed = verifyOtpSchema.safeParse(raw);
    if (!parsed.success) {
      throw new BadRequestException({ code: 'invalid_payload', issues: parsed.error.flatten() });
    }
    return this.auth.verifyOtp(parsed.data.phone, parsed.data.otp, meta(req));
  }

  // ============================================================
  // EMAIL / PASSWORD
  // ============================================================

  @Throttle({ default: { ttl: 60_000, limit: 5 } })
  @Post('email/signup')
  @HttpCode(200)
  async emailSignup(@Body() raw: unknown, @Req() req: Request) {
    const parsed = emailSignupSchema.safeParse(raw);
    if (!parsed.success) {
      throw new BadRequestException({ code: 'invalid_payload', issues: parsed.error.flatten() });
    }
    return this.auth.emailSignup(
      parsed.data.email,
      parsed.data.password,
      parsed.data.displayName,
      meta(req),
    );
  }

  @Throttle({ default: { ttl: 60_000, limit: 10 } })
  @Post('email/signin')
  @HttpCode(200)
  async emailSignin(@Body() raw: unknown, @Req() req: Request) {
    const parsed = emailSigninSchema.safeParse(raw);
    if (!parsed.success) {
      throw new BadRequestException({ code: 'invalid_payload', issues: parsed.error.flatten() });
    }
    return this.auth.emailSignin(parsed.data.email, parsed.data.password, meta(req));
  }

  @Throttle({ default: { ttl: 60_000, limit: 20 } })
  @Post('email/verify')
  @HttpCode(200)
  async verifyEmail(@Body() raw: unknown) {
    const parsed = verifyEmailSchema.safeParse(raw);
    if (!parsed.success) {
      throw new BadRequestException({ code: 'invalid_payload' });
    }
    return this.auth.verifyEmail(parsed.data.token);
  }

  @Throttle({ default: { ttl: 60_000, limit: 3 } })
  @Post('email/forgot')
  @HttpCode(200)
  async forgotPassword(@Body() raw: unknown) {
    const parsed = requestPasswordResetSchema.safeParse(raw);
    if (!parsed.success) {
      throw new BadRequestException({ code: 'invalid_payload' });
    }
    return this.auth.requestPasswordReset(parsed.data.email);
  }

  @Throttle({ default: { ttl: 60_000, limit: 5 } })
  @Post('email/reset')
  @HttpCode(200)
  async resetPassword(@Body() raw: unknown) {
    const parsed = resetPasswordSchema.safeParse(raw);
    if (!parsed.success) {
      throw new BadRequestException({ code: 'invalid_payload', issues: parsed.error.flatten() });
    }
    return this.auth.resetPassword(parsed.data.token, parsed.data.password);
  }

  // ============================================================
  // GOOGLE OAUTH
  // ============================================================

  /** Status endpoint so the frontend can hide the Google button when disabled. */
  @Get('google/status')
  googleStatus() {
    return { enabled: this.google.enabled() };
  }

  /** Step 1: redirect to Google's consent page. */
  @Get('google')
  async googleStart(@Query('returnTo') returnTo: string | undefined, @Res() res: Response) {
    const url = await this.google.buildAuthUrl(returnTo);
    res.redirect(url);
  }

  /** Step 2: Google redirects here with ?code=&state=. */
  @Get('google/callback')
  async googleCallback(
    @Query('code') code: string | undefined,
    @Query('state') state: string | undefined,
    @Query('error') error: string | undefined,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const env = loadEnv();
    if (error || !code || !state) {
      return res.redirect(env.GOOGLE_FRONTEND_FAILURE_URL);
    }
    try {
      const profile = await this.google.handleCallback(code, state);
      const result = await this.auth.upsertGoogleUser(profile, meta(req));
      // Send tokens via URL fragment so the frontend can pick them up
      // (fragment is not sent to the server, less leaky than query).
      const params = new URLSearchParams({
        accessToken: result.tokens.accessToken,
        refreshToken: result.tokens.refreshToken,
        accessExpiresInSeconds: String(result.tokens.accessExpiresInSeconds),
      });
      const dest = `${env.GOOGLE_FRONTEND_SUCCESS_URL}#${params.toString()}`;
      return res.redirect(dest);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Google callback error:', err);
      return res.redirect(env.GOOGLE_FRONTEND_FAILURE_URL);
    }
  }

  // ============================================================
  // REFRESH / LOGOUT / ME (unchanged)
  // ============================================================

  @Throttle({ default: { ttl: 60_000, limit: 20 } })
  @Post('refresh')
  @HttpCode(200)
  async refresh(@Body() raw: unknown, @Req() req: Request) {
    const parsed = refreshSchema.safeParse(raw);
    if (!parsed.success) {
      throw new BadRequestException({ code: 'invalid_payload', issues: parsed.error.flatten() });
    }
    return this.auth.refresh(parsed.data.refreshToken, meta(req));
  }

  @Post('logout')
  @HttpCode(204)
  async logout(@Body() raw: unknown) {
    const parsed = refreshSchema.safeParse(raw);
    if (!parsed.success) {
      throw new BadRequestException({ code: 'invalid_payload' });
    }
    await this.auth.logout(parsed.data.refreshToken);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  async me(@CurrentUser() user: { id: string }): Promise<PublicUser> {
    const pub = await this.auth.findUserPublic(user.id);
    if (!pub) throw new BadRequestException('user_not_found');
    return pub;
  }

  // ============================================================
  // PATCH /auth/me — current user updates their basic profile
  // (display name, avatar, city). Used by the user-role profile editor
  // under /dashboard/settings/profile.
  // ============================================================
  @Throttle({ default: { ttl: 60_000, limit: 10 } })
  @UseGuards(JwtAuthGuard)
  @Patch('me')
  async updateMe(
    @CurrentUser() user: { id: string },
    @Body() raw: unknown,
  ): Promise<PublicUser> {
    const parsed = updateMeSchema.safeParse(raw);
    if (!parsed.success) {
      throw new BadRequestException({ code: 'invalid_payload', issues: parsed.error.flatten() });
    }
    return this.auth.updateMe(user.id, parsed.data);
  }

  // ============================================================
  // ONBOARDING — first-run role picker
  // ============================================================
  @Throttle({ default: { ttl: 60_000, limit: 5 } })
  @UseGuards(JwtAuthGuard)
  @Post('onboarding')
  @HttpCode(200)
  async onboarding(@CurrentUser() user: { id: string }, @Body() raw: unknown) {
    const parsed = onboardingSchema.safeParse(raw);
    if (!parsed.success) {
      throw new BadRequestException({ code: 'invalid_payload', issues: parsed.error.flatten() });
    }
    const updated = await this.auth.onboard(user.id, parsed.data);
    return { user: updated };
  }

  // ============================================================
  // DELETE /auth/account — soft-delete the signed-in user.
  // Revokes all sessions and marks user.deletedAt. User remains in DB
  // for audit/integrity (events, reviews, bookings stay linked).
  // ============================================================
  @Throttle({ default: { ttl: 60_000, limit: 3 } })
  @UseGuards(JwtAuthGuard)
  @Delete('account')
  @HttpCode(204)
  async deleteAccount(@CurrentUser() user: { id: string }) {
    await this.auth.softDeleteUser(user.id);
  }
}
