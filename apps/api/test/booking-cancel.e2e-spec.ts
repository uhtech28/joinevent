// Booking cancellation — refund correctness + race-safety.
// Verifies:
//   1. Cancel before event starts refunds full amount + frees slot
//   2. Cannot cancel after the event has started
//   3. Cannot cancel someone else's booking
//   4. Cannot double-cancel the same booking
//   5. Two concurrent cancels of the same booking — exactly ONE succeeds

import { BookingsService } from '../src/bookings/bookings.service';
import { bootTestApp, truncateAll, createUser, type TestCtx } from './helpers';

describe('Booking cancellation — refund + race safety', () => {
  let ctx: TestCtx;
  let bookings: BookingsService;

  beforeAll(async () => {
    ctx = await bootTestApp();
    bookings = ctx.app.get(BookingsService);
  });

  afterAll(async () => {
    await ctx.app.close();
  });

  beforeEach(async () => {
    await truncateAll(ctx.prisma);
  });

  async function setupEventWithStall(opts: { available: number; price: number; startsAt: Date }) {
    const org = await createUser(ctx.prisma, '+919000000099', 0);
    const profile = await ctx.prisma.businessProfile.create({
      data: {
        userId: org.id,
        username: 'cancel-org',
        displayName: 'Cancel Org',
        kind: 'organiser',
        verified: true,
        avgRating: 0,
        followersCount: 0,
      },
    });
    const event = await ctx.prisma.event.create({
      data: {
        organiserId: profile.id,
        slug: 'cancel-event',
        title: 'Cancel Event',
        description: 'desc',
        coverImages: ['x'],
        startsAt: opts.startsAt,
        endsAt: new Date(opts.startsAt.getTime() + 86400_000),
        addressText: 'A',
        latitude: 28.5,
        longitude: 77.3,
        status: 'live',
        metadata: {},
      },
    });
    const stall = await ctx.prisma.stall.create({
      data: {
        eventId: event.id,
        category: 'food',
        pricePaise: opts.price,
        available: opts.available,
        booked: 0,
        facilities: {},
      },
    });
    return { eventId: event.id, stallId: stall.id, organiser: org };
  }

  // ---------------------------------------------------------
  it('refunds the full booking amount AND frees the stall slot', async () => {
    const vendor = await createUser(ctx.prisma, '+919876520001', 10000_00);
    const { eventId, stallId } = await setupEventWithStall({
      available: 1,
      price: 3000_00,
      startsAt: new Date(Date.now() + 86400_000),
    });

    const booking = await bookings.book(vendor.id, eventId, stallId);

    const stallAfterBook = await ctx.prisma.stall.findUnique({ where: { id: stallId } });
    expect(stallAfterBook!.booked).toBe(1);

    await bookings.cancel(vendor.id, booking.bookingId);

    const v = await ctx.prisma.wallet.findUnique({ where: { id: vendor.walletId } });
    expect(v!.balancePaise).toBe(10000_00); // fully refunded

    const stallAfterCancel = await ctx.prisma.stall.findUnique({ where: { id: stallId } });
    expect(stallAfterCancel!.booked).toBe(0);

    const b = await ctx.prisma.booking.findUnique({ where: { id: booking.bookingId } });
    expect(b!.status).toBe('cancelled');
  });

  // ---------------------------------------------------------
  it('refuses cancellation once the event has started', async () => {
    const vendor = await createUser(ctx.prisma, '+919876520002', 10000_00);
    const { eventId, stallId } = await setupEventWithStall({
      available: 1,
      price: 1000_00,
      startsAt: new Date(Date.now() + 86400_000),
    });

    const booking = await bookings.book(vendor.id, eventId, stallId);

    // Backdate the event so it appears to have started.
    await ctx.prisma.event.update({
      where: { id: eventId },
      data: { startsAt: new Date(Date.now() - 3600_000) },
    });

    await expect(bookings.cancel(vendor.id, booking.bookingId)).rejects.toThrow(/started|cancel/i);
  });

  // ---------------------------------------------------------
  it('refuses to let user B cancel user A\'s booking', async () => {
    const vendorA = await createUser(ctx.prisma, '+919876520003', 5000_00);
    const vendorB = await createUser(ctx.prisma, '+919876520004', 5000_00);
    const { eventId, stallId } = await setupEventWithStall({
      available: 1,
      price: 1500_00,
      startsAt: new Date(Date.now() + 86400_000),
    });

    const booking = await bookings.book(vendorA.id, eventId, stallId);
    await expect(bookings.cancel(vendorB.id, booking.bookingId)).rejects.toThrow(/not your|owner|forbidden/i);
  });

  // ---------------------------------------------------------
  it('refuses a double-cancel of the same booking', async () => {
    const vendor = await createUser(ctx.prisma, '+919876520005', 5000_00);
    const { eventId, stallId } = await setupEventWithStall({
      available: 1,
      price: 1000_00,
      startsAt: new Date(Date.now() + 86400_000),
    });

    const booking = await bookings.book(vendor.id, eventId, stallId);
    await bookings.cancel(vendor.id, booking.bookingId);
    await expect(bookings.cancel(vendor.id, booking.bookingId)).rejects.toThrow(/already|cancelled|cannot/i);
  });

  // ---------------------------------------------------------
  it('two concurrent cancels resolve to exactly one refund', async () => {
    const vendor = await createUser(ctx.prisma, '+919876520006', 5000_00);
    const { eventId, stallId } = await setupEventWithStall({
      available: 1,
      price: 2000_00,
      startsAt: new Date(Date.now() + 86400_000),
    });

    const booking = await bookings.book(vendor.id, eventId, stallId);

    const results = await Promise.allSettled([
      bookings.cancel(vendor.id, booking.bookingId),
      bookings.cancel(vendor.id, booking.bookingId),
    ]);
    const ok = results.filter((r) => r.status === 'fulfilled').length;
    expect(ok).toBe(1);

    // Only ONE refund hit the wallet.
    const v = await ctx.prisma.wallet.findUnique({ where: { id: vendor.walletId } });
    expect(v!.balancePaise).toBe(5000_00); // exactly the original

    const stall = await ctx.prisma.stall.findUnique({ where: { id: stallId } });
    expect(stall!.booked).toBe(0);
  });
});
