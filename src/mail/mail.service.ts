import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private transporter: nodemailer.Transporter;

  constructor(private configService: ConfigService) {
    this.transporter = nodemailer.createTransport({
      host: this.configService.get('MAIL_HOST'),
      port: this.configService.get<number>('MAIL_PORT'),
      secure: false,
      family: 4,
      auth: {
        user: this.configService.get('MAIL_USER'),
        pass: this.configService.get('MAIL_PASS'),
      },
    });
  }

  async sendOtp(email: string, otp: string): Promise<void> {
    const from = this.configService.get(
      'MAIL_FROM',
      'First Touch Ministry <noreply@ftm.com>',
    );

    await this.transporter.sendMail({
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
  }
}
