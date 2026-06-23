import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { BusinessProfilesService } from './business-profiles.service';
import {
  createBusinessProfileSchema,
  updateBusinessProfileSchema,
  type PublicBusinessProfile,
} from './dto/business-profile.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('business-profiles')
export class BusinessProfilesController {
  constructor(private readonly profiles: BusinessProfilesService) {}

  // GET /business-profiles/me — list signed-in user's profiles
  @UseGuards(JwtAuthGuard)
  @Get('me')
  mine(@CurrentUser() user: { id: string }): Promise<PublicBusinessProfile[]> {
    return this.profiles.listMine(user.id);
  }

  // GET /business-profiles/search?q=…&type=organiser|vendor&limit=20
  // Public search across username / display name / bio / location.
  @Get('search')
  search(
    @Query('q') q?: string,
    @Query('type') type?: string,
    @Query('limit') limit?: string,
  ): Promise<PublicBusinessProfile[]> {
    const term = (q ?? '').trim();
    if (term.length < 2) return Promise.resolve([]);
    const t = type === 'organiser' || type === 'vendor' ? type : undefined;
    const n = limit ? Math.min(50, Math.max(1, Number(limit) || 20)) : 20;
    return this.profiles.search(term, t, n);
  }

  // GET /business-profiles/discover?type=organiser|vendor&limit=24
  // Public list of popular profiles for the Explore page default state.
  // Must be declared before the :username route so it isn't shadowed.
  @Get('discover')
  discover(
    @Query('type') type?: string,
    @Query('limit') limit?: string,
  ): Promise<PublicBusinessProfile[]> {
    const t = type === 'organiser' || type === 'vendor' ? type : undefined;
    const n = limit ? Math.min(50, Math.max(1, Number(limit) || 24)) : 24;
    return this.profiles.discover(t, n);
  }

  // GET /business-profiles/:username — public; if authed, includes isFollowing
  @UseGuards(OptionalJwtAuthGuard)
  @Get(':username')
  byUsername(
    @Param('username') username: string,
    @CurrentUser() viewer?: { id: string },
  ): Promise<PublicBusinessProfile> {
    return this.profiles.findByUsername(username, viewer?.id);
  }

  // PATCH /business-profiles/me — owner updates their own profile
  @UseGuards(JwtAuthGuard)
  @Patch('me')
  async updateMine(
    @CurrentUser() user: { id: string },
    @Body() raw: unknown,
  ): Promise<PublicBusinessProfile> {
    const parsed = updateBusinessProfileSchema.safeParse(raw);
    if (!parsed.success) {
      throw new BadRequestException({
        code: 'invalid_payload',
        issues: parsed.error.flatten(),
      });
    }
    return this.profiles.updateMine(user.id, parsed.data);
  }

  // POST /business-profiles — become an organiser/vendor
  @UseGuards(JwtAuthGuard)
  @Post()
  async create(
    @CurrentUser() user: { id: string },
    @Body() raw: unknown,
  ): Promise<PublicBusinessProfile> {
    const parsed = createBusinessProfileSchema.safeParse(raw);
    if (!parsed.success) {
      throw new BadRequestException({
        code: 'invalid_payload',
        issues: parsed.error.flatten(),
      });
    }
    return this.profiles.create(user.id, parsed.data);
  }

  // GET /business-profiles/:username/events?when=upcoming|past
  @Get(':username/events')
  events(@Param('username') username: string, @Query('when') when?: string) {
    const w = when === 'past' ? 'past' : 'upcoming';
    return this.profiles.listEvents(username, w);
  }

  // GET /business-profiles/:username/reviews
  @Get(':username/reviews')
  reviews(@Param('username') username: string) {
    return this.profiles.listReviews(username);
  }

  // GET /business-profiles/:username/followers — public list (max 200)
  @Get(':username/followers')
  followers(@Param('username') username: string) {
    return this.profiles.listFollowers(username);
  }
}
