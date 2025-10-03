import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
  private transporter: nodemailer.Transporter;

  constructor(private configService: ConfigService) {
    this.transporter = nodemailer.createTransport({
      host: this.configService.get<string>('SMTP_HOST', 'smtp.gmail.com'),
      port: this.configService.get<number>('SMTP_PORT', 587),
      secure: false, // true for 465, false for other ports
      auth: {
        user: this.configService.get<string>('SMTP_USER'),
        pass: this.configService.get<string>('SMTP_PASS'),
      },
    });
  }

  async sendVerificationEmail(email: string, verificationCode: string, firstName: string): Promise<void> {
    const mailOptions = {
      from: `"BUKKi Platform" <${this.configService.get<string>('SMTP_USER')}>`,
      to: email,
      subject: 'Verify Your Email - BUKKi Platform',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #f97316, #ea580c); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 28px;">BUKKi</h1>
            <p style="color: white; margin: 10px 0 0 0; font-size: 16px;">Booking Platform</p>
          </div>
          
          <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px;">
            <h2 style="color: #1f2937; margin: 0 0 20px 0;">Welcome to BUKKi, ${firstName}!</h2>
            
            <p style="color: #6b7280; line-height: 1.6; margin-bottom: 25px;">
              Thank you for registering with BUKKi! To complete your account setup, please verify your email address using the code below:
            </p>
            
            <div style="background: #f3f4f6; border: 2px dashed #d1d5db; padding: 20px; text-align: center; border-radius: 8px; margin: 25px 0;">
              <h3 style="color: #1f2937; margin: 0; font-size: 32px; letter-spacing: 4px; font-family: 'Courier New', monospace;">
                ${verificationCode}
              </h3>
            </div>
            
            <p style="color: #6b7280; line-height: 1.6; margin-bottom: 25px;">
              Enter this code in the verification form to activate your account. This code will expire in 15 minutes.
            </p>
            
            <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0;">
              <p style="color: #92400e; margin: 0; font-size: 14px;">
                <strong>Security Note:</strong> If you didn't create an account with BUKKi, please ignore this email.
              </p>
            </div>
            
            <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
              Best regards,<br>
              The BUKKi Team
            </p>
          </div>
        </div>
      `,
    };

    try {
      await this.transporter.sendMail(mailOptions);
    } catch (error) {
      console.error('Failed to send verification email:', error);
      throw new Error('Failed to send verification email');
    }
  }

  async sendPasswordResetEmail(email: string, resetToken: string, firstName: string): Promise<void> {
    const resetUrl = `${this.configService.get<string>('FRONTEND_URL')}/reset-password?token=${resetToken}`;
    
    const mailOptions = {
      from: `"BUKKi Platform" <${this.configService.get<string>('SMTP_USER')}>`,
      to: email,
      subject: 'Reset Your Password - BUKKi Platform',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #f97316, #ea580c); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 28px;">BUKKi</h1>
            <p style="color: white; margin: 10px 0 0 0; font-size: 16px;">Password Reset</p>
          </div>
          
          <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px;">
            <h2 style="color: #1f2937; margin: 0 0 20px 0;">Password Reset Request</h2>
            
            <p style="color: #6b7280; line-height: 1.6; margin-bottom: 25px;">
              Hello ${firstName},<br><br>
              We received a request to reset your password for your BUKKi account. Click the button below to reset your password:
            </p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${resetUrl}" 
                 style="background: #f97316; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
                Reset My Password
              </a>
            </div>
            
            <p style="color: #6b7280; line-height: 1.6; margin-bottom: 25px;">
              If the button doesn't work, copy and paste this link into your browser:<br>
              <a href="${resetUrl}" style="color: #f97316; word-break: break-all;">${resetUrl}</a>
            </p>
            
            <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0;">
              <p style="color: #92400e; margin: 0; font-size: 14px;">
                <strong>Security Note:</strong> This link will expire in 1 hour. If you didn't request a password reset, please ignore this email.
              </p>
            </div>
            
            <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
              Best regards,<br>
              The BUKKi Team
            </p>
          </div>
        </div>
      `,
    };

    try {
      await this.transporter.sendMail(mailOptions);
    } catch (error) {
      console.error('Failed to send password reset email:', error);
      throw new Error('Failed to send password reset email');
    }
  }

  async sendEmail(to: string | string[], subject: string, html: string): Promise<void> {
    const mailOptions = {
      from: `"BUKKi Platform" <${this.configService.get<string>('SMTP_USER')}>`,
      to,
      subject,
      html,
    } as any;
    await this.transporter.sendMail(mailOptions);
  }

  async sendNewBookingNotification(to: string | string[], params: {
    businessName: string;
    serviceName: string;
    appointmentDate: string;
    customerName?: string;
    totalAmount?: string;
  }): Promise<void> {
    const { businessName, serviceName, appointmentDate, customerName, totalAmount } = params;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width:600px; margin:0 auto; padding:20px;">
        <div style="background: linear-gradient(135deg, #f97316, #ea580c); padding: 20px; color:#fff; border-radius:8px 8px 0 0;">
          <h2 style="margin:0;">New Booking Request</h2>
          <p style="margin:6px 0 0;">${businessName}</p>
        </div>
        <div style="border:1px solid #e5e7eb; border-top:0; padding:20px; border-radius:0 0 8px 8px;">
          <p><strong>Service:</strong> ${serviceName}</p>
          <p><strong>Date:</strong> ${appointmentDate}</p>
          ${customerName ? `<p><strong>Customer:</strong> ${customerName}</p>` : ''}
          ${totalAmount ? `<p><strong>Total:</strong> ${totalAmount}</p>` : ''}
          <p style="margin-top:16px; color:#6b7280;">Log in to your dashboard to manage this booking.</p>
        </div>
      </div>
    `;
    await this.sendEmail(to, 'New Booking - BUKKi', html);
  }

  async sendCampaignEmail(to: string, subject: string, html: string): Promise<void> {
    await this.sendEmail(to, subject, html);
  }
}
