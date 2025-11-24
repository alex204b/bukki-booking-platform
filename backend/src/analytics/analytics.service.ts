import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, LessThan, MoreThan, In } from 'typeorm';
import { Booking, BookingStatus } from '../bookings/entities/booking.entity';
import { Business, BusinessStatus } from '../businesses/entities/business.entity';
import { Service } from '../services/entities/service.entity';
import { User } from '../users/entities/user.entity';
import { Review } from '../reviews/entities/review.entity';

@Injectable()
export class AnalyticsService {
  constructor(
    @InjectRepository(Booking)
    private bookingRepository: Repository<Booking>,
    @InjectRepository(Business)
    private businessRepository: Repository<Business>,
    @InjectRepository(Service)
    private serviceRepository: Repository<Service>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Review)
    private reviewRepository: Repository<Review>,
  ) {}

  /**
   * Get revenue analytics for a business
   */
  async getRevenueAnalytics(
    businessId: string,
    period: 'day' | 'week' | 'month' | 'year' = 'month',
  ) {
    const now = new Date();
    let startDate: Date;

    switch (period) {
      case 'day':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    }

    const bookings = await this.bookingRepository.find({
      where: {
        business: { id: businessId },
        appointmentDate: MoreThan(startDate),
        status: In([BookingStatus.CONFIRMED, BookingStatus.COMPLETED]),
      },
      relations: ['service'],
    });

    const totalRevenue = bookings.reduce((sum, booking) => {
      return sum + (booking.service?.price || 0);
    }, 0);

    const bookingsByStatus = {
      confirmed: bookings.filter((b) => b.status === BookingStatus.CONFIRMED).length,
      completed: bookings.filter((b) => b.status === BookingStatus.COMPLETED).length,
      cancelled: 0,
      pending: 0,
    };

    // Get cancelled bookings
    const cancelledBookings = await this.bookingRepository.count({
      where: {
        business: { id: businessId },
        appointmentDate: MoreThan(startDate),
        status: BookingStatus.CANCELLED,
      },
    });
    bookingsByStatus.cancelled = cancelledBookings;

    // Get pending bookings
    const pendingBookings = await this.bookingRepository.count({
      where: {
        business: { id: businessId },
        appointmentDate: MoreThan(startDate),
        status: BookingStatus.PENDING,
      },
    });
    bookingsByStatus.pending = pendingBookings;

    // Revenue trends (daily breakdown for the period)
    const revenueTrends: { date: string; revenue: number; bookings: number }[] = [];
    const daysDiff = Math.ceil((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

    for (let i = 0; i < daysDiff; i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);
      const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());
      const dayEnd = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1);

      const dayBookings = bookings.filter(
        (b) =>
          new Date(b.appointmentDate) >= dayStart &&
          new Date(b.appointmentDate) < dayEnd,
      );

      const dayRevenue = dayBookings.reduce((sum, b) => sum + (b.service?.price || 0), 0);

      revenueTrends.push({
        date: dayStart.toISOString().split('T')[0],
        revenue: dayRevenue,
        bookings: dayBookings.length,
      });
    }

    return {
      totalRevenue,
      totalBookings: bookings.length,
      bookingsByStatus,
      revenueTrends,
      period,
      startDate,
      endDate: now,
    };
  }

  /**
   * Get booking trends
   */
  async getBookingTrends(businessId: string, days: number = 30) {
    const now = new Date();
    const startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

    const bookings = await this.bookingRepository.find({
      where: {
        business: { id: businessId },
        appointmentDate: MoreThan(startDate),
      },
      relations: ['service', 'customer'],
    });

    // Peak hours analysis
    const hourCounts: { [hour: number]: number } = {};
    bookings.forEach((booking) => {
      const hour = new Date(booking.appointmentDate).getHours();
      hourCounts[hour] = (hourCounts[hour] || 0) + 1;
    });

    const peakHours = Object.entries(hourCounts)
      .map(([hour, count]) => ({ hour: parseInt(hour), count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Service popularity
    const serviceCounts: { [serviceId: string]: { name: string; count: number } } = {};
    bookings.forEach((booking) => {
      if (booking.service) {
        const serviceId = booking.service.id;
        if (!serviceCounts[serviceId]) {
          serviceCounts[serviceId] = {
            name: booking.service.name,
            count: 0,
          };
        }
        serviceCounts[serviceId].count++;
      }
    });

    const popularServices = Object.values(serviceCounts)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Customer retention
    const customerBookings: { [customerId: string]: number } = {};
    bookings.forEach((booking) => {
      if (booking.customer) {
        const customerId = booking.customer.id;
        customerBookings[customerId] = (customerBookings[customerId] || 0) + 1;
      }
    });

    const repeatCustomers = Object.values(customerBookings).filter((count) => count > 1).length;
    const newCustomers = Object.values(customerBookings).filter((count) => count === 1).length;

    return {
      totalBookings: bookings.length,
      peakHours,
      popularServices,
      customerRetention: {
        repeatCustomers,
        newCustomers,
        retentionRate: bookings.length > 0
          ? (repeatCustomers / Object.keys(customerBookings).length) * 100
          : 0,
      },
      period: { days, startDate, endDate: now },
    };
  }

  /**
   * Get platform-wide analytics (admin only)
   */
  async getPlatformAnalytics(period: 'day' | 'week' | 'month' | 'year' = 'month') {
    const now = new Date();
    let startDate: Date;

    switch (period) {
      case 'day':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    }

    const [
      totalUsers,
      totalBusinesses,
      totalBookings,
      totalReviews,
      activeBusinesses,
      pendingBusinesses,
    ] = await Promise.all([
      this.userRepository.count({ where: { createdAt: MoreThan(startDate) } }),
      this.businessRepository.count({ where: { createdAt: MoreThan(startDate) } }),
      this.bookingRepository.count({ where: { createdAt: MoreThan(startDate) } }),
      this.reviewRepository.count({ where: { createdAt: MoreThan(startDate) } }),
      this.businessRepository.count({
        where: { status: BusinessStatus.APPROVED, isActive: true },
      }),
      this.businessRepository.count({ where: { status: BusinessStatus.PENDING } }),
    ]);

    return {
      users: {
        total: totalUsers,
        new: totalUsers,
      },
      businesses: {
        total: totalBusinesses,
        active: activeBusinesses,
        pending: pendingBusinesses,
      },
      bookings: {
        total: totalBookings,
      },
      reviews: {
        total: totalReviews,
      },
      period: { type: period, startDate, endDate: now },
    };
  }
}
