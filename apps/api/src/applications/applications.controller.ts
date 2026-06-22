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
import { ApplicationsService } from './applications.service';
import {
  APPLICATION_STATUSES,
  decideApplicationSchema,
  submitApplicationSchema,
  type ApplicationStatus,
  type PublicApplication,
} from './dto/application.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller()
export class ApplicationsController {
  constructor(private readonly applications: ApplicationsService) {}

  // POST /events/:slug/apply — vendor submits an application
  @UseGuards(JwtAuthGuard)
  @Post('events/:slug/apply')
  async submit(
    @CurrentUser() user: { id: string },
    @Param('slug') slug: string,
    @Body() raw: unknown,
  ): Promise<PublicApplication> {
    const parsed = submitApplicationSchema.safeParse(raw);
    if (!parsed.success) {
      throw new BadRequestException({
        code: 'invalid_payload',
        issues: parsed.error.flatten(),
      });
    }
    return this.applications.submit(user.id, slug, parsed.data);
  }

  // GET /applications/mine — vendor's own applications
  @UseGuards(JwtAuthGuard)
  @Get('applications/mine')
  mine(
    @CurrentUser() user: { id: string },
    @Query('status') status?: string,
  ): Promise<PublicApplication[]> {
    return this.applications.listMine(user.id, parseStatusFilter(status));
  }

  // GET /applications/received — organiser's incoming applications
  @UseGuards(JwtAuthGuard)
  @Get('applications/received')
  received(
    @CurrentUser() user: { id: string },
    @Query('status') status?: string,
  ): Promise<PublicApplication[]> {
    return this.applications.listReceived(user.id, parseStatusFilter(status));
  }

  // PATCH /applications/:id/decide — organiser approves / rejects
  @UseGuards(JwtAuthGuard)
  @Patch('applications/:id/decide')
  async decide(
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
    @Body() raw: unknown,
  ): Promise<PublicApplication> {
    const parsed = decideApplicationSchema.safeParse(raw);
    if (!parsed.success) {
      throw new BadRequestException({
        code: 'invalid_payload',
        issues: parsed.error.flatten(),
      });
    }
    return this.applications.decide(user.id, id, parsed.data);
  }
}

function parseStatusFilter(raw: string | undefined): ApplicationStatus | 'all' {
  if (!raw || raw === 'all') return 'all';
  if (APPLICATION_STATUSES.includes(raw as ApplicationStatus)) {
    return raw as ApplicationStatus;
  }
  return 'all';
}
