import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { AdminService } from './admin.service';
import { kycActionSchema } from './dto/admin.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AdminGuard } from './admin.guard';

@UseGuards(JwtAuthGuard, AdminGuard)
@Controller('admin')
export class AdminController {
  constructor(private readonly admin: AdminService) {}

  @Get('overview')
  overview() {
    return this.admin.overview();
  }

  @Get('kyc/pending')
  pending() {
    return this.admin.listPendingKyc();
  }

  @Post('kyc/:profileId/approve')
  @HttpCode(200)
  approve(
    @CurrentUser() user: { id: string },
    @Param('profileId') profileId: string,
    @Body() raw: unknown,
    @Req() req: Request,
  ) {
    const parsed = kycActionSchema.safeParse(raw ?? {});
    if (!parsed.success) {
      throw new BadRequestException({ code: 'invalid_payload', issues: parsed.error.flatten() });
    }
    return this.admin.approveKyc(user.id, profileId, parsed.data.note, {
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });
  }

  @Post('kyc/:profileId/reject')
  @HttpCode(200)
  reject(
    @CurrentUser() user: { id: string },
    @Param('profileId') profileId: string,
    @Body() raw: unknown,
    @Req() req: Request,
  ) {
    const parsed = kycActionSchema.safeParse(raw ?? {});
    if (!parsed.success) {
      throw new BadRequestException({ code: 'invalid_payload', issues: parsed.error.flatten() });
    }
    return this.admin.rejectKyc(user.id, profileId, parsed.data, {
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });
  }

  @Get('audit-log')
  auditLog() {
    return this.admin.listAuditLog();
  }
}
