// Email delivery service. Stub in dev (logs to console), Postmark/SendGrid in prod.
// Single interface so callers don't care which provider is configured.

import { Injectable, Logger } from '@nestjs/common';
import { loadEnv } from '../env';

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text: string;
}

@Injectable()
export class EmailService {
  private readonly log = new Logger(EmailService.name);

  async send(opts: EmailOptions): Promise<{ delivered: boolean }> {
    const env = loadEnv();

    if (env.EMAIL_PROVIDER === 'stub') {
      // Dev — log to console (visible in pnpm dev output).
      this.log.log(
        `[EMAIL STUB] to=${opts.to} subject="${opts.subject}"\n  body: ${opts.text}`,
      );
      return { delivered: true };
    }

    if (env.EMAIL_PROVIDER === 'postmark') {
      if (!env.POSTMARK_TOKEN) {
        this.log.warn('POSTMARK_TOKEN missing; falling back to stub');
        return this.send({ ...opts });
      }
      const res = await fetch('https://api.postmarkapp.com/email', {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          'X-Postmark-Server-Token': env.POSTMARK_TOKEN,
        },
        body: JSON.stringify({
          From: env.EMAIL_FROM,
          To: opts.to,
          Subject: opts.subject,
          HtmlBody: opts.html,
          TextBody: opts.text,
          MessageStream: 'outbound',
        }),
      });
      const json = (await res.json()) as { ErrorCode?: number; Message?: string };
      if (!res.ok || json.ErrorCode) {
        this.log.warn(`Postmark error: ${json.Message ?? res.status}`);
        return { delivered: false };
      }
      return { delivered: true };
    }

    // SendGrid path (similar; just log for now)
    this.log.warn(`EMAIL_PROVIDER=${env.EMAIL_PROVIDER} not implemented`);
    return { delivered: false };
  }

  // ----- Convenience templates -----

  verifyEmail(email: string, link: string) {
    return this.send({
      to: email,
      subject: 'Verify your JoinEvents email',
      text: `Click to verify your email: ${link}\n\nIf you didn't sign up, ignore this email.`,
      html: `
        <div style="font-family:system-ui;padding:24px;max-width:560px;margin:auto">
          <h2 style="color:#ff6b35">Welcome to JoinEvents</h2>
          <p>Confirm your email to activate your account:</p>
          <p><a href="${link}" style="display:inline-block;background:#ff6b35;color:#fff;text-decoration:none;padding:12px 24px;border-radius:12px;font-weight:600">Verify email</a></p>
          <p style="color:#777;font-size:13px">If you didn't sign up, you can ignore this.</p>
        </div>`,
    });
  }

  resetPassword(email: string, link: string) {
    return this.send({
      to: email,
      subject: 'Reset your JoinEvents password',
      text: `Reset your password: ${link}\n\nLink expires in 1 hour. If you didn't request this, ignore.`,
      html: `
        <div style="font-family:system-ui;padding:24px;max-width:560px;margin:auto">
          <h2 style="color:#ff6b35">Password reset</h2>
          <p>Click below to set a new password (expires in 1 hour):</p>
          <p><a href="${link}" style="display:inline-block;background:#ff6b35;color:#fff;text-decoration:none;padding:12px 24px;border-radius:12px;font-weight:600">Reset password</a></p>
        </div>`,
    });
  }
}
