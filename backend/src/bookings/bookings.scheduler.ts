import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan, MoreThan, Between, In } from 'typeorm';
import { Booking, BookingStatus } from './entities/booking.entity';
import { EmailService } from '../common/services/email.service';
import { PushNotificationService } from '../notifications/push-notification.service';

@Injectable()
export class BookingsScheduler {
  private readonly logger = new Logger(BookingsScheduler.name);

  constructor(
    @InjectRepository(Booking)
    private bookingRepository: Repository<Booking>,
    private emailService: EmailService,
    private pushNotificationService: PushNotificationService,
  ) {}

  /**
   * Send booking reminders 24 hours before appointment
   * Runs every hour
   */
  @Cron(CronExpression.EVERY_HOUR)
  async send24HourReminders() {
    this.logger.log('Checking for 24-hour booking reminders...');
    
    try {
      const now = new Date();
      const in24Hours = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      const reminderWindowStart = new Date(in24Hours.getTime() - 30 * 60 * 1000); // 30 min window
      const reminderWindowEnd = new Date(in24Hours.getTime() + 30 * 60 * 1000);

      const bookings = await this.bookingRepository.find({
        where: {
          status: In([BookingStatus.CONFIRMED, BookingStatus.PENDING]),
          appointmentDate: Between(reminderWindowStart, reminderWindowEnd),
          reminderSentAt: null, // Only send if not already sent
        },
        relations: ['customer', 'service', 'business'],
      });

      for (const booking of bookings) {
        try {
          // Send email reminder
          await this.emailService.sendBookingReminder(
            booking.customer.email,
            {
              customer: {
                firstName: booking.customer.firstName,
                lastName: booking.customer.lastName,
              },
              service: {
                name: booking.service.name,
                duration: booking.service.duration,
              },
              business: {
                name: booking.business.name,
                address: booking.business.address,
                phone: booking.business.phone,
              },
              appointmentDate: booking.appointmentDate,
              reminderHours: 24,
            },
          );

          // Send push notification
          await this.pushNotificationService.sendToUser(
            booking.customer.id,
            {
              title: 'Booking Reminder',
              body: `Your appointment with ${booking.business.name} is in 24 hours`,
              data: {
                type: 'booking_reminder',
                bookingId: booking.id,
                businessId: booking.business.id,
              },
              clickAction: `/my-bookings?booking=${booking.id}`,
            },
            'bookingReminders',
          );

          // Mark reminder as sent
          booking.reminderSentAt = new Date();
          await this.bookingRepository.save(booking);

          this.logger.log(`24-hour reminder sent for booking ${booking.id}`);
        } catch (error) {
          this.logger.error(`Failed to send 24-hour reminder for booking ${booking.id}:`, error);
        }
      }

      this.logger.log(`Sent ${bookings.length} 24-hour reminders`);
    } catch (error) {
      this.logger.error('Error during 24-hour reminder check:', error);
    }
  }

  /**
   * Send booking reminders 2 hours before appointment
   * Runs every 15 minutes
   */
  @Cron('*/15 * * * *') // Every 15 minutes
  async send2HourReminders() {
    this.logger.log('Checking for 2-hour booking reminders...');
    
    try {
      const now = new Date();
      const in2Hours = new Date(now.getTime() + 2 * 60 * 60 * 1000);
      const reminderWindowStart = new Date(in2Hours.getTime() - 15 * 60 * 1000); // 15 min window
      const reminderWindowEnd = new Date(in2Hours.getTime() + 15 * 60 * 1000);

      const bookings = await this.bookingRepository.find({
        where: {
          status: In([BookingStatus.CONFIRMED]),
          appointmentDate: Between(reminderWindowStart, reminderWindowEnd),
          reminderSentAt: MoreThan(new Date(now.getTime() - 3 * 60 * 60 * 1000)), // Sent 24h reminder but not 2h
        },
        relations: ['customer', 'service', 'business'],
      });

      for (const booking of bookings) {
        try {
          // Check if 2-hour reminder already sent (by checking if reminder was sent more than 1 hour ago)
          const hoursSinceReminder = booking.reminderSentAt
            ? (now.getTime() - booking.reminderSentAt.getTime()) / (1000 * 60 * 60)
            : 0;

          if (hoursSinceReminder < 22) {
            // 24h reminder was sent recently, skip 2h reminder
            continue;
          }

          // Send email reminder
          await this.emailService.sendBookingReminder(
            booking.customer.email,
            {
              customer: {
                firstName: booking.customer.firstName,
                lastName: booking.customer.lastName,
              },
              service: {
                name: booking.service.name,
                duration: booking.service.duration,
              },
              business: {
                name: booking.business.name,
                address: booking.business.address,
                phone: booking.business.phone,
              },
              appointmentDate: booking.appointmentDate,
              reminderHours: 2,
            },
          );

          // Send push notification
          await this.pushNotificationService.sendToUser(
            booking.customer.id,
            {
              title: 'Booking Reminder',
              body: `Your appointment with ${booking.business.name} is in 2 hours`,
              data: {
                type: 'booking_reminder',
                bookingId: booking.id,
                businessId: booking.business.id,
              },
              clickAction: `/my-bookings?booking=${booking.id}`,
            },
            'bookingReminders',
          );

          this.logger.log(`2-hour reminder sent for booking ${booking.id}`);
        } catch (error) {
          this.logger.error(`Failed to send 2-hour reminder for booking ${booking.id}:`, error);
        }
      }

      this.logger.log(`Sent ${bookings.length} 2-hour reminders`);
    } catch (error) {
      this.logger.error('Error during 2-hour reminder check:', error);
    }
  }
}

