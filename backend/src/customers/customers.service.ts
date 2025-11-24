import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { CustomerProfile } from './entities/customer-profile.entity';
import { User } from '../users/entities/user.entity';
import { Business } from '../businesses/entities/business.entity';
import { Booking, BookingStatus } from '../bookings/entities/booking.entity';

@Injectable()
export class CustomersService {
  constructor(
    @InjectRepository(CustomerProfile)
    private customerProfileRepository: Repository<CustomerProfile>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Business)
    private businessRepository: Repository<Business>,
    @InjectRepository(Booking)
    private bookingRepository: Repository<Booking>,
  ) {}

  /**
   * Get or create customer profile for a business
   */
  async getOrCreateProfile(customerId: string, businessId: string): Promise<CustomerProfile> {
    let profile = await this.customerProfileRepository.findOne({
      where: {
        customer: { id: customerId },
        business: { id: businessId },
      } as any,
      relations: ['customer', 'business'],
    });

    if (!profile) {
      profile = this.customerProfileRepository.create({
        customer: { id: customerId } as any,
        business: { id: businessId } as any,
      });
      profile = await this.customerProfileRepository.save(profile);
    }

    // Update stats from bookings
    await this.updateCustomerStats(customerId, businessId);

    return this.customerProfileRepository.findOne({
      where: { id: profile.id },
      relations: ['customer', 'business'],
    });
  }

  /**
   * Get all customers for a business
   */
  async getBusinessCustomers(businessId: string): Promise<CustomerProfile[]> {
    return this.customerProfileRepository.find({
      where: {
        business: { id: businessId },
      } as any,
      relations: ['customer'],
      order: { lastBookingDate: 'DESC' },
    });
  }

  /**
   * Get customer details with booking history
   */
  async getCustomerDetails(customerId: string, businessId: string) {
    const profile = await this.getOrCreateProfile(customerId, businessId);

    const bookings = await this.bookingRepository.find({
      where: {
        customer: { id: customerId },
        business: { id: businessId },
      } as any,
      relations: ['service'],
      order: { appointmentDate: 'DESC' },
      take: 10,
    });

    return {
      profile,
      recentBookings: bookings,
      totalBookings: bookings.length,
    };
  }

  /**
   * Update customer preferences
   */
  async updatePreferences(
    customerId: string,
    businessId: string,
    preferences: any,
  ): Promise<CustomerProfile> {
    const profile = await this.getOrCreateProfile(customerId, businessId);
    profile.preferences = { ...profile.preferences, ...preferences };
    return this.customerProfileRepository.save(profile);
  }

  /**
   * Add tags to customer
   */
  async addTags(customerId: string, businessId: string, tags: string[]): Promise<CustomerProfile> {
    const profile = await this.getOrCreateProfile(customerId, businessId);
    const existingTags = profile.tags || [];
    profile.tags = [...new Set([...existingTags, ...tags])];
    return this.customerProfileRepository.save(profile);
  }

  /**
   * Update customer stats from bookings
   */
  private async updateCustomerStats(customerId: string, businessId: string): Promise<void> {
    const bookings = await this.bookingRepository.find({
      where: {
        customer: { id: customerId },
        business: { id: businessId },
        status: In(['confirmed', 'completed']),
      } as any,
      relations: ['service'],
    });

    const profile = await this.customerProfileRepository.findOne({
      where: {
        customer: { id: customerId },
        business: { id: businessId },
      } as any,
    });

    if (profile) {
      profile.totalBookings = bookings.length;
      profile.totalSpent = bookings.reduce((sum, b) => sum + (b.service?.price ? Number(b.service.price) * 100 : 0), 0);

      if (bookings.length > 0) {
        const sortedBookings = bookings.sort(
          (a, b) => new Date(a.appointmentDate).getTime() - new Date(b.appointmentDate).getTime(),
        );
        profile.firstBookingDate = sortedBookings[0].appointmentDate;
        profile.lastBookingDate = sortedBookings[sortedBookings.length - 1].appointmentDate;
      }

      await this.customerProfileRepository.save(profile);
    }
  }

  /**
   * Add loyalty points
   */
  async addLoyaltyPoints(customerId: string, businessId: string, points: number): Promise<CustomerProfile> {
    const profile = await this.getOrCreateProfile(customerId, businessId);
    profile.loyaltyPoints = (profile.loyaltyPoints || 0) + points;
    return this.customerProfileRepository.save(profile);
  }
}

