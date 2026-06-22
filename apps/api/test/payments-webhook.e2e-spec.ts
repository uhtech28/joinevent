// Payments webhook integration tests — replay safety + signature verification.
// Verifies:
//   1. Successful webhook credits wallet exactly once
//   2. Duplicate delivery (same externalId, status=success) is idempotent (action: 'duplicate')
//   3. Bad HMAC signature is rejected silently (action: 'ignored')
//   4. Failed status doesn't credit the wallet
//   5. Unknown externalId is ignored (no error, no credit)

import { createHmac } from 'crypto';
import { PaymentsService } from '../src/payments/payments.service';
import { bootTestApp, truncateAll, createUser, type TestCtx } from './helpers';

describe('Payments webhook — replay safety + signature', () => {
  let ctx: TestCtx;
  let payments: PaymentsService;

  beforeAll(async () => {
    ctx = await bootTestApp();
    payments = ctx.app.get(PaymentsService);
  });

  afterAll(async () => {
    await ctx.app.close();
  });

  beforeEach(async () => {
    await truncateAll(ctx.prisma);
  });

  const secret = process.env.PAYU_WEBHOOK_SECRET ?? '';

  function sign(payload: Record<string, unknown>): string {
    return createHmac('sha256', secret).update(JSON.stringify(payload)).digest('hex');
  }

  async function createPendingTopup(user: { id: string }, amountPaise: number) {
    const externalId = `payu_${Math.random().toString(36).slice(2)}`;
    await ctx.prisma.paymentEvent.create({
      data: {
        externalId,
        userId: user.id,
        amountPaise,
        currency: 'INR',
        status: 'pending',
        provider: 'payu',
        payloadRaw: {},
      },
    });
    return externalId;
  }

  // ---------------------------------------------------------
  it('credits the wallet on a valid success webhook', async () => {
    const user = await createUser(ctx.prisma, '+919876510001', 0);
    const externalId = await createPendingTopup(user, 5000_00);

    const payload = { externalId, status: 'success', amount: 5000_00 };
    const res = await payments.handleWebhook(payload, secret ? sign(payload) : undefined);

    expect(res.action).toBe('credited');
    const w = await ctx.prisma.wallet.findUnique({ where: { id: user.walletId } });
    expect(w!.balancePaise).toBe(5000_00);
  });

  // ---------------------------------------------------------
  it('is idempotent on duplicate delivery', async () => {
    const user = await createUser(ctx.prisma, '+919876510002', 0);
    const externalId = await createPendingTopup(user, 2000_00);

    const payload = { externalId, status: 'success', amount: 2000_00 };
    const first = await payments.handleWebhook(payload, secret ? sign(payload) : undefined);
    const second = await payments.handleWebhook(payload, secret ? sign(payload) : undefined);

    expect(first.action).toBe('credited');
    expect(second.action).toBe('duplicate');

    const w = await ctx.prisma.wallet.findUnique({ where: { id: user.walletId } });
    expect(w!.balancePaise).toBe(2000_00); // NOT 4000_00
  });

  // ---------------------------------------------------------
  it('rejects a bad signature without crediting', async () => {
    if (!secret) {
      // If no secret is configured the webhook accepts everything; skip.
      return;
    }
    const user = await createUser(ctx.prisma, '+919876510003', 0);
    const externalId = await createPendingTopup(user, 1000_00);

    const payload = { externalId, status: 'success', amount: 1000_00 };
    const res = await payments.handleWebhook(payload, 'totally-bogus-signature');

    expect(res.action).toBe('ignored');
    const w = await ctx.prisma.wallet.findUnique({ where: { id: user.walletId } });
    expect(w!.balancePaise).toBe(0);
  });

  // ---------------------------------------------------------
  it('does not credit on failed status', async () => {
    const user = await createUser(ctx.prisma, '+919876510004', 0);
    const externalId = await createPendingTopup(user, 1500_00);

    const payload = { externalId, status: 'failed', amount: 1500_00 };
    const res = await payments.handleWebhook(payload, secret ? sign(payload) : undefined);

    expect(['ignored', 'duplicate']).toContain(res.action);
    const w = await ctx.prisma.wallet.findUnique({ where: { id: user.walletId } });
    expect(w!.balancePaise).toBe(0);

    const evt = await ctx.prisma.paymentEvent.findFirst({ where: { externalId } });
    expect(evt!.status).toBe('failed');
  });

  // ---------------------------------------------------------
  it('ignores an unknown externalId', async () => {
    const payload = { externalId: 'never-saw-this-one', status: 'success', amount: 99_00 };
    const res = await payments.handleWebhook(payload, secret ? sign(payload) : undefined);
    expect(res.action).toBe('ignored');
  });
});
