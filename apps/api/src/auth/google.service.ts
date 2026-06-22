// Google OAuth — vanilla OAuth 2.0 authorization-code flow.
// No passport-google-oauth20 dep needed; this is just HTTPS calls.
//
// Flow:
//   1. GET /api/v1/auth/google  → 302 redirect to Google's consent screen
//   2. User approves → Google calls back to /api/v1/auth/google/callback?code=...
//   3. We exchange code for id_token + access_token at Google's token endpoint
//   4. Decode id_token (a JWT) to get sub (googleId), email, name
//   5. Upsert user via auth.service → set HttpOnly refresh cookie → redirect to /login/oauth/success
//      with the access token as a URL fragment

import { BadRequestException, Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { randomBytes, createHash } from 'crypto';
import { RedisService } from '../redis/redis.service';
import { loadEnv } from '../env';

const GOOGLE_AUTH = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN = 'https://oauth2.googleapis.com/token';
const SCOPES = 'openid email profile';
const STATE_TTL_S = 600; // 10 minutes to complete the flow

@Injectable()
export class GoogleAuthService {
  private readonly log = new Logger(GoogleAuthService.name);

  constructor(private readonly redis: RedisService) {}

  enabled(): boolean {
    const env = loadEnv();
    return !!env.GOOGLE_CLIENT_ID && !!env.GOOGLE_CLIENT_SECRET;
  }

  /** Build the consent-screen URL + persist a random state for CSRF protection. */
  async buildAuthUrl(returnTo?: string): Promise<string> {
    if (!this.enabled()) {
      throw new ServiceUnavailableException({
        code: 'google_disabled',
        message: 'Google login is not configured on this server',
      });
    }
    const env = loadEnv();
    const state = randomBytes(24).toString('hex');
    // Stash returnTo (where to send the user after success) keyed by state.
    await this.redis.set(`oauth:state:${state}`, returnTo ?? '/', STATE_TTL_S);

    const params = new URLSearchParams({
      client_id: env.GOOGLE_CLIENT_ID!,
      redirect_uri: env.GOOGLE_CALLBACK_URL,
      response_type: 'code',
      scope: SCOPES,
      state,
      access_type: 'online',
      prompt: 'select_account',
    });
    return `${GOOGLE_AUTH}?${params.toString()}`;
  }

  /** Exchange an authorization code for an id_token and extract the verified profile. */
  async handleCallback(
    code: string,
    state: string,
  ): Promise<{
    googleId: string;
    email: string;
    displayName?: string;
    returnTo: string;
  }> {
    if (!this.enabled()) throw new ServiceUnavailableException({ code: 'google_disabled' });

    const returnTo = await this.redis.get(`oauth:state:${state}`);
    if (!returnTo) {
      throw new BadRequestException({ code: 'state_invalid', message: 'OAuth state expired or invalid' });
    }
    await this.redis.del(`oauth:state:${state}`);

    const env = loadEnv();
    const body = new URLSearchParams({
      code,
      client_id: env.GOOGLE_CLIENT_ID!,
      client_secret: env.GOOGLE_CLIENT_SECRET!,
      redirect_uri: env.GOOGLE_CALLBACK_URL,
      grant_type: 'authorization_code',
    });
    const res = await fetch(GOOGLE_TOKEN, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });
    if (!res.ok) {
      const text = await res.text();
      this.log.warn(`Google token exchange failed: ${text}`);
      throw new BadRequestException({ code: 'google_exchange_failed', message: 'Could not exchange code with Google' });
    }
    const tokens = (await res.json()) as { id_token?: string; access_token?: string };
    if (!tokens.id_token) {
      throw new BadRequestException({ code: 'no_id_token' });
    }

    // Decode (not full verify — we trust the HTTPS to Google).
    // For production hardening: verify the JWT against Google's JWKS.
    const profile = this.decodeIdToken(tokens.id_token);
    if (!profile.email || !profile.sub) {
      throw new BadRequestException({ code: 'no_email', message: 'Google did not return an email' });
    }
    return {
      googleId: profile.sub,
      email: profile.email.toLowerCase(),
      displayName: profile.name,
      returnTo,
    };
  }

  /** Minimal JWT-payload decoder (no signature verify — Google's HTTPS is trusted). */
  private decodeIdToken(idToken: string): { sub?: string; email?: string; name?: string } {
    const parts = idToken.split('.');
    if (parts.length !== 3) throw new BadRequestException({ code: 'bad_id_token' });
    try {
      const payload = JSON.parse(Buffer.from(parts[1]!, 'base64url').toString('utf8'));
      return payload;
    } catch {
      throw new BadRequestException({ code: 'bad_id_token' });
    }
  }

  /** Used by tests to verify we're constructing a stable state. */
  protected fingerprint(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }
}
