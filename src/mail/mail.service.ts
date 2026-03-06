import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { resolve4 } from 'dns/promises';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter: nodemailer.Transporter;
  private transporterReady: Promise<void>;

  constructor(private configService: ConfigService) {
    const host = this.configService.get('MAIL_HOST');
    const port = this.configService.get<number>('MAIL_PORT');
    const user = this.configService.get('MAIL_USER');

    this.logger.log(`Mail config: host=${host}, port=${port}, user=${user}`);

    // Nodemailer v8 ignores the `family` option and randomly picks between
    // IPv4/IPv6 addresses. Render free tier doesn't support IPv6 outbound,
    // so we resolve the hostname to IPv4 ourselves and pass the IP directly.
    this.transporterReady = resolve4(host)
      .then((addresses) => {
        const ipv4 = addresses[0];
        this.logger.log(`Resolved ${host} to IPv4: ${ipv4}`);
        this.transporter = nodemailer.createTransport({
          host: ipv4,
          port,
          secure: false,
          auth: {
            user,
            pass: this.configService.get('MAIL_PASS'),
          },
          tls: {
            servername: host,
          },
        } as nodemailer.TransportOptions);
      })
      .catch((err) => {
        this.logger.error(`Failed to resolve ${host} to IPv4: ${err.message}`);
        // Fallback: use hostname directly and hope for the best
        this.transporter = nodemailer.createTransport({
          host,
          port,
          secure: false,
          auth: {
            user,
            pass: this.configService.get('MAIL_PASS'),
          },
        } as nodemailer.TransportOptions);
      });
  }

  async sendOtp(email: string, otp: string): Promise<void> {
    await this.transporterReady;

    const from = this.configService.get(
      'MAIL_FROM',
      'First Touch Ministry <noreply@ftm.com>',
    );

    try {
      const result = await this.transporter.sendMail({
        from,
        to: email,
        subject: 'Your Verification Code - First Touch Ministry',
        html: `
          <div style="font-family: 'Inter', Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px;">
            <h2 style="color: #1a3a4a; margin-bottom: 8px;">Email Verification</h2>
            <p style="color: #64748b; margin-bottom: 24px;">Use the code below to verify your email address for FTM App registration.</p>
            <div style="background: #f4f6fa; border-radius: 12px; padding: 24px; text-align: center; margin-bottom: 24px;">
              <span style="font-size: 32px; font-weight: 700; letter-spacing: 8px; color: #1a3a4a;">${otp}</span>
            </div>
            <p style="color: #94a3b8; font-size: 14px;">This code expires in 10 minutes. If you didn't request this, please ignore this email.</p>
          </div>
        `,
      });
      this.logger.log(`OTP email sent to ${email}, messageId: ${result.messageId}`);
    } catch (error) {
      this.logger.error(`Failed to send OTP email to ${email}: ${error.message}`, error.stack);
      throw error;
    }
  }
}
