import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ReviewsService } from './reviews.service';
import { createReviewSchema, listReviewsQuerySchema } from './dto/review.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller()
export class ReviewsController {
  constructor(private readonly reviews: ReviewsService) {}

  // GET /events/:slug/reviews — public
  @Get('events/:slug/reviews')
  async list(@Param('slug') slug: string, @Query() raw: Record<string, string>) {
    const parsed = listReviewsQuerySchema.safeParse(raw);
    if (!parsed.success) {
      throw new BadRequestException({ code: 'invalid_query', issues: parsed.error.flatten() });
    }
    return this.reviews.list(slug, parsed.data);
  }

  // POST /events/:slug/reviews — auth required.
  // 5 reviews / hour limits review spam (one review per event is enforced
  // in the service via @@unique).
  @Throttle({ default: { ttl: 3_600_000, limit: 5 } })
  @UseGuards(JwtAuthGuard)
  @Post('events/:slug/reviews')
  @HttpCode(201)
  async create(
    @CurrentUser() user: { id: string },
    @Param('slug') slug: string,
    @Body() raw: unknown,
  ) {
    const parsed = createReviewSchema.safeParse(raw);
    if (!parsed.success) {
      throw new BadRequestException({ code: 'invalid_payload', issues: parsed.error.flatten() });
    }
    return this.reviews.create(user.id, slug, parsed.data);
  }
}
