import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { createHmac, randomUUID } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';
import { WalletService } from '../wallet/wallet.service';
import { loadEnv } from '../env';
import type { TopupResponse } from './dto/payment.dto';

/**
 * PaymentsService — PSP-agnostic top-up flow.
 *
 * Two modes by SMS_PROVIDER-style env switch:
 *  - 'stub'  (dev): instantly materialise the payment + credit the wallet.
 *  - 'payu'  (prod): create a pending payment_event, return PayU URL; the
 *                     PayU webhook handler finalises and credits the wallet.
 *
 * Real PayU keys, HMAC algorithm, and the live POST to PayU's `_payment` endpoint
 * land in Step 6.5. This file already wires the envelope so swapping providers
 * is a one-line change.
 */
@Injectable()
export class PaymentsService {
  private readonly log = new Logger(PaymentsService.name);

  constructor(
    private readonly db: PrismaService,
    private readonly wallet: WalletService,
  ) {}

  async initiateTopup(userId: string, amountPaise: number): Promise<TopupResponse> {
    const env = loadEnv();
    const externalId = `je_${randomUUID()}`;

    // Open a payment event (pending).
    const evt = await this.db.paymentEvent.create({
      data: {
        provider: env.SMS_PROVIDER === 'msg91' ? 'payu' : 'stub', // reuse the flag for dev for now
        externalId,
        status: 'pending',
        amountPaise,
        payloadRaw: { initiatedBy: userId, amountPaise },
        userId,
      },
    });

    // In dev we don't actually go to PayU — credit immediately. This means
    // the entire flow can be exercised without a PayU account.
    if (process.env.NODE_ENV !== 'production') {
      return this.simulateInstantTopup(evt.id, userId, amountPaise);
    }

    // Production path (real PayU is wired in Step 6.5).
    const paymentUrl = this.buildPayuUrl(externalId, amountPaise, userId);
    return {
      provider: 'payu',
      status: 'redirect_required',
      paymentEventId: evt.id,
      paymentUrl,
    };
  }

  /** Dev shortcut — used when NODE_ENV !== 'production'. */
  private async simulateInstantTopup(
    paymentEventId: string,
    userId: string,
    amountPaise: number,
  ): Promise<TopupResponse> {
    const wallet = await this.wallet.getOrCreate('user', userId);
    const house = await this.wallet.getOrCreate('platform', null);

    // Top-up = credit user (available) + debit platform-house (available).
    // This keeps the ledger invariant balanced. House is allowed to go
    // negative — it represents money that the PSP holds and will settle to us.
    const { txnId } = await this.wallet.transfer([
      {
        walletId: house.id,
        direction: 'D',
        amountPaise,
        reason: 'topup',
        meta: { paymentEventId, side: 'house' },
      },
      {
        walletId: wallet.id,
        direction: 'C',
        amountPaise,
        reason: 'topup',
        meta: { paymentEventId, side: 'user' },
      },
    ]);

    const updated = await this.db.paymentEvent.update({
      where: { id: paymentEventId },
      data: {
        status: 'success',
        payloadRaw: { txnId, simulatedAt: new Date().toISOString() },
      },
    });

    const fresh = await this.wallet.getOrCreate('user', userId);
    this.log.log(
      `[STUB PAY] Credited ₹${amountPaise / 100} to user ${userId}. New balance ₹${fresh.balancePaise / 100}.`,
    );

    return {
      provider: 'stub',
      status: 'completed',
      paymentEventId: updated.id,
      newBalancePaise: fresh.balancePaise,
    };
  }

  /** Build a PayU hosted-page URL. Step 6.5 calls PayU's `_payment` endpoint
   *  to mint a real one; for now we return a placeholder that lets you wire
   *  the redirect on the client. */
  private buildPayuUrl(externalId: string, amountPaise: number, userId: string): string {
    const env = loadEnv();
    const base = 'https://test.payu.in/_payment';
    const params = new URLSearchParams({
      txnid: externalId,
      amount: (amountPaise / 100).toFixed(2),
      productinfo: 'JoinEventsTopup',
      udf1: userId,
    });
    return `${base}?${params.toString()}`;
  }

  /** PayU webhook handler. Verifies HMAC against the configured key, then
   *  finalises the payment_event and credits the wallet. Idempotent via
   *  externalId. Real signature scheme lands in Step 6.5. */
  async handleWebhook(payload: Record<string, unknown>, signature: string | undefined): Promise<{
    ok: true;
    action: 'credited' | 'ignored' | 'duplicate';
  }> {
    const env = loadEnv();
    const externalId = typeof payload.txnid === 'string' ? payload.txnid : null;
    if (!externalId) return { ok: true, action: 'ignored' };

    // HMAC verify (skeleton — final scheme depends on PayU response format).
    const secret = env.MSG91_AUTH_KEY ?? ''; // we reuse this slot until Step 6.5 adds PAYU_SALT
    if (secret && signature) {
      const expected = createHmac('sha256', secret)
        .update(JSON.stringify(payload))
        .digest('hex');
      if (expected !== signature) {
        this.log.warn(`Webhook signature mismatch for ${externalId}`);
        return { ok: true, action: 'ignored' };
      }
    }

    const evt = await this.db.paymentEvent.findUnique({ where: { externalId } });
    if (!evt) return { ok: true, action: 'ignored' };
    if (evt.status === 'success') return { ok: true, action: 'duplicate' };

    // Status from PayU
    const status = payload.status === 'success' ? 'success' : 'failed';
    if (status !== 'success') {
      await this.db.paymentEvent.update({
        where: { id: evt.id },
        data: { status, payloadRaw: payload as Prisma.InputJsonValue },
      });
      return { ok: true, action: 'ignored' };
    }

    // Credit the user (same shape as simulateInstantTopup).
    if (!evt.userId) return { ok: true, action: 'ignored' };
    const userWallet = await this.wallet.getOrCreate('user', evt.userId);
    const house = await this.wallet.getOrCreate('platform', null);
    await this.wallet.transfer([
      {
        walletId: house.id,
        direction: 'D',
        amountPaise: evt.amountPaise,
        reason: 'topup',
        meta: { paymentEventId: evt.id, side: 'house', viaWebhook: true },
      },
      {
        walletId: userWallet.id,
        direction: 'C',
        amountPaise: evt.amountPaise,
        reason: 'topup',
        meta: { paymentEventId: evt.id, side: 'user', viaWebhook: true },
      },
    ]);
    await this.db.paymentEvent.update({
      where: { id: evt.id },
      data: { status: 'success', payloadRaw: payload as Prisma.InputJsonValue },
    });

    return { ok: true, action: 'credited' };
  }
}
