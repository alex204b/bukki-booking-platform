import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
  private transporter: nodemailer.Transporter;

  constructor(private configService: ConfigService) {
    const smtpConfig = {
      host: this.configService.get<string>('SMTP_HOST', 'smtp.gmail.com'),
      port: this.configService.get<number>('SMTP_PORT', 587),
      secure: false, // true for 465, false for other ports
      auth: {
        user: this.configService.get<string>('SMTP_USER'),
        pass: this.configService.get<string>('SMTP_PASS'),
      },
    };

    console.log('SMTP Config:', {
      host: smtpConfig.host,
      port: smtpConfig.port,
      user: smtpConfig.auth.user,
      pass: smtpConfig.auth.pass ? '***' : 'NOT SET'
    });

    this.transporter = nodemailer.createTransport(smtpConfig);

    // Verify connection configuration
    this.transporter.verify((error, success) => {
      if (error) {
        console.error('SMTP Connection Error:', error);
      } else {
        console.log('SMTP Server is ready to take our messages');
      }
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
      console.log('Sending verification email to:', email);
      console.log('Verification code:', verificationCode);
      const result = await this.transporter.sendMail(mailOptions);
      console.log('Email sent successfully:', result.messageId);
    } catch (error) {
      console.error('Failed to send verification email:', error);
      console.error('Error details:', {
        code: error.code,
        command: error.command,
        response: error.response
      });
      throw new Error(`Failed to send verification email: ${error.message}`);
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

  async sendPasswordResetCode(email: string, resetCode: string, firstName: string): Promise<void> {
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
              We received a request to reset your password for your BUKKi account. Please use the code below to verify your identity:
            </p>
            
            <div style="background: #f3f4f6; border: 2px dashed #d1d5db; padding: 20px; text-align: center; border-radius: 8px; margin: 25px 0;">
              <h3 style="color: #1f2937; margin: 0; font-size: 32px; letter-spacing: 4px; font-family: 'Courier New', monospace;">
                ${resetCode}
              </h3>
            </div>
            
            <p style="color: #6b7280; line-height: 1.6; margin-bottom: 25px;">
              Enter this code in the password reset form to continue. This code will expire in 15 minutes.
            </p>
            
            <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0;">
              <p style="color: #92400e; margin: 0; font-size: 14px;">
                <strong>Security Note:</strong> If you didn't request a password reset, please ignore this email. Your password will remain unchanged.
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
      console.log('Sending password reset code to:', email);
      console.log('Reset code:', resetCode);
      const result = await this.transporter.sendMail(mailOptions);
      console.log('Password reset email sent successfully:', result.messageId);
    } catch (error) {
      console.error('Failed to send password reset email:', error);
      throw new Error(`Failed to send password reset email: ${error.message}`);
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

  async sendBookingConfirmation(
    customerEmail: string,
    bookingData: {
      customer: { firstName: string; lastName: string };
      service: { name: string; duration: number };
      business: { name: string; address?: string; phone?: string };
      appointmentDate: Date | string;
      totalAmount: number;
    },
  ): Promise<void> {
    const { customer, service, business, appointmentDate, totalAmount } = bookingData;
    const appointmentDateFormatted = new Date(appointmentDate).toLocaleString();
    
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #f97316, #ea580c); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 28px;">Booking Confirmed! 🎉</h1>
          <p style="color: white; margin: 10px 0 0 0; font-size: 16px;">Your appointment has been accepted</p>
        </div>
        
        <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px;">
          <p style="color: #1f2937; font-size: 16px; margin: 0 0 20px 0;">
            Hello ${customer.firstName},
          </p>
          
          <p style="color: #6b7280; line-height: 1.6; margin-bottom: 25px;">
            Great news! Your booking request has been <strong style="color: #22c55e;">confirmed</strong> by ${business.name}.
          </p>
          
          <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 25px 0;">
            <h3 style="color: #1f2937; margin: 0 0 15px 0; font-size: 18px;">Booking Details</h3>
            <div style="color: #374151; line-height: 1.8;">
              <p style="margin: 8px 0;"><strong>Service:</strong> ${service.name}</p>
              <p style="margin: 8px 0;"><strong>Business:</strong> ${business.name}</p>
              <p style="margin: 8px 0;"><strong>Date & Time:</strong> ${appointmentDateFormatted}</p>
              <p style="margin: 8px 0;"><strong>Duration:</strong> ${service.duration} minutes</p>
              <p style="margin: 8px 0;"><strong>Total Amount:</strong> $${totalAmount.toFixed(2)}</p>
              ${business.address ? `<p style="margin: 8px 0;"><strong>Address:</strong> ${business.address}</p>` : ''}
              ${business.phone ? `<p style="margin: 8px 0;"><strong>Phone:</strong> ${business.phone}</p>` : ''}
            </div>
          </div>
          
          <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; border-radius: 4px;">
            <p style="color: #92400e; margin: 0; font-size: 14px; font-weight: bold;">
              ⏰ Please arrive 5 minutes before your appointment time.
            </p>
          </div>
          
          <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
            If you need to cancel or reschedule, please contact the business directly or use the app.
          </p>
          
          <p style="color: #6b7280; font-size: 14px; margin-top: 20px;">
            Thank you for using BUKKi!<br>
            The BUKKi Team
          </p>
        </div>
      </div>
    `;

    await this.sendEmail(customerEmail, 'Booking Confirmed - BUKKi', html);
  }

  async sendBookingReminder(
    email: string,
    bookingData: {
      customer: { firstName: string; lastName: string };
      service: { name: string; duration: number };
      business: { name: string; address?: string; phone?: string };
      appointmentDate: Date | string;
      reminderHours: number;
    },
  ): Promise<void> {
    const { customer, service, business, appointmentDate, reminderHours } = bookingData;
    const appointmentDateFormatted = new Date(appointmentDate).toLocaleString();
    const reminderText = reminderHours === 24 ? '24 hours' : reminderHours === 2 ? '2 hours' : `${reminderHours} hours`;
    
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #f97316, #ea580c); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 28px;">⏰ Booking Reminder</h1>
          <p style="color: white; margin: 10px 0 0 0; font-size: 16px;">Your appointment is in ${reminderText}</p>
        </div>
        
        <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px;">
          <p style="color: #1f2937; font-size: 16px; margin: 0 0 20px 0;">
            Hello ${customer.firstName},
          </p>
          
          <p style="color: #6b7280; line-height: 1.6; margin-bottom: 25px;">
            This is a friendly reminder that you have an upcoming appointment with <strong>${business.name}</strong>.
          </p>
          
          <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 25px 0;">
            <h3 style="color: #1f2937; margin: 0 0 15px 0; font-size: 18px;">Appointment Details</h3>
            <div style="color: #374151; line-height: 1.8;">
              <p style="margin: 8px 0;"><strong>Service:</strong> ${service.name}</p>
              <p style="margin: 8px 0;"><strong>Date & Time:</strong> ${appointmentDateFormatted}</p>
              <p style="margin: 8px 0;"><strong>Duration:</strong> ${service.duration} minutes</p>
              ${business.address ? `<p style="margin: 8px 0;"><strong>Address:</strong> ${business.address}</p>` : ''}
              ${business.phone ? `<p style="margin: 8px 0;"><strong>Phone:</strong> ${business.phone}</p>` : ''}
            </div>
          </div>
          
          <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; border-radius: 4px;">
            <p style="color: #92400e; margin: 0; font-size: 14px; font-weight: bold;">
              💡 Please arrive 5 minutes early. If you need to cancel or reschedule, please do so as soon as possible.
            </p>
          </div>
          
          <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
            We look forward to seeing you!<br>
            The BUKKi Team
          </p>
        </div>
      </div>
    `;

    await this.sendEmail(email, `Booking Reminder - ${reminderText} before appointment`, html);
  }

  async sendBookingCancellation(
    email: string,
    bookingData: {
      customer: { firstName: string; lastName: string };
      service: { name: string };
      business: { name: string };
      appointmentDate: Date | string;
      cancellationReason?: string;
    },
  ): Promise<void> {
    const { customer, service, business, appointmentDate, cancellationReason } = bookingData;
    const appointmentDateFormatted = new Date(appointmentDate).toLocaleString();
    
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #ef4444, #dc2626); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 28px;">Booking Cancelled</h1>
        </div>
        
        <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px;">
          <p style="color: #1f2937; font-size: 16px; margin: 0 0 20px 0;">
            Hello ${customer.firstName},
          </p>
          
          <p style="color: #6b7280; line-height: 1.6; margin-bottom: 25px;">
            Your booking with <strong>${business.name}</strong> has been cancelled.
          </p>
          
          <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 25px 0;">
            <h3 style="color: #1f2937; margin: 0 0 15px 0; font-size: 18px;">Cancelled Booking Details</h3>
            <div style="color: #374151; line-height: 1.8;">
              <p style="margin: 8px 0;"><strong>Service:</strong> ${service.name}</p>
              <p style="margin: 8px 0;"><strong>Date & Time:</strong> ${appointmentDateFormatted}</p>
              ${cancellationReason ? `<p style="margin: 8px 0;"><strong>Reason:</strong> ${cancellationReason}</p>` : ''}
            </div>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${this.configService.get<string>('FRONTEND_URL')}/businesses/${business.name}" 
               style="background: #f97316; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
              Book Again
            </a>
          </div>
          
          <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
            If you have any questions, please contact ${business.name} directly.<br>
            The BUKKi Team
          </p>
        </div>
      </div>
    `;

    await this.sendEmail(email, 'Booking Cancelled - BUKKi', html);
  }

  async sendPromotionalOffer(
    email: string,
    firstName: string,
    businessName: string,
    subject: string,
    content: string,
    metadata?: { offerCode?: string; discount?: number; validUntil?: string },
  ): Promise<void> {
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #f97316, #ea580c); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 28px;">BUKKi</h1>
          <p style="color: white; margin: 10px 0 0 0; font-size: 16px;">Special Offer from ${businessName}</p>
        </div>

        <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px;">
          <h2 style="color: #1f2937; margin: 0 0 20px 0;">${subject}</h2>

          <p style="color: #6b7280; line-height: 1.6; margin-bottom: 25px;">
            Hello ${firstName},<br><br>
            ${businessName} has a special offer for you!
          </p>

          <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 25px 0;">
            <div style="color: #1f2937; line-height: 1.8; white-space: pre-wrap;">${content}</div>
          </div>

          ${metadata?.offerCode ? `
            <div style="background: #fef3c7; border: 2px dashed #f59e0b; padding: 15px; text-align: center; border-radius: 8px; margin: 20px 0;">
              <p style="color: #92400e; margin: 0; font-size: 14px; font-weight: bold;">Use Code:</p>
              <p style="color: #92400e; margin: 5px 0 0; font-size: 24px; font-weight: bold; letter-spacing: 2px;">${metadata.offerCode}</p>
            </div>
          ` : ''}

          ${metadata?.discount ? `
            <div style="background: #dcfce7; border-left: 4px solid #22c55e; padding: 15px; margin: 20px 0;">
              <p style="color: #166534; margin: 0; font-size: 18px; font-weight: bold;">
                ${metadata.discount}% OFF
              </p>
            </div>
          ` : ''}

          ${metadata?.validUntil ? `
            <p style="color: #6b7280; font-size: 14px; margin-top: 20px;">
              <strong>Valid until:</strong> ${new Date(metadata.validUntil).toLocaleDateString()}
            </p>
          ` : ''}

          <div style="text-align: center; margin: 30px 0;">
            <a href="${this.configService.get<string>('FRONTEND_URL')}/businesses"
               style="background: #f97316; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
              Book Now
            </a>
          </div>

          <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
            Best regards,<br>
            The ${businessName} Team
          </p>
        </div>
      </div>
    `;

    await this.sendEmail(email, subject, html);
  }

  async sendBusinessApprovalEmail(
    email: string,
    firstName: string,
    businessName: string,
  ): Promise<void> {
    const dashboardUrl = `${this.configService.get<string>('FRONTEND_URL')}/business-dashboard`;

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #22c55e, #16a34a); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 32px;">🎉 Congratulations!</h1>
          <p style="color: white; margin: 10px 0 0 0; font-size: 16px;">Your business has been approved</p>
        </div>

        <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px;">
          <h2 style="color: #1f2937; margin: 0 0 20px 0;">Welcome to BUKKi, ${firstName}!</h2>

          <p style="color: #6b7280; line-height: 1.6; margin-bottom: 25px;">
            Great news! Your business <strong style="color: #1f2937;">"${businessName}"</strong> has been reviewed and <strong style="color: #22c55e;">approved</strong> by our admin team.
          </p>

          <div style="background: #dcfce7; border-left: 4px solid #22c55e; padding: 20px; margin: 25px 0; border-radius: 4px;">
            <h3 style="color: #166534; margin: 0 0 10px 0; font-size: 18px;">✅ Your business is now live!</h3>
            <p style="color: #166534; margin: 0; line-height: 1.6;">
              Customers can now discover your business, view your services, and make bookings through the BUKKi platform.
            </p>
          </div>

          <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 25px 0;">
            <h3 style="color: #1f2937; margin: 0 0 15px 0; font-size: 18px;">Next Steps:</h3>
            <div style="color: #374151; line-height: 1.8;">
              <p style="margin: 8px 0;">📋 <strong>Manage your services</strong> - Add or update your service offerings</p>
              <p style="margin: 8px 0;">📅 <strong>Set your availability</strong> - Configure your working hours</p>
              <p style="margin: 8px 0;">📸 <strong>Upload photos</strong> - Showcase your business with images</p>
              <p style="margin: 8px 0;">💬 <strong>Respond to bookings</strong> - Accept or decline customer requests</p>
              <p style="margin: 8px 0;">📊 <strong>Track analytics</strong> - Monitor your business performance</p>
            </div>
          </div>

          <div style="text-align: center; margin: 30px 0;">
            <a href="${dashboardUrl}"
               style="background: #f97316; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block; font-size: 16px;">
              Go to Dashboard
            </a>
          </div>

          <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; border-radius: 4px;">
            <p style="color: #92400e; margin: 0; font-size: 14px;">
              <strong>💡 Tip:</strong> Complete your business profile and add high-quality images to attract more customers!
            </p>
          </div>

          <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
            Thank you for choosing BUKKi. We're excited to help grow your business!
          </p>

          <p style="color: #6b7280; font-size: 14px; margin-top: 20px;">
            Best regards,<br>
            The BUKKi Team
          </p>
        </div>
      </div>
    `;

    await this.sendEmail(email, '🎉 Your Business Has Been Approved - BUKKi', html);
  }

  async sendBusinessRejectionEmail(
    email: string,
    firstName: string,
    businessName: string,
    reason?: string,
  ): Promise<void> {
    const supportUrl = `${this.configService.get<string>('FRONTEND_URL')}/contact`;

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #ef4444, #dc2626); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 28px;">Business Application Update</h1>
          <p style="color: white; margin: 10px 0 0 0; font-size: 16px;">Regarding: ${businessName}</p>
        </div>

        <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px;">
          <h2 style="color: #1f2937; margin: 0 0 20px 0;">Hello ${firstName},</h2>

          <p style="color: #6b7280; line-height: 1.6; margin-bottom: 25px;">
            Thank you for your interest in listing your business <strong>"${businessName}"</strong> on BUKKi.
          </p>

          <p style="color: #6b7280; line-height: 1.6; margin-bottom: 25px;">
            After careful review, we regret to inform you that we are unable to approve your business application at this time.
          </p>

          ${reason ? `
            <div style="background: #fee2e2; border-left: 4px solid #ef4444; padding: 20px; margin: 25px 0; border-radius: 4px;">
              <h3 style="color: #991b1b; margin: 0 0 10px 0; font-size: 18px;">Reason for Rejection:</h3>
              <p style="color: #991b1b; margin: 0; line-height: 1.6;">
                ${reason}
              </p>
            </div>
          ` : ''}

          <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 25px 0;">
            <h3 style="color: #1f2937; margin: 0 0 15px 0; font-size: 18px;">What's Next?</h3>
            <div style="color: #374151; line-height: 1.8;">
              <p style="margin: 8px 0;">📝 <strong>Review the feedback</strong> - Address the issues mentioned above</p>
              <p style="margin: 8px 0;">🔄 <strong>Resubmit your application</strong> - You can create a new business listing after making improvements</p>
              <p style="margin: 8px 0;">💬 <strong>Contact support</strong> - Reach out if you have questions or need clarification</p>
            </div>
          </div>

          <div style="text-align: center; margin: 30px 0;">
            <a href="${supportUrl}"
               style="background: #f97316; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block; font-size: 16px;">
              Contact Support
            </a>
          </div>

          <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; border-radius: 4px;">
            <p style="color: #92400e; margin: 0; font-size: 14px;">
              <strong>💡 Note:</strong> This decision is based on our platform guidelines. We encourage you to address the feedback and reapply.
            </p>
          </div>

          <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
            We appreciate your understanding and look forward to potentially working with you in the future.
          </p>

          <p style="color: #6b7280; font-size: 14px; margin-top: 20px;">
            Best regards,<br>
            The BUKKi Team
          </p>
        </div>
      </div>
    `;

    await this.sendEmail(email, 'Business Application Update - BUKKi', html);
  }

  async sendBusinessSuspensionEmail(
    email: string,
    firstName: string,
    businessName: string,
    reason?: string,
  ): Promise<void> {
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #ef4444, #dc2626); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 28px;">⚠️ Business Suspended</h1>
          <p style="color: white; margin: 10px 0 0 0; font-size: 16px;">Action Required</p>
        </div>

        <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px;">
          <h2 style="color: #1f2937; margin: 0 0 20px 0;">Hello ${firstName},</h2>

          <p style="color: #6b7280; line-height: 1.6; margin-bottom: 25px;">
            Your business <strong>"${businessName}"</strong> has been <strong style="color: #ef4444;">suspended</strong> on the BUKKi platform.
          </p>

          ${reason ? `
            <div style="background: #fee2e2; border-left: 4px solid #ef4444; padding: 20px; margin: 25px 0; border-radius: 4px;">
              <h3 style="color: #991b1b; margin: 0 0 10px 0; font-size: 18px;">Reason for Suspension:</h3>
              <p style="color: #991b1b; margin: 0; line-height: 1.6;">
                ${reason}
              </p>
            </div>
          ` : ''}

          <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 25px 0;">
            <h3 style="color: #1f2937; margin: 0 0 15px 0; font-size: 18px;">What This Means:</h3>
            <div style="color: #374151; line-height: 1.8;">
              <p style="margin: 8px 0;">🔒 Your business is not visible to customers</p>
              <p style="margin: 8px 0;">📅 No new bookings can be made</p>
              <p style="margin: 8px 0;">⏸️ Your business profile is temporarily inactive</p>
            </div>
          </div>

          <div style="text-align: center; margin: 30px 0;">
            <a href="${this.configService.get<string>('FRONTEND_URL')}/business-settings"
               style="background: #f97316; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block; font-size: 16px;">
              Request Unsuspension
            </a>
          </div>

          <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; border-radius: 4px;">
            <p style="color: #92400e; margin: 0; font-size: 14px;">
              <strong>💡 Need Help?</strong> Contact our support team for assistance or to request unsuspension.
            </p>
          </div>

          <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
            Best regards,<br>
            The BUKKi Team
          </p>
        </div>
      </div>
    `;

    await this.sendEmail(email, '⚠️ Your Business Has Been Suspended - BUKKi', html);
  }

  async sendBusinessUnsuspensionEmail(
    email: string,
    firstName: string,
    businessName: string,
  ): Promise<void> {
    const dashboardUrl = `${this.configService.get<string>('FRONTEND_URL')}/business-dashboard`;

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #22c55e, #16a34a); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 32px;">🎉 Business Reactivated!</h1>
          <p style="color: white; margin: 10px 0 0 0; font-size: 16px;">Your business is now live again</p>
        </div>

        <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px;">
          <h2 style="color: #1f2937; margin: 0 0 20px 0;">Great news, ${firstName}!</h2>

          <p style="color: #6b7280; line-height: 1.6; margin-bottom: 25px;">
            Your business <strong style="color: #1f2937;">"${businessName}"</strong> has been <strong style="color: #22c55e;">unsuspended</strong> and is now active on the BUKKi platform.
          </p>

          <div style="background: #dcfce7; border-left: 4px solid #22c55e; padding: 20px; margin: 25px 0; border-radius: 4px;">
            <h3 style="color: #166534; margin: 0 0 10px 0; font-size: 18px;">✅ Your business is live!</h3>
            <p style="color: #166534; margin: 0; line-height: 1.6;">
              Customers can now discover your business, view services, and make bookings again.
            </p>
          </div>

          <div style="text-align: center; margin: 30px 0;">
            <a href="${dashboardUrl}"
               style="background: #f97316; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block; font-size: 16px;">
              Go to Dashboard
            </a>
          </div>

          <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
            Thank you for your patience and cooperation.
          </p>

          <p style="color: #6b7280; font-size: 14px; margin-top: 20px;">
            Best regards,<br>
            The BUKKi Team
          </p>
        </div>
      </div>
    `;

    await this.sendEmail(email, '🎉 Your Business Has Been Reactivated - BUKKi', html);
  }
}
