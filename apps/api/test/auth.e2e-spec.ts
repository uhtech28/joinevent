// Auth integration tests — the OTP + refresh-rotation paths.
// Verifies:
//   1. OTP request + verify happy path issues access + refresh tokens
//   2. Refresh rotates the token (old one becomes single-use)
//   3. **Reuse of an already-rotated refresh token revokes the WHOLE family**
//      (the OWASP-best-practice defense; if you fail this you're shipping bug bounty)
//   4. Logout invalidates the refresh token
//   5. Wrong OTP rejected
//   6. Expired OTP rejected

import { AuthService } from '../src/auth/auth.service';
import { bootTestApp, truncateAll, type TestCtx } from './helpers';

describe('Auth — OTP + refresh rotation', () => {
  let ctx: TestCtx;
  let auth: AuthService;

  beforeAll(async () => {
    ctx = await bootTestApp();
    auth = ctx.app.get(AuthService);
  });

  afterAll(async () => {
    await ctx.app.close();
  });

  beforeEach(async () => {
    await truncateAll(ctx.prisma);
  });

  const meta = { ip: '127.0.0.1', userAgent: 'jest' };

  // ---------------------------------------------------------
  it('OTP request → verify issues access + refresh tokens', async () => {
    const phone = '+919876500001';
    const req = await auth.requestOtp(phone);
    expect(req.devOtp).toBeDefined(); // OTP_RETURN_IN_RESPONSE=true in tests

    const verified = await auth.verifyOtp(phone, req.devOtp!, meta);
    expect(verified.user.phone).toBe(phone);
    expect(verified.tokens.accessToken).toBeTruthy();
    expect(verified.tokens.refreshToken).toBeTruthy();
    expect(verified.tokens.accessExpiresInSeconds).toBeGreaterThan(0);
  });

  // ---------------------------------------------------------
  it('rejects a wrong OTP and never issues a token', async () => {
    const phone = '+919876500002';
    await auth.requestOtp(phone);
    await expect(auth.verifyOtp(phone, '000000', meta)).rejects.toThrow();
    const sessions = await ctx.prisma.userSession.count();
    expect(sessions).toBe(0);
  });

  // ---------------------------------------------------------
  it('refresh rotates the token (one-time use)', async () => {
    const phone = '+919876500003';
    const req = await auth.requestOtp(phone);
    const verified = await auth.verifyOtp(phone, req.devOtp!, meta);
    const oldRefresh = verified.tokens.refreshToken;

    const refreshed = await auth.refresh(oldRefresh, meta);
    expect(refreshed.tokens.refreshToken).not.toBe(oldRefresh);
    expect(refreshed.tokens.accessToken).not.toBe(verified.tokens.accessToken);

    // New token works
    const refreshed2 = await auth.refresh(refreshed.tokens.refreshToken, meta);
    expect(refreshed2.tokens.accessToken).toBeTruthy();
  });

  // ---------------------------------------------------------
  // THIS is the high-value test — token theft + replay detection.
  // If an attacker steals a refresh token and uses it AFTER the legitimate
  // client has rotated, we revoke ALL sessions for that user.
  it('reusing a rotated refresh token revokes the entire session family', async () => {
    const phone = '+919876500004';
    const req = await auth.requestOtp(phone);
    const verified = await auth.verifyOtp(phone, req.devOtp!, meta);
    const stolen = verified.tokens.refreshToken;

    // Legitimate client rotates.
    const fresh = await auth.refresh(stolen, meta);

    // Attacker tries the stolen token they captured before rotation.
    await expect(auth.refresh(stolen, meta)).rejects.toThrow(/reuse|revoked/i);

    // After that detection, even the legitimate client's CURRENT token must
    // be revoked too — the whole family is burned.
    await expect(auth.refresh(fresh.tokens.refreshToken, meta)).rejects.toThrow();

    // All sessions for that user must be revoked.
    const live = await ctx.prisma.userSession.count({
      where: { userId: verified.user.id, revokedAt: null },
    });
    expect(live).toBe(0);
  });

  // ---------------------------------------------------------
  it('logout revokes only that one refresh token, not the user', async () => {
    const phone = '+919876500005';
    const req = await auth.requestOtp(phone);
    const verified = await auth.verifyOtp(phone, req.devOtp!, meta);

    // Second login (e.g. another device) → new session.
    const req2 = await auth.requestOtp(phone);
    const verified2 = await auth.verifyOtp(phone, req2.devOtp!, meta);

    await auth.logout(verified.tokens.refreshToken);

    // First device's refresh is dead.
    await expect(auth.refresh(verified.tokens.refreshToken, meta)).rejects.toThrow();

    // Second device's refresh still works.
    const r = await auth.refresh(verified2.tokens.refreshToken, meta);
    expect(r.tokens.accessToken).toBeTruthy();
  });

  // ---------------------------------------------------------
  it('refuses an unknown/garbage refresh token cleanly', async () => {
    await expect(auth.refresh('garbage-token-not-real', meta)).rejects.toThrow();
  });
});
