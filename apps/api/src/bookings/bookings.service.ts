import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { WalletService } from '../wallet/wallet.service';
import { NotificationsService } from '../notifications/notifications.service';
import { PLATFORM_FEE_BPS, type BookStallResponse, type PublicBooking } from './dto/booking.dto';

@Injectable()
export class BookingsService {
  private readonly log = new Logger(BookingsService.name);

  constructor(
    private readonly db: PrismaService,
    private readonly wallet: WalletService,
    private readonly notifications: NotificationsService,
  ) {}

  // ============================================================
  // POST /events/:eventId/stalls/:stallId/book
  //
  // Atomic:
  //   1. Lock the stall row for update.
  //   2. Verify the parent event matches and is live + future.
  //   3. Verify availability > booked.
  //   4. Decrement availability (booked += 1).
  //   5. Transfer money in 3 legs (vendor → organiser-escrow + house).
  //   6. Insert the booking row with the wallet txnId.
  // ============================================================
  async book(userId: string, eventId: string, stallId: string): Promise<BookStallResponse> {
    return this.db.$transaction(
      async (tx) => {
        // Lock the stall row so two concurrent bookings can't both decrement.
        // Prisma doesn't have FOR UPDATE; we use raw SQL.
        const lockedRows = await tx.$queryRaw<
          Array<{
            id: string;
            event_id: string;
            category: string;
            price_paise: number;
            available: number;
            booked: number;
          }>
        >`SELECT id, event_id, category, price_paise, available, booked
          FROM stalls
          WHERE id = ${stallId}::uuid
          FOR UPDATE`;

        if (lockedRows.length === 0) {
          throw new NotFoundException({ code: 'stall_not_found' });
        }
        const stall = lockedRows[0]!;
        if (stall.event_id !== eventId) {
          throw new BadRequestException({
            code: 'stall_event_mismatch',
            message: 'That stall does not belong to that event',
          });
        }

        const event = await tx.event.findUnique({
          where: { id: eventId },
          include: { organiser: { select: { id: true, userId: true } } },
        });
        if (!event) throw new NotFoundException({ code: 'event_not_found' });
        if (event.status !== 'live') {
          throw new BadRequestException({
            code: 'event_not_live',
            message: 'This event is not accepting bookings yet',
          });
        }
        if (new Date(event.endsAt) < new Date()) {
          throw new BadRequestException({
            code: 'event_past',
            message: 'This event is over',
          });
        }
        if (event.organiser.userId === userId) {
          throw new ForbiddenException({
            code: 'cannot_book_own_event',
            message: "You can't book a stall at your own event",
          });
        }

        const slotsLeft = stall.available - stall.booked;
        if (slotsLeft <= 0) {
          throw new ConflictException({
            code: 'sold_out',
            message: 'This stall category is sold out',
          });
        }

        // Check for an existing confirmed booking by the same user (prevent double-book).
        const already = await tx.booking.findFirst({
          where: { stallId, userId, status: 'confirmed' },
        });
        if (already) {
          throw new ConflictException({
            code: 'already_booked',
            message: 'You already have a confirmed booking for this stall',
          });
        }

        // Money split.
        const amountPaise = stall.price_paise;
        const platformFeePaise = Math.floor((amountPaise * PLATFORM_FEE_BPS) / 10_000);
        const escrowHeldPaise = amountPaise - platformFeePaise;

        // Wallet check for clear error before relying on the CHECK constraint.
        const vendorWallet = await this.wallet.getOrCreate('user', userId);
        if (vendorWallet.balancePaise < amountPaise) {
          throw new BadRequestException({
            code: 'insufficient_funds',
            message: `You need ₹${(amountPaise / 100).toLocaleString('en-IN')} in your wallet. Top up first.`,
            shortfallPaise: amountPaise - vendorWallet.balancePaise,
          });
        }
        const organiserWallet = await this.wallet.getOrCreate('business', event.organiser.id);
        const house = await this.wallet.getOrCreate('platform', null);

        // Move money. Three legs, sum(D) == sum(C) == amountPaise.
        let txnId: string;
        try {
          ({ txnId } = await this.wallet.transfer([
            {
              walletId: vendorWallet.id,
              direction: 'D',
              amountPaise,
              reason: 'stall_booking',
              meta: { eventId, stallId },
            },
            {
              walletId: organiserWallet.id,
              direction: 'C',
              amountPaise: escrowHeldPaise,
              bucket: 'pending',
              reason: 'stall_booking',
              meta: { eventId, stallId, vendorUserId: userId },
            },
            {
              walletId: house.id,
              direction: 'C',
              amountPaise: platformFeePaise,
              reason: 'commission',
              meta: { eventId, stallId, vendorUserId: userId, bps: PLATFORM_FEE_BPS },
            },
          ]));
        } catch (err) {
          // The CHECK constraint would surface as a Prisma error. Re-raise
          // with a user-friendly message.
          if (
            err instanceof Prisma.PrismaClientKnownRequestError &&
            err.code === 'P2010' &&
            String(err.meta?.message).includes('wallets_balance_non_negative')
          ) {
            throw new BadRequestException({
              code: 'insufficient_funds',
              message: 'Insufficient wallet balance',
            });
          }
          throw err;
        }

        // Update stall booked counter.
        await tx.stall.update({
          where: { id: stallId },
          data: { booked: { increment: 1 } },
        });

        // Insert the booking row.
        const booking = await tx.booking.create({
          data: {
            stallId,
            userId,
            amountPaise,
            platformFeePaise,
            escrowHeldPaise,
            status: 'confirmed',
            bookingTxnId: txnId,
          },
        });

        const fresh = await tx.wallet.findUnique({ where: { id: vendorWallet.id } });
        this.log.log(
          `Booking ${booking.id}: user ${userId} booked stall ${stallId} (${stall.category}) for ₹${
            amountPaise / 100
          }; commission ₹${platformFeePaise / 100}`,
        );

        return {
          booking: this.toPublic(booking),
          newWalletBalancePaise: fresh!.balancePaise,
          _eventForNotification: { id: event.id, slug: event.slug, title: event.title, organiserUserId: event.organiser.userId, category: stall.category, amountPaise, escrowHeldPaise },
        };
      },
      { isolationLevel: 'Serializable' }, // strongest — prevents phantom-read races
    ).then(async (result) => {
      const e = result._eventForNotification;
      // Notify organiser, outside the transaction (best-effort).
      await this.notifications.create({
        userId: e.organiserUserId,
        type: 'booking_received',
        title: `New stall booking: ${e.title}`,
        body: `A vendor booked a ${e.category} stall for ₹${(e.amountPaise / 100).toLocaleString('en-IN')}. ₹${(e.escrowHeldPaise / 100).toLocaleString('en-IN')} is held in escrow.`,
        link: `/events/${e.slug}`,
        meta: { eventId: e.id, bookingId: result.booking.id, type: 'booking_received' },
      });
      // Strip our private field before returning.
      const { _eventForNotification, ...publicResult } = result;
      void _eventForNotification;
      return publicResult;
    });
  }

  // ============================================================
  // POST /bookings/:id/cancel — vendor cancels their booking; we refund the
  // full amount by reversing all three ledger legs. Stall slot returned.
  // Only allowed while the event hasn't started.
  // ============================================================
  async cancel(
    userId: string,
    bookingId: string,
  ): Promise<{ ok: true; refundedPaise: number; newWalletBalancePaise: number }> {
    const result = await this.db.$transaction(async (tx) => {
      const booking = await tx.booking.findUnique({
        where: { id: bookingId },
        include: {
          stall: {
            include: {
              event: { include: { organiser: { select: { id: true, userId: true } } } },
            },
          },
        },
      });
      if (!booking) throw new NotFoundException({ code: 'booking_not_found' });
      if (booking.userId !== userId) {
        throw new ForbiddenException({ code: 'not_owner', message: 'Not your booking' });
      }
      if (booking.status !== 'confirmed') {
        throw new BadRequestException({
          code: 'cannot_cancel',
          message: `Booking already ${booking.status}`,
        });
      }
      if (new Date(booking.stall.event.startsAt) < new Date()) {
        throw new BadRequestException({
          code: 'event_started',
          message: 'Event has already started; cancellation closed.',
        });
      }

      const vendorWallet = await this.wallet.getOrCreate('user', userId);
      const organiserWallet = await this.wallet.getOrCreate(
        'business',
        booking.stall.event.organiser.id,
      );
      const house = await this.wallet.getOrCreate('platform', null);

      // Reverse the three legs.
      const { txnId } = await this.wallet.transfer([
        {
          walletId: organiserWallet.id,
          direction: 'D',
          amountPaise: booking.escrowHeldPaise,
          bucket: 'pending',
          reason: 'refund',
          meta: { bookingId, side: 'organiser' },
        },
        {
          walletId: house.id,
          direction: 'D',
          amountPaise: booking.platformFeePaise,
          reason: 'refund',
          meta: { bookingId, side: 'house' },
        },
        {
          walletId: vendorWallet.id,
          direction: 'C',
          amountPaise: booking.amountPaise,
          reason: 'refund',
          meta: { bookingId, side: 'vendor' },
        },
      ]);

      // Return the stall slot.
      await tx.stall.update({
        where: { id: booking.stallId },
        data: { booked: { decrement: 1 } },
      });

      await tx.booking.update({
        where: { id: bookingId },
        data: { status: 'cancelled', cancelledAt: new Date(), refundTxnId: txnId },
      });

      const fresh = await tx.wallet.findUnique({ where: { id: vendorWallet.id } });
      return {
        refundedPaise: booking.amountPaise,
        newBalance: fresh!.balancePaise,
        organiserUserId: booking.stall.event.organiser.userId,
        eventTitle: booking.stall.event.title,
        eventSlug: booking.stall.event.slug,
      };
    });

    // Notify organiser (best-effort).
    void this.notifications.create({
      userId: result.organiserUserId,
      type: 'booking_received',
      title: `Booking cancelled · ${result.eventTitle}`,
      body: `A vendor cancelled their stall booking. Refunded ₹${(result.refundedPaise / 100).toLocaleString('en-IN')}.`,
      link: `/events/${result.eventSlug}`,
      meta: { bookingId, type: 'booking_cancelled' },
    });

    this.log.log(`Booking ${bookingId} cancelled by ${userId}. Refund ₹${result.refundedPaise / 100}.`);
    return { ok: true, refundedPaise: result.refundedPaise, newWalletBalancePaise: result.newBalance };
  }

  // ============================================================
  // GET /bookings/mine — list the user's bookings (newest first)
  // ============================================================
  async listMine(userId: string): Promise<PublicBooking[]> {
    const rows = await this.db.booking.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        stall: {
          select: {
            category: true,
            pricePaise: true,
            event: {
              select: {
                slug: true,
                title: true,
                startsAt: true,
                endsAt: true,
                addressText: true,
              },
            },
          },
        },
      },
    });
    return rows.map((r) => ({
      ...this.toPublic(r),
      stall: { category: r.stall.category, pricePaise: r.stall.pricePaise },
      event: {
        slug: r.stall.event.slug,
        title: r.stall.event.title,
        startsAt: r.stall.event.startsAt.toISOString(),
        endsAt: r.stall.event.endsAt.toISOString(),
        addressText: r.stall.event.addressText,
      },
    }));
  }

  // ============================================================
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private toPublic(b: any): PublicBooking {
    return {
      id: b.id,
      stallId: b.stallId,
      amountPaise: b.amountPaise,
      platformFeePaise: b.platformFeePaise,
      escrowHeldPaise: b.escrowHeldPaise,
      status: b.status,
      bookingTxnId: b.bookingTxnId,
      createdAt: b.createdAt.toISOString(),
    };
  }
}
