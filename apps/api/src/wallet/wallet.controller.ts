import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { WalletService } from './wallet.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('wallet')
export class WalletController {
  constructor(private readonly wallet: WalletService) {}

  // GET /wallet — current user's wallet + last 50 ledger entries
  @UseGuards(JwtAuthGuard)
  @Get()
  mine(@CurrentUser() user: { id: string }) {
    return this.wallet.getMine(user.id);
  }

  // GET /wallet/sparkline?days=30 — daily running balance series
  @UseGuards(JwtAuthGuard)
  @Get('sparkline')
  sparkline(@CurrentUser() user: { id: string }, @Query('days') daysRaw?: string) {
    const days = Math.min(Math.max(parseInt(daysRaw ?? '30', 10) || 30, 7), 90);
    return this.wallet.sparkline(user.id, days);
  }

  // GET /wallet/breakdown — current-month credits grouped by reason
  @UseGuards(JwtAuthGuard)
  @Get('breakdown')
  breakdown(@CurrentUser() user: { id: string }) {
    return this.wallet.breakdown(user.id);
  }

  // GET /wallet/_audit — dev-only invariant check
  @Get('_audit')
  audit() {
    return this.wallet.ledgerInvariant();
  }
}
