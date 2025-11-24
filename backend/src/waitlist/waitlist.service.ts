import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { Waitlist, WaitlistStatus } from './entities/waitlist.entity';
import { User } from '../users/entities/user.entity';
import { Business } from '../businesses/entities/business.entity';
import { Service } from '../services/entities/service.entity';
import { Booking, BookingStatus } from '../bookings/entities/booking.entity';
import { EmailService } from '../common/services/email.service';
import { PushNotificationService } from '../notifications/push-notification.service';

@Injectable()
export class WaitlistService {
  constructor(
    @InjectRepository(Waitlist)
    private waitlistRepository: Repository<Waitlist>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Business)
    private businessRepository: Repository<Business>,
    @InjectRepository(Service)
    private serviceRepository: Repository<Service>,
    @InjectRepository(Booking)
    private bookingRepository: Repository<Booking>,
    private emailService: EmailService,
    private pushNotificationService: PushNotificationService,
  ) {}

  /**
   * Join waitlist for a service
   */
  async joinWaitlist(
    customerId: string,
    businessId: string,
    serviceId: string,
    preferredDate?: Date,
    notes?: string,
  ): Promise<Waitlist> {
    // Check if already on waitlist
    const existing = await this.waitlistRepository.findOne({
      where: {
        customer: { id: customerId },
        business: { id: businessId },
        service: { id: serviceId },
        status: WaitlistStatus.ACTIVE,
      } as any,
    });

    if (existing) {
      throw new BadRequestException('You are already on the waitlist for this service');
    }

    const waitlist = this.waitlistRepository.create({
      customer: { id: customerId } as any,
      business: { id: businessId } as any,
      service: { id: serviceId } as any,
      preferredDate,
      notes,
      status: WaitlistStatus.ACTIVE,
    });

    return this.waitlistRepository.save(waitlist);
  }

  /**
   * Leave waitlist
   */
  async leaveWaitlist(waitlistId: string, customerId: string): Promise<void> {
    const waitlist = await this.waitlistRepository.findOne({
      where: { id: waitlistId, customer: { id: customerId } } as any,
    });

    if (!waitlist) {
      throw new NotFoundException('Waitlist entry not found');
    }

    waitlist.status = WaitlistStatus.CANCELLED;
    await this.waitlistRepository.save(waitlist);
  }

  /**
   * Get waitlist for a business
   */
  async getBusinessWaitlist(businessId: string): Promise<Waitlist[]> {
    return this.waitlistRepository.find({
      where: {
        business: { id: businessId },
        status: WaitlistStatus.ACTIVE,
      } as any,
      relations: ['customer', 'service'],
      order: { createdAt: 'ASC' },
    });
  }

  /**
   * Get user's waitlist entries
   */
  async getUserWaitlist(userId: string): Promise<Waitlist[]> {
    return this.waitlistRepository.find({
      where: {
        customer: { id: userId },
        status: WaitlistStatus.ACTIVE,
      } as any,
      relations: ['business', 'service'],
      order: { createdAt: 'ASC' },
    });
  }

  /**
   * Notify waitlist customers when slot becomes available
   */
  async notifyWaitlistCustomers(
    businessId: string,
    serviceId: string,
    availableDate: Date,
  ): Promise<void> {
    const waitlistEntries = await this.waitlistRepository.find({
      where: {
        business: { id: businessId },
        service: { id: serviceId },
        status: WaitlistStatus.ACTIVE,
      } as any,
      relations: ['customer', 'business', 'service'],
      order: { createdAt: 'ASC' },
      take: 10, // Notify first 10 on waitlist
    });

    for (const entry of waitlistEntries) {
      try {
        // Send push notification
        await this.pushNotificationService.sendToUser(
          entry.customer.id as string,
          {
            title: 'Slot Available!',
            body: `A slot is now available for ${entry.service?.name || 'your requested service'} at ${entry.business?.name}`,
            data: {
              type: 'waitlist_notification',
              businessId: businessId,
              serviceId: serviceId,
              availableDate: availableDate.toISOString(),
            },
            clickAction: `/book/${serviceId}`,
          },
          'bookingUpdates',
        );

        // Send email
        await this.emailService.sendEmail(
          entry.customer.email,
          'Slot Available - BUKKi',
          `
            <h2>Good News!</h2>
            <p>A slot is now available for ${entry.service?.name || 'your requested service'} at ${entry.business?.name}.</p>
            <p>Available on: ${availableDate.toLocaleDateString()}</p>
            <p><a href="${process.env.FRONTEND_URL || 'http://localhost:3001'}/book/${serviceId}">Book Now</a></p>
          `,
        );

        entry.status = WaitlistStatus.NOTIFIED;
        entry.notifiedAt = new Date();
        await this.waitlistRepository.save(entry);
      } catch (error) {
        console.error(`Failed to notify waitlist customer ${entry.customer.id}:`, error);
      }
    }
  }

  /**
   * Mark waitlist entry as booked
   */
  async markAsBooked(waitlistId: string, bookingId: string): Promise<void> {
    const waitlist = await this.waitlistRepository.findOne({
      where: { id: waitlistId } as any,
    });

    if (!waitlist) {
      throw new NotFoundException('Waitlist entry not found');
    }

    waitlist.status = WaitlistStatus.BOOKED;
    waitlist.bookedAt = new Date();
    await this.waitlistRepository.save(waitlist);
  }
}

