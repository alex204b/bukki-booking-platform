import { Injectable, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Business, BusinessStatus } from '../businesses/entities/business.entity';
import { User, UserRole } from '../users/entities/user.entity';
import { Booking } from '../bookings/entities/booking.entity';
import { AnalyticsService } from '../analytics/analytics.service';

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(Business)
    private businessRepository: Repository<Business>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Booking)
    private bookingRepository: Repository<Booking>,
    private analyticsService: AnalyticsService,
  ) {}

  /**
   * Verify a business
   */
  async verifyBusiness(businessId: string, notes?: string): Promise<Business> {
    const business = await this.businessRepository.findOne({ where: { id: businessId } });
    if (!business) {
      throw new Error('Business not found');
    }

    business.isVerified = true;
    business.verifiedAt = new Date();
    if (notes) {
      business.verificationNotes = notes;
    }

    return this.businessRepository.save(business);
  }

  /**
   * Unverify a business
   */
  async unverifyBusiness(businessId: string, notes?: string): Promise<Business> {
    const business = await this.businessRepository.findOne({ where: { id: businessId } });
    if (!business) {
      throw new Error('Business not found');
    }

    business.isVerified = false;
    if (notes) {
      business.verificationNotes = notes;
    }

    return this.businessRepository.save(business);
  }

  /**
   * Get all users with filtering
   */
  async getUsers(filters?: {
    role?: UserRole;
    isActive?: boolean;
    emailVerified?: boolean;
    search?: string;
  }): Promise<User[]> {
    const qb = this.userRepository.createQueryBuilder('user');

    if (filters?.role) {
      qb.andWhere('user.role = :role', { role: filters.role });
    }

    if (filters?.isActive !== undefined) {
      qb.andWhere('user.isActive = :isActive', { isActive: filters.isActive });
    }

    if (filters?.emailVerified !== undefined) {
      qb.andWhere('user.emailVerified = :emailVerified', { emailVerified: filters.emailVerified });
    }

    if (filters?.search) {
      qb.andWhere(
        '(user.firstName ILIKE :search OR user.lastName ILIKE :search OR user.email ILIKE :search)',
        { search: `%${filters.search}%` },
      );
    }

    return qb.getMany();
  }

  /**
   * Update user role or status
   */
  async updateUser(userId: string, updates: { role?: UserRole; isActive?: boolean }): Promise<User> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new Error('User not found');
    }

    if (updates.role) {
      user.role = updates.role;
    }

    if (updates.isActive !== undefined) {
      user.isActive = updates.isActive;
    }

    return this.userRepository.save(user);
  }

  /**
   * Get platform analytics
   */
  async getPlatformAnalytics(period: 'day' | 'week' | 'month' | 'year' = 'month') {
    return this.analyticsService.getPlatformAnalytics(period);
  }

  /**
   * Get pending business approvals
   */
  async getPendingBusinesses(): Promise<Business[]> {
    return this.businessRepository.find({
      where: { status: BusinessStatus.PENDING },
      relations: ['owner'],
      order: { createdAt: 'ASC' },
    });
  }
}

