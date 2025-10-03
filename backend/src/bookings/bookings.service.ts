import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as QRCode from 'qrcode';
import { Booking, BookingStatus, PaymentStatus } from './entities/booking.entity';
import { Service } from '../services/entities/service.entity';
import { Business } from '../businesses/entities/business.entity';
import { User } from '../users/entities/user.entity';
import { BusinessMember, BusinessMemberStatus } from '../businesses/entities/business-member.entity';
import { ReviewsService } from '../reviews/reviews.service';
import { EmailService } from '../common/services/email.service';

@Injectable()
export class BookingsService {
  constructor(
    @InjectRepository(Booking)
    private bookingRepository: Repository<Booking>,
    @InjectRepository(Service)
    private serviceRepository: Repository<Service>,
    @InjectRepository(Business)
    private businessRepository: Repository<Business>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(BusinessMember)
    private businessMemberRepository: Repository<BusinessMember>,
    private reviewsService: ReviewsService,
    private emailService: EmailService,
  ) {}

  async create(createBookingDto: any, customerId: string): Promise<Booking> {
    const { serviceId, appointmentDate, customFieldValues, notes } = createBookingDto;

    // Get service and business details
    const service = await this.serviceRepository.findOne({
      where: { id: serviceId },
      relations: ['business'],
    });

    if (!service) {
      throw new NotFoundException('Service not found');
    }

    if (!service.isActive) {
      throw new BadRequestException('Service is not available');
    }

    // Calculate appointment end time
    const appointmentStart = new Date(appointmentDate);
    const appointmentEnd = new Date(appointmentStart.getTime() + service.duration * 60000);

    // Check daily booking limit for this user and business
    const business = service.business;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const userBookingsToday = await this.bookingRepository.count({
      where: {
        customer: { id: customerId },
        business: { id: business.id },
        appointmentDate: {
          $gte: today,
          $lt: tomorrow,
        } as any,
        status: BookingStatus.CONFIRMED,
      },
    });

    if (userBookingsToday >= business.maxBookingsPerUserPerDay) {
      throw new BadRequestException(
        `You have reached the maximum number of bookings (${business.maxBookingsPerUserPerDay}) for this business today.`
      );
    }

    // Check if the time slot is available
    const existingBooking = await this.bookingRepository.findOne({
      where: {
        service: { id: serviceId },
        appointmentDate: appointmentStart,
        status: BookingStatus.CONFIRMED,
      },
    });

    if (existingBooking) {
      throw new BadRequestException('This time slot is already booked');
    }

    // Create booking
    const booking = this.bookingRepository.create({
      appointmentDate: appointmentStart,
      appointmentEndDate: appointmentEnd,
      totalAmount: service.price,
      customFieldValues,
      notes,
      customer: { id: customerId },
      business: { id: service.business.id },
      service: { id: serviceId },
    });

    // Auto-accept if business configured
    if (business.autoAcceptBookings) {
      (booking as any).status = BookingStatus.CONFIRMED;
    }
    const savedBooking = await this.bookingRepository.save(booking);

    // Notify business owner and active members via email
    try {
      const b = await this.businessRepository.findOne({ where: { id: service.business.id }, relations: ['owner'] });
      const recipients: string[] = [];
      if (b?.owner?.email) recipients.push(b.owner.email);
      // Include ACTIVE staff emails
      const activeMembers = await this.businessMemberRepository.find({
        where: { business: { id: service.business.id }, status: BusinessMemberStatus.ACTIVE } as any,
        relations: ['user'],
      });
      for (const m of activeMembers) {
        if (m.user?.email) recipients.push(m.user.email);
      }
      await this.emailService.sendNewBookingNotification(recipients, {
        businessName: b?.name || 'Your Business',
        serviceName: service.name,
        appointmentDate: appointmentStart.toLocaleString(),
      });
    } catch {}

    // Generate QR code for the booking
    const qrCodeData = await this.generateBookingQRCode(savedBooking.id);
    await this.bookingRepository.update(savedBooking.id, { qrCode: qrCodeData });

    return this.findOne(savedBooking.id);
  }

  async findAll(userId?: string, userRole?: string): Promise<Booking[]> {
    const where: any = {};
    
    if (userRole === 'customer') {
      where.customer = { id: userId };
    } else if (userRole === 'business_owner') {
      // Get user's business
      const business = await this.businessRepository.findOne({
        where: { owner: { id: userId } },
      });
      if (business) {
        where.business = { id: business.id };
      }
    }

    return this.bookingRepository.find({
      where,
      relations: ['customer', 'business', 'service'],
      order: { appointmentDate: 'DESC' },
      select: {
        customer: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
        },
        business: {
          id: true,
          name: true,
          category: true,
        },
        service: {
          id: true,
          name: true,
          price: true,
          duration: true,
        },
      },
    });
  }

  async findOne(id: string): Promise<Booking> {
    const booking = await this.bookingRepository.findOne({
      where: { id },
      relations: ['customer', 'business', 'service'],
      select: {
        customer: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
        },
        business: {
          id: true,
          name: true,
          category: true,
          address: true,
          phone: true,
        },
        service: {
          id: true,
          name: true,
          price: true,
          duration: true,
          description: true,
        },
      },
    });

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    return booking;
  }

  async updateStatus(id: string, status: BookingStatus, userId: string, userRole: string, reason?: string): Promise<Booking> {
    const booking = await this.findOne(id);

    // Check permissions
    if (userRole === 'customer' && booking.customer.id !== userId) {
      throw new ForbiddenException('You can only update your own bookings');
    }

    if (userRole === 'business_owner') {
      const business = await this.businessRepository.findOne({ where: { owner: { id: userId } } });
      if (!business || booking.business.id !== business.id) {
        const member = await this.businessMemberRepository.findOne({ where: { business: { id: booking.business.id }, user: { id: userId }, status: BusinessMemberStatus.ACTIVE } as any });
        if (!member) {
          throw new ForbiddenException('You can only update bookings for your business');
        }
      }
    }

    // Update booking
    const updateData: any = { status };
    
    if (status === BookingStatus.CANCELLED) {
      updateData.cancelledAt = new Date();
      updateData.cancellationReason = reason;
    }

    await this.bookingRepository.update(id, updateData);

    return this.findOne(id);
  }

  async checkIn(id: string, businessId: string): Promise<Booking> {
    const booking = await this.findOne(id);

    if (booking.business.id !== businessId) {
      throw new ForbiddenException('Invalid business for this booking');
    }

    if (booking.status !== BookingStatus.CONFIRMED) {
      throw new BadRequestException('Only confirmed bookings can be checked in');
    }

    await this.bookingRepository.update(id, {
      checkedIn: true,
      checkedInAt: new Date(),
      status: BookingStatus.COMPLETED,
    });

    // Update user trust score for successful check-in
    await this.reviewsService.updateTrustScore(booking.customer.id as any, 10);

    return this.findOne(id);
  }

  async getBookingsByDate(businessId: string, date: string): Promise<Booking[]> {
    const startDate = new Date(date);
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 1);

    return this.bookingRepository.find({
      where: {
        business: { id: businessId },
        appointmentDate: {
          $gte: startDate,
          $lt: endDate,
        } as any,
      },
      relations: ['customer', 'service'],
      order: { appointmentDate: 'ASC' },
      select: {
        customer: {
          id: true,
          firstName: true,
          lastName: true,
          phone: true,
        },
        service: {
          id: true,
          name: true,
          duration: true,
        },
      },
    });
  }

  async getBookingStats(businessId: string, period: string = 'month'): Promise<any> {
    const now = new Date();
    let startDate: Date;

    switch (period) {
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
        appointmentDate: {
          $gte: startDate,
        } as any,
      },
    });

    const stats = {
      total: bookings.length,
      confirmed: bookings.filter(b => b.status === BookingStatus.CONFIRMED).length,
      completed: bookings.filter(b => b.status === BookingStatus.COMPLETED).length,
      cancelled: bookings.filter(b => b.status === BookingStatus.CANCELLED).length,
      noShow: bookings.filter(b => b.status === BookingStatus.NO_SHOW).length,
      totalRevenue: bookings
        .filter(b => b.status === BookingStatus.COMPLETED)
        .reduce((sum, b) => sum + parseFloat(b.totalAmount.toString()), 0),
    };

    return stats;
  }

  private async generateBookingQRCode(bookingId: string): Promise<string> {
    const qrData = {
      bookingId,
      type: 'booking_checkin',
      timestamp: new Date().toISOString(),
    };

    return QRCode.toDataURL(JSON.stringify(qrData));
  }
}
