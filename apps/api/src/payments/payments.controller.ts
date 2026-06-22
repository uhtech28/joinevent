import {
  BadRequestException,
  Body,
  Controller,
  Headers,
  HttpCode,
  Post,
  UseGuards,
} from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { topupSchema } from './dto/payment.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller()
export class PaymentsController {
  constructor(private readonly payments: PaymentsService) {}

  // POST /wallet/topup — authed user adds money. In dev: instant.
  @UseGuards(JwtAuthGuard)
  @Post('wallet/topup')
  @HttpCode(200)
  topup(@CurrentUser() user: { id: string }, @Body() raw: unknown) {
    const parsed = topupSchema.safeParse(raw);
    if (!parsed.success) {
      throw new BadRequestException({
        code: 'invalid_payload',
        issues: parsed.error.flatten(),
      });
    }
    return this.payments.initiateTopup(user.id, parsed.data.amountPaise);
  }

  // POST /payments/payu/webhook — PayU calls this server-to-server.
  // Public endpoint; HMAC inside.
  @Post('payments/payu/webhook')
  @HttpCode(200)
  webhook(
    @Body() raw: Record<string, unknown>,
    @Headers('x-payu-signature') signature?: string,
  ) {
    return this.payments.handleWebhook(raw, signature);
  }
}
