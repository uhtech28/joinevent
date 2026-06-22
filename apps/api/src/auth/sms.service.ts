import { Injectable, Logger } from '@nestjs/common';
import { loadEnv } from '../env';

/**
 * SMS abstraction.
 *
 * In dev (SMS_PROVIDER=stub) we print the OTP loudly to the API console so
 * you can sign in without paying for SMS. In Step 3.5 we add MSG91 wiring.
 */
@Injectable()
export class SmsService {
  private readonly log = new Logger(SmsService.name);

  async sendOtp(phoneE164: string, otp: string): Promise<void> {
    const env = loadEnv();

    if (env.SMS_PROVIDER === 'stub') {
      this.log.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      this.log.log(`📱  OTP for ${phoneE164}:  ${otp}`);
      this.log.log('     (stub provider — copy this into the /login screen)');
      this.log.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      return;
    }

    if (env.SMS_PROVIDER === 'msg91') {
      // Step 3.5 implements the real MSG91 call. We keep the surface ready.
      throw new Error('MSG91 provider not yet implemented — set SMS_PROVIDER=stub for now.');
    }

    throw new Error(`Unknown SMS_PROVIDER: ${env.SMS_PROVIDER}`);
  }
}
