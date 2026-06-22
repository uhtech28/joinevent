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
import { Throttle } from '@nestjs/throttler';
import { WithdrawalsService } from './withdrawals.service';
import {
  decideWithdrawalSchema,
  requestWithdrawalSchema,
} from './dto/withdrawal.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../admin/admin.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller()
export class WithdrawalsController {
  constructor(private readonly withdrawals: WithdrawalsService) {}

  // POST /wallet/withdraw — user request.
  // 3 withdrawal attempts per HOUR — legitimate users rarely request more.
  @Throttle({ default: { ttl: 3_600_000, limit: 3 } })
  @UseGuards(JwtAuthGuard)
  @Post('wallet/withdraw')
  @HttpCode(200)
  request(@CurrentUser() user: { id: string }, @Body() raw: unknown) {
    const parsed = requestWithdrawalSchema.safeParse(raw);
    if (!parsed.success) {
      throw new BadRequestException({ code: 'invalid_payload', issues: parsed.error.flatten() });
    }
    return this.withdrawals.request(user.id, parsed.data);
  }

  // GET /wallet/withdraw/mine
  @UseGuards(JwtAuthGuard)
  @Get('wallet/withdraw/mine')
  mine(@CurrentUser() user: { id: string }) {
    return this.withdrawals.listMine(user.id);
  }

  // GET /admin/withdrawals — pending queue
  @UseGuards(JwtAuthGuard, AdminGuard)
  @Get('admin/withdrawals')
  pending() {
    return this.withdrawals.listPending();
  }

  // POST /admin/withdrawals/:id/decide  {approve: bool, note?}
  @UseGuards(JwtAuthGuard, AdminGuard)
  @Post('admin/withdrawals/:id/decide')
  @HttpCode(200)
  decide(
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
    @Body() raw: unknown,
  ) {
    const parsed = decideWithdrawalSchema.safeParse(raw);
    if (!parsed.success) {
      throw new BadRequestException({ code: 'invalid_payload', issues: parsed.error.flatten() });
    }
    return this.withdrawals.decide(user.id, id, parsed.data);
  }
}
