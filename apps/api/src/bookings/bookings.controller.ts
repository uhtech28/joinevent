import {
  BadRequestException,
  Controller,
  Get,
  HttpCode,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { BookingsService } from './bookings.service';
import { bookStallParamsSchema } from './dto/booking.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller()
export class BookingsController {
  constructor(private readonly bookings: BookingsService) {}

  // POST /events/:eventId/stalls/:stallId/book — vendor books a stall.
  // 10 booking attempts / min per IP. Real users book 1–2 times in a session.
  @Throttle({ default: { ttl: 60_000, limit: 10 } })
  @UseGuards(JwtAuthGuard)
  @Post('events/:eventId/stalls/:stallId/book')
  @HttpCode(200)
  book(
    @CurrentUser() user: { id: string },
    @Param('eventId') eventId: string,
    @Param('stallId') stallId: string,
  ) {
    const parsed = bookStallParamsSchema.safeParse({ eventId, stallId });
    if (!parsed.success) {
      throw new BadRequestException({ code: 'invalid_ids', issues: parsed.error.flatten() });
    }
    return this.bookings.book(user.id, parsed.data.eventId, parsed.data.stallId);
  }

  // GET /bookings/mine — the signed-in user's bookings
  @UseGuards(JwtAuthGuard)
  @Get('bookings/mine')
  mine(@CurrentUser() user: { id: string }) {
    return this.bookings.listMine(user.id);
  }

  // POST /bookings/:id/cancel — refund + stall slot restored
  @Throttle({ default: { ttl: 60_000, limit: 10 } })
  @UseGuards(JwtAuthGuard)
  @Post('bookings/:id/cancel')
  @HttpCode(200)
  cancel(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return this.bookings.cancel(user.id, id);
  }
}
