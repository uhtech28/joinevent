// Bookings integration tests — the second money path + concurrency hot spot.
// Verifies:
//   1. Stall.booked increments exactly once per booking
//   2. 10 concurrent bookings on a stall with availability=3 produce EXACTLY 3 bookings
//   3. Cancellation refunds the vendor and rolls stall.booked back
//   4. Can't book your own event

import { BookingsService } from '../src/bookings/bookings.service';
import { bootTestApp, truncateAll, createUser, type TestCtx } from './helpers';

describe('Bookings — atomicity + concurrency', () => {
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

  // Helper: spin up an organiser + event + stall.
  async function setupEventWithStall(opts: { available: number; price: number }) {
    const org = await createUser(ctx.prisma, '+919000000001', 0);
    const profile = await ctx.prisma.businessProfile.create({
      data: {
        userId: org.id,
        username: 'test-org',
        displayName: 'Test Org',
        kind: 'organiser',
        verified: true,
        avgRating: 0,
        followersCount: 0,
      },
    });
    const event = await ctx.prisma.event.create({
      data: {
        organiserId: profile.id,
        slug: 'test-event',
        title: 'Test Event',
        description: 'desc',
        coverImages: ['x'],
        startsAt: new Date(Date.now() + 86400_000),
        endsAt: new Date(Date.now() + 172800_000),
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
  it('books a stall, debits the vendor, increments stall.booked', async () => {
    const vendor = await createUser(ctx.prisma, '+919876543210', 10000_00);
    const { eventId, stallId } = await setupEventWithStall({ available: 5, price: 2000_00 });

    await bookings.book(vendor.id, eventId, stallId);

    const v = await ctx.prisma.wallet.findUnique({ where: { id: vendor.walletId } });
    expect(v!.balancePaise).toBe(8000_00); // 10k - 2k

    const stall = await ctx.prisma.stall.findUnique({ where: { id: stallId } });
    expect(stall!.booked).toBe(1);

    const b = await ctx.prisma.booking.findFirst({ where: { stallId } });
    expect(b!.status).toBe('confirmed');
  });

  // ---------------------------------------------------------
  it('refuses to book your own event', async () => {
    const { eventId, stallId, organiser } = await setupEventWithStall({
      available: 1,
      price: 100_00,
    });
    await expect(bookings.book(organiser.id, eventId, stallId)).rejects.toThrow(/own event/i);
  });

  // ---------------------------------------------------------
  it('handles 10 concurrent bookings on a 3-slot stall — exactly 3 succeed', async () => {
    const { eventId, stallId } = await setupEventWithStall({ available: 3, price: 500_00 });

    // 10 separate vendors, each with enough balance.
    const vendors = await Promise.all(
      Array.from({ length: 10 }, (_, i) =>
        createUser(ctx.prisma, `+9197000000${10 + i}`, 1000_00),
      ),
    );

    const results = await Promise.allSettled(
      vendors.map((v) => bookings.book(v.id, eventId, stallId)),
    );

    const successes = results.filter((r) => r.status === 'fulfilled');
    const failures = results.filter((r) => r.status === 'rejected');

    expect(successes.length).toBe(3);
    expect(failures.length).toBe(7);

    const stall = await ctx.prisma.stall.findUnique({ where: { id: stallId } });
    expect(stall!.booked).toBe(3);

    const bookingsCount = await ctx.prisma.booking.count({ where: { stallId } });
    expect(bookingsCount).toBe(3);
  });

  // ---------------------------------------------------------
  it('cancellation refunds the vendor AND rolls stall.booked back', async () => {
    const vendor = await createUser(ctx.prisma, '+919876543210', 5000_00);
    const { eventId, stallId } = await setupEventWithStall({ available: 2, price: 1000_00 });

    const booking = await bookings.book(vendor.id, eventId, stallId);

    // Pre-cancel state
    const w1 = await ctx.prisma.wallet.findUnique({ where: { id: vendor.walletId } });
    expect(w1!.balancePaise).toBe(4000_00);

    await bookings.cancel(vendor.id, booking.bookingId);

    const w2 = await ctx.prisma.wallet.findUnique({ where: { id: vendor.walletId } });
    expect(w2!.balancePaise).toBe(5000_00); // refunded

    const stall = await ctx.prisma.stall.findUnique({ where: { id: stallId } });
    expect(stall!.booked).toBe(0);

    const b = await ctx.prisma.booking.findUnique({ where: { id: booking.bookingId } });
    expect(b!.status).toBe('cancelled');
  });
});
