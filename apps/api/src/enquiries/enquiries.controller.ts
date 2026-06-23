import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { EnquiriesService } from './enquiries.service';
import {
  createEnquirySchema,
  replyEnquirySchema,
  type PublicEnquiry,
} from './dto/enquiry.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('enquiries')
export class EnquiriesController {
  constructor(private readonly enquiries: EnquiriesService) {}

  // POST /api/v1/enquiries — buyer creates an enquiry.
  @UseGuards(JwtAuthGuard)
  @Post()
  async create(
    @CurrentUser() user: { id: string },
    @Body() raw: unknown,
  ): Promise<PublicEnquiry> {
    const parsed = createEnquirySchema.safeParse(raw);
    if (!parsed.success) {
      throw new BadRequestException({
        code: 'invalid_payload',
        issues: parsed.error.flatten(),
      });
    }
    return this.enquiries.create(user.id, parsed.data);
  }

  // GET /api/v1/enquiries/received — vendor inbox.
  @UseGuards(JwtAuthGuard)
  @Get('received')
  received(@CurrentUser() user: { id: string }): Promise<PublicEnquiry[]> {
    return this.enquiries.listReceived(user.id);
  }

  // PATCH /api/v1/enquiries/:id/reply — owner reply.
  @UseGuards(JwtAuthGuard)
  @Patch(':id/reply')
  async reply(
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
    @Body() raw: unknown,
  ): Promise<PublicEnquiry> {
    const parsed = replyEnquirySchema.safeParse(raw);
    if (!parsed.success) {
      throw new BadRequestException({
        code: 'invalid_payload',
        issues: parsed.error.flatten(),
      });
    }
    return this.enquiries.reply(user.id, id, parsed.data);
  }

  // PATCH /api/v1/enquiries/:id/read — mark seen.
  @UseGuards(JwtAuthGuard)
  @Patch(':id/read')
  markRead(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return this.enquiries.markRead(user.id, id);
  }
}
