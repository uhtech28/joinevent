import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { EventsService } from './events.service';
import { listEventsQuerySchema } from './dto/list-events.dto';
import { discoverSchema } from './dto/discover.dto';
import { createEventSchema, updateEventSchema } from './dto/create-event.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller()
export class EventsController {
  constructor(private readonly events: EventsService) {}

  // POST /api/v1/discover
  @Post('discover')
  @HttpCode(200)
  async discover(@Body() raw: unknown) {
    const parsed = discoverSchema.safeParse(raw);
    if (!parsed.success) {
      throw new BadRequestException({
        code: 'invalid_payload',
        issues: parsed.error.flatten(),
      });
    }
    return this.events.discover(parsed.data);
  }

  // GET /api/v1/events/mine — must come before /events/:slug
  @UseGuards(JwtAuthGuard)
  @Get('events/mine')
  mine(@CurrentUser() user: { id: string }) {
    return this.events.listMine(user.id);
  }

  // GET /api/v1/events?city=Noida&limit=12&cursor=…
  @Get('events')
  async list(@Query() raw: Record<string, string>) {
    const parsed = listEventsQuerySchema.safeParse(raw);
    if (!parsed.success) {
      throw new BadRequestException({
        code: 'invalid_query',
        issues: parsed.error.flatten(),
      });
    }
    return this.events.list(parsed.data);
  }

  // GET /api/v1/events/:slug
  @Get('events/:slug')
  async detail(@Param('slug') slug: string) {
    return this.events.findBySlug(slug);
  }

  // POST /api/v1/events  — create draft
  @UseGuards(JwtAuthGuard)
  @Post('events')
  async create(@CurrentUser() user: { id: string }, @Body() raw: unknown) {
    const parsed = createEventSchema.safeParse(raw);
    if (!parsed.success) {
      throw new BadRequestException({
        code: 'invalid_payload',
        issues: parsed.error.flatten(),
      });
    }
    return this.events.create(user.id, parsed.data);
  }

  // PATCH /api/v1/events/:id  — owner only
  @UseGuards(JwtAuthGuard)
  @Patch('events/:id')
  async update(
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
    @Body() raw: unknown,
  ) {
    const parsed = updateEventSchema.safeParse(raw);
    if (!parsed.success) {
      throw new BadRequestException({
        code: 'invalid_payload',
        issues: parsed.error.flatten(),
      });
    }
    return this.events.update(user.id, id, parsed.data);
  }

  // POST /api/v1/events/:id/submit — draft → live (dev) / pending (prod)
  @UseGuards(JwtAuthGuard)
  @Post('events/:id/submit')
  @HttpCode(200)
  submit(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return this.events.submit(user.id, id);
  }

  // DELETE /api/v1/events/:id — owner only. Refuses if any vendor has booked.
  @UseGuards(JwtAuthGuard)
  @Delete('events/:id')
  @HttpCode(200)
  remove(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return this.events.remove(user.id, id);
  }
}
