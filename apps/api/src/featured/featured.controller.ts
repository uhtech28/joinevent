import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { FeaturedService } from './featured.service';
import { boostSchema, TIERS } from './dto/featured.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller()
export class FeaturedController {
  constructor(private readonly featured: FeaturedService) {}

  // GET /featured/tiers — pricing info (public)
  @Get('featured/tiers')
  tiers() {
    return Object.entries(TIERS).map(([k, v]) => ({ tier: k, ...v }));
  }

  // POST /events/:id/boost — buy a feature
  @UseGuards(JwtAuthGuard)
  @Post('events/:id/boost')
  @HttpCode(200)
  boost(
    @CurrentUser() user: { id: string },
    @Param('id') eventId: string,
    @Body() raw: unknown,
  ) {
    const parsed = boostSchema.safeParse(raw);
    if (!parsed.success) {
      throw new BadRequestException({ code: 'invalid_payload', issues: parsed.error.flatten() });
    }
    return this.featured.boost(user.id, eventId, parsed.data);
  }
}
