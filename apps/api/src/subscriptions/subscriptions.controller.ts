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
import { SubscriptionsService } from './subscriptions.service';
import { subscribeSchema } from './dto/subscription.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller()
export class SubscriptionsController {
  constructor(private readonly subs: SubscriptionsService) {}

  @Get('subscriptions/plans')
  plans() {
    return this.subs.listPlans();
  }

  @UseGuards(JwtAuthGuard)
  @Get('subscriptions/mine')
  mine(@CurrentUser() user: { id: string }) {
    return this.subs.mine(user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Post('subscriptions')
  @HttpCode(200)
  subscribe(@CurrentUser() user: { id: string }, @Body() raw: unknown) {
    const parsed = subscribeSchema.safeParse(raw);
    if (!parsed.success) {
      throw new BadRequestException({ code: 'invalid_payload', issues: parsed.error.flatten() });
    }
    return this.subs.subscribe(user.id, parsed.data);
  }

  @UseGuards(JwtAuthGuard)
  @Post('subscriptions/:id/cancel')
  @HttpCode(200)
  cancel(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return this.subs.cancel(user.id, id);
  }
}
