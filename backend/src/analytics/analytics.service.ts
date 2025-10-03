import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { Booking } from '../bookings/entities/booking.entity';
import { Business, BusinessStatus } from '../businesses/entities/business.entity';
import { User } from '../users/entities/user.entity';

@Injectable()
export class AnalyticsService {
  constructor(
    @InjectRepository(Booking)
    private bookingRepository: Repository<Booking>,
    @InjectRepository(Business)
    private businessRepository: Repository<Business>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  async getBusinessAnalytics(businessId: string, startDate: Date, endDate: Date) {
    const bookings = await this.bookingRepository.find({
      where: {
        business: { id: businessId },
        appointmentDate: Between(startDate, endDate),
      },
      relations: ['service', 'customer'],
    });

    const totalBookings = bookings.length;
    const completedBookings = bookings.filter(b => b.status === 'completed').length;
    const cancelledBookings = bookings.filter(b => b.status === 'cancelled').length;
    const totalRevenue = bookings
      .filter(b => b.paymentStatus === 'paid')
      .reduce((sum, b) => sum + Number(b.totalAmount), 0);

    const averageRating = await this.businessRepository
      .createQueryBuilder('business')
      .select('AVG(business.rating)', 'avgRating')
      .where('business.id = :id', { id: businessId })
      .getRawOne();

    return {
      totalBookings,
      completedBookings,
      cancelledBookings,
      totalRevenue,
      averageRating: averageRating?.avgRating || 0,
      completionRate: totalBookings > 0 ? (completedBookings / totalBookings) * 100 : 0,
      cancellationRate: totalBookings > 0 ? (cancelledBookings / totalBookings) * 100 : 0,
    };
  }

  async getPlatformAnalytics(startDate: Date, endDate: Date) {
    const totalUsers = await this.userRepository.count();
    const totalBusinesses = await this.businessRepository.count();
    const totalBookings = await this.bookingRepository.count({
      where: {
        appointmentDate: Between(startDate, endDate),
      },
    });

    const activeBusinesses = await this.businessRepository.count({
      where: { status: BusinessStatus.APPROVED, isActive: true },
    });

    const totalRevenue = await this.bookingRepository
      .createQueryBuilder('booking')
      .select('SUM(booking.totalAmount)', 'total')
      .where('booking.appointmentDate BETWEEN :startDate AND :endDate', { startDate, endDate })
      .andWhere('booking.paymentStatus = :status', { status: 'paid' })
      .getRawOne();

    return {
      totalUsers,
      totalBusinesses,
      activeBusinesses,
      totalBookings,
      totalRevenue: totalRevenue?.total || 0,
    };
  }

  async getBookingTrends(businessId: string, days: number = 30) {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const bookings = await this.bookingRepository
      .createQueryBuilder('booking')
      .select('DATE(booking.appointmentDate)', 'date')
      .addSelect('COUNT(*)', 'count')
      .where('booking.business.id = :businessId', { businessId })
      .andWhere('booking.appointmentDate BETWEEN :startDate AND :endDate', { startDate, endDate })
      .groupBy('DATE(booking.appointmentDate)')
      .orderBy('date', 'ASC')
      .getRawMany();

    return bookings;
  }

  async getTopServices(businessId: string, limit: number = 5) {
    const services = await this.bookingRepository
      .createQueryBuilder('booking')
      .leftJoin('booking.service', 'service')
      .select('service.name', 'serviceName')
      .addSelect('COUNT(*)', 'bookingCount')
      .addSelect('AVG(service.rating)', 'averageRating')
      .where('booking.business.id = :businessId', { businessId })
      .groupBy('service.id, service.name')
      .orderBy('bookingCount', 'DESC')
      .limit(limit)
      .getRawMany();

    return services;
  }
}
