import { Injectable } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class NotificationsService {
  private transporter: nodemailer.Transporter;

  constructor(private configService: ConfigService) {
    this.transporter = nodemailer.createTransport({
      host: this.configService.get('SMTP_HOST'),
      port: Number(this.configService.get('SMTP_PORT')) || 587,
      secure: false,
      auth: {
        user: this.configService.get('SMTP_USER'),
        pass: this.configService.get('SMTP_PASS'),
      },
    });
  }

  async sendEmail(to: string, subject: string, html: string): Promise<void> {
    try {
      await this.transporter.sendMail({
        from: this.configService.get('SMTP_USER'),
        to,
        subject,
        html,
      });
    } catch (error) {
      console.error('Failed to send email:', error);
      throw error;
    }
  }

  async sendBookingConfirmation(customerEmail: string, bookingData: any): Promise<void> {
    const subject = 'Booking Confirmation - BUKKi';
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #0ea5e9;">Booking Confirmed!</h2>
        <p>Hello ${bookingData.customer.firstName},</p>
        <p>Your booking has been confirmed. Here are the details:</p>
        
        <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3>Booking Details</h3>
          <p><strong>Service:</strong> ${bookingData.service.name}</p>
          <p><strong>Business:</strong> ${bookingData.business.name}</p>
          <p><strong>Date & Time:</strong> ${new Date(bookingData.appointmentDate).toLocaleString()}</p>
          <p><strong>Duration:</strong> ${bookingData.service.duration} minutes</p>
          <p><strong>Total Amount:</strong> $${bookingData.totalAmount}</p>
        </div>
        
        <p>Please arrive 5 minutes before your appointment time.</p>
        <p>If you need to cancel or reschedule, please contact the business directly.</p>
        
        <p>Thank you for using BUKKi!</p>
      </div>
    `;

    await this.sendEmail(customerEmail, subject, html);
  }

  async sendBookingReminder(customerEmail: string, bookingData: any): Promise<void> {
    const subject = 'Appointment Reminder - BUKKi';
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #0ea5e9;">Appointment Reminder</h2>
        <p>Hello ${bookingData.customer.firstName},</p>
        <p>This is a reminder about your upcoming appointment:</p>
        
        <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3>Appointment Details</h3>
          <p><strong>Service:</strong> ${bookingData.service.name}</p>
          <p><strong>Business:</strong> ${bookingData.business.name}</p>
          <p><strong>Date & Time:</strong> ${new Date(bookingData.appointmentDate).toLocaleString()}</p>
          <p><strong>Address:</strong> ${bookingData.business.address}</p>
        </div>
        
        <p>Please arrive 5 minutes before your appointment time.</p>
        <p>We look forward to seeing you!</p>
      </div>
    `;

    await this.sendEmail(customerEmail, subject, html);
  }

  async sendPasswordResetEmail(email: string, resetToken: string): Promise<void> {
    const resetUrl = `${this.configService.get('FRONTEND_URL')}/reset-password?token=${resetToken}`;
    const subject = 'Password Reset - BUKKi';
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #0ea5e9;">Password Reset Request</h2>
        <p>You requested a password reset for your BUKKi account.</p>
        <p>Click the button below to reset your password:</p>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetUrl}" style="background: #0ea5e9; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
            Reset Password
          </a>
        </div>
        
        <p>This link will expire in 1 hour.</p>
        <p>If you didn't request this reset, please ignore this email.</p>
      </div>
    `;

    await this.sendEmail(email, subject, html);
  }

  async sendBusinessApprovalEmail(businessEmail: string, businessName: string, approved: boolean): Promise<void> {
    const subject = approved ? 'Business Approved - BUKKi' : 'Business Application Update - BUKKi';
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: ${approved ? '#22c55e' : '#ef4444'};">
          ${approved ? 'Business Approved!' : 'Business Application Update'}
        </h2>
        <p>Hello,</p>
        <p>Your business application for <strong>${businessName}</strong> has been ${approved ? 'approved' : 'reviewed'}.</p>
        
        ${approved ? `
          <div style="background: #f0fdf4; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #22c55e;">
            <h3 style="color: #15803d;">Congratulations!</h3>
            <p>Your business is now live on BUKKi. You can start accepting bookings immediately.</p>
            <p>Log in to your dashboard to manage your services and bookings.</p>
          </div>
        ` : `
          <div style="background: #fef2f2; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ef4444;">
            <h3 style="color: #dc2626;">Application Status</h3>
            <p>Your business application requires additional review. Our team will contact you soon with more information.</p>
          </div>
        `}
        
        <p>Thank you for choosing BUKKi!</p>
      </div>
    `;

    await this.sendEmail(businessEmail, subject, html);
  }
}
