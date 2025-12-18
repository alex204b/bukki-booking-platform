import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import * as QRCode from 'qrcode';
import { Booking, BookingStatus } from './entities/booking.entity';
import { Service } from '../services/entities/service.entity';
import { Business } from '../businesses/entities/business.entity';
import { User } from '../users/entities/user.entity';
import { BusinessMember, BusinessMemberStatus } from '../businesses/entities/business-member.entity';
import { ReviewsService } from '../reviews/reviews.service';
import { EmailService } from '../common/services/email.service';
import { TrustScoreService } from '../users/trust-score.service';
import { PushNotificationService } from '../notifications/push-notification.service';
import { MessagesService } from '../messages/messages.service';
import { PaginationDto, PaginatedResult, createPaginatedResponse } from '../common/dto/pagination.dto';

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
    private trustScoreService: TrustScoreService,
    private pushNotificationService: PushNotificationService,
    private messagesService: MessagesService,
  ) {}

  async create(createBookingDto: any, customerId: string): Promise<Booking | Booking[]> {
    const { 
      serviceId, 
      appointmentDate, 
      customFieldValues, 
      notes,
      isRecurring,
      recurrencePattern,
      recurrenceEndDate,
    } = createBookingDto;

    // Require verified email before booking
    const customer = await this.userRepository.findOne({ where: { id: customerId } });
    if (!customer || customer.emailVerified !== true) {
      throw new BadRequestException('Please verify your email before making a booking.');
    }

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

    // Check trust score before allowing booking
    const trustCheck = this.trustScoreService.canMakeBooking(customer.trustScore);
    if (!trustCheck.allowed) {
      throw new BadRequestException(trustCheck.reason || 'Your trust score is too low to make bookings.');
    }

    // Check daily booking limit for this user and business (max 2 per day)
    const business = service.business;
    const appointmentStart = new Date(appointmentDate);
    
    // Get the start and end of the selected date (not today)
    const selectedDateStart = new Date(appointmentStart);
    selectedDateStart.setHours(0, 0, 0, 0);
    const selectedDateEnd = new Date(appointmentStart);
    selectedDateEnd.setHours(23, 59, 59, 999);

    const userBookingsOnSelectedDate = await this.bookingRepository
      .createQueryBuilder('booking')
      .leftJoin('booking.customer', 'customer')
      .leftJoin('booking.business', 'business')
      .where('customer.id = :customerId', { customerId })
      .andWhere('business.id = :businessId', { businessId: business.id })
      .andWhere('booking.appointmentDate >= :selectedDateStart', { selectedDateStart })
      .andWhere('booking.appointmentDate <= :selectedDateEnd', { selectedDateEnd })
      .andWhere('booking.status IN (:...statuses)', { statuses: ['pending', 'confirmed'] })
      .getCount();

    if (userBookingsOnSelectedDate >= 2) {
      throw new BadRequestException(`You have reached the maximum number of bookings (2) for this business on ${appointmentStart.toLocaleDateString()}.`);
    }

    // Check if the time slot is available - check for overlapping bookings
    const appointmentEnd = new Date(appointmentStart.getTime() + service.duration * 60000);
    // Check for exact time slot conflicts - simpler approach
    const existingBooking = await this.bookingRepository.findOne({
      where: {
        service: { id: serviceId },
        appointmentDate: appointmentStart,
        status: In(['pending', 'confirmed'])
      },
      relations: ['service', 'customer', 'business']
    });

    if (existingBooking) {
      throw new BadRequestException('This exact time slot is already booked');
    }

    // Also check for overlapping bookings
    const overlappingBookings = await this.bookingRepository
      .createQueryBuilder('booking')
      .leftJoinAndSelect('booking.service', 'service')
      .leftJoinAndSelect('booking.customer', 'customer')
      .leftJoinAndSelect('booking.business', 'business')
      .where('service.id = :serviceId', { serviceId })
      .andWhere('booking.status IN (:...statuses)', { statuses: ['pending', 'confirmed'] })
      .andWhere('booking.appointmentDate >= :startOfDay', { 
        startOfDay: new Date(appointmentStart.getFullYear(), appointmentStart.getMonth(), appointmentStart.getDate(), 0, 0, 0)
      })
      .andWhere('booking.appointmentDate < :endOfDay', { 
        endOfDay: new Date(appointmentStart.getFullYear(), appointmentStart.getMonth(), appointmentStart.getDate() + 1, 0, 0, 0)
      })
      .getMany();
    
    // Check for overlaps manually
    const hasOverlap = overlappingBookings.some(booking => {
      const bookingStart = new Date(booking.appointmentDate);
      const bookingEnd = new Date(bookingStart.getTime() + booking.service.duration * 60000);
      
      // Check for overlap
      return (appointmentStart < bookingEnd && appointmentEnd > bookingStart);
    });

    
    if (hasOverlap) {
      throw new BadRequestException('This time slot overlaps with an existing booking');
    }

    // Handle recurring bookings
    if (isRecurring && recurrencePattern && recurrenceEndDate) {
      return this.createRecurringBookings(
        customerId,
        serviceId,
        appointmentStart,
        appointmentEnd,
        recurrencePattern,
        new Date(recurrenceEndDate),
        customFieldValues,
        notes,
        business,
        service,
        customer,
      );
    }

    // Create single booking
    const booking = this.bookingRepository.create({
      appointmentDate: appointmentStart,
      appointmentEndDate: appointmentEnd,
      customFieldValues,
      notes,
      isRecurring: false,
      customer: { id: customerId },
      business: { id: service.business.id },
      service: { id: serviceId },
    });

    // Auto-accept if business configured
    if (business.autoAcceptBookings) {
      (booking as any).status = BookingStatus.CONFIRMED;
    }
    const savedBooking = await this.bookingRepository.save(booking);

    // Send push notification to business owner about new booking
    try {
      if (business.owner?.id) {
        await this.pushNotificationService.sendToUser(
          business.owner.id,
          {
            title: 'New Booking Request',
            body: `${customer.firstName} ${customer.lastName} requested ${service.name}`,
            data: {
              type: 'booking_created',
              bookingId: savedBooking.id,
              businessId: business.id,
            },
            clickAction: `/business-dashboard?booking=${savedBooking.id}`,
          },
          'bookingUpdates',
        );
      }
    } catch (error) {
      console.error('Failed to send push notification for new booking:', error);
      // Don't throw - notification failure shouldn't break booking creation
    }

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
      // For business owners, show bookings they made as customers AND bookings for their business
      // First, get bookings they made as customers
      const customerBookings = await this.bookingRepository.find({
        where: { customer: { id: userId } },
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
            duration: true,
          },
        },
      });
      
      // Then get bookings for their business
      const business = await this.businessRepository.findOne({
        where: { owner: { id: userId } },
      });
      
      let businessBookings = [];
      if (business) {
        // Use query builder to ensure business relation is properly loaded
        businessBookings = await this.bookingRepository
          .createQueryBuilder('booking')
          .leftJoinAndSelect('booking.customer', 'customer')
          .leftJoinAndSelect('booking.business', 'business')
          .leftJoinAndSelect('booking.service', 'service')
          .where('business.id = :businessId', { businessId: business.id })
          .orderBy('booking.appointmentDate', 'DESC')
          .getMany();
      }
      
      // Combine both types of bookings, removing duplicates
      const allBookings = [...customerBookings, ...businessBookings];
      // Remove duplicates by booking ID
      const uniqueBookings = allBookings.filter((booking, index, self) =>
        index === self.findIndex((b) => b.id === booking.id)
      );
      return uniqueBookings;
    } else if (userRole === 'employee') {
      // For employees, show bookings for businesses they are members of
      const employeeMemberships = await this.businessMemberRepository.find({
        where: { 
          user: { id: userId },
          status: BusinessMemberStatus.ACTIVE 
        } as any,
        relations: ['business'],
      });
      
      if (employeeMemberships.length === 0) {
        return [];
      }
      
      const businessIds = employeeMemberships.map(m => m.business.id);
      
      return this.bookingRepository.find({
        where: { business: { id: In(businessIds) } } as any,
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
            duration: true,
          },
        },
      });
    }
    
    // For super_admin, return all bookings
    if (userRole === 'super_admin') {
      return this.bookingRepository.find({
        relations: ['customer', 'business', 'service'],
        order: { appointmentDate: 'DESC' },
      });
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
          duration: true,
        },
      },
    });
  }

  async findAllPaginated(
    userId?: string,
    userRole?: string,
    paginationDto?: PaginationDto,
    businessId?: string,
    status?: BookingStatus,
  ): Promise<PaginatedResult<Booking>> {
    const { limit = 20, offset = 0, sortBy = 'appointmentDate', sortOrder = 'DESC' } = paginationDto || {};

    // Build base query
    const queryBuilder = this.bookingRepository
      .createQueryBuilder('booking')
      .leftJoinAndSelect('booking.customer', 'customer')
      .leftJoinAndSelect('booking.business', 'business')
      .leftJoinAndSelect('booking.service', 'service');

    // Apply role-based filtering
    if (userRole === 'customer') {
      queryBuilder.where('customer.id = :userId', { userId });
    } else if (userRole === 'business_owner') {
      // Get business IDs owned by user
      const ownedBusiness = await this.businessRepository.findOne({
        where: { owner: { id: userId } },
      });

      if (ownedBusiness) {
        queryBuilder.where(
          '(customer.id = :userId OR business.id = :businessId)',
          { userId, businessId: ownedBusiness.id }
        );
      } else {
        queryBuilder.where('customer.id = :userId', { userId });
      }
    } else if (userRole === 'employee') {
      // Get business IDs where user is an active member
      const employeeMemberships = await this.businessMemberRepository.find({
        where: {
          user: { id: userId },
          status: BusinessMemberStatus.ACTIVE
        } as any,
        relations: ['business'],
      });

      if (employeeMemberships.length > 0) {
        const businessIds = employeeMemberships.map(m => m.business.id);
        queryBuilder.where('business.id IN (:...businessIds)', { businessIds });
      } else {
        // No businesses, return empty result
        return createPaginatedResponse([], 0, limit, offset);
      }
    }
    // For super_admin, no additional filtering needed

    // Apply additional filters
    if (businessId) {
      queryBuilder.andWhere('business.id = :businessId', { businessId });
    }

    if (status) {
      queryBuilder.andWhere('booking.status = :status', { status });
    }

    // Apply sorting
    queryBuilder.orderBy(`booking.${sortBy}`, sortOrder);

    // Get total count
    const total = await queryBuilder.getCount();

    // Apply pagination
    queryBuilder.skip(offset).take(limit);

    // Execute query
    const bookings = await queryBuilder.getMany();

    return createPaginatedResponse(bookings, total, limit, offset);
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

  async reschedule(bookingId: string, newAppointmentDate: string, userId: string): Promise<Booking> {
    const booking = await this.bookingRepository.findOne({
      where: { id: bookingId },
      relations: ['customer', 'service', 'business'],
    });

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    // Check if user owns the booking
    if (booking.customer.id !== userId) {
      throw new ForbiddenException('You can only reschedule your own bookings');
    }

    // Check if booking can be rescheduled (not completed or cancelled)
    if (booking.status === BookingStatus.COMPLETED || booking.status === BookingStatus.CANCELLED) {
      throw new BadRequestException('Cannot reschedule a completed or cancelled booking');
    }

    const newDate = new Date(newAppointmentDate);
    const service = await this.serviceRepository.findOne({
      where: { id: booking.service.id },
    });

    if (!service) {
      throw new NotFoundException('Service not found');
    }

    // Calculate new end date
    const newEndDate = new Date(newDate.getTime() + service.duration * 60000);

    // Check for conflicts
    const conflictingBookings = await this.bookingRepository
      .createQueryBuilder('booking')
      .leftJoinAndSelect('booking.service', 'service')
      .leftJoinAndSelect('booking.business', 'business')
      .where('booking.business.id = :businessId', { businessId: booking.business.id })
      .andWhere('booking.id != :bookingId', { bookingId })
      .andWhere('booking.status != :cancelled', { cancelled: BookingStatus.CANCELLED })
      .andWhere(
        '(booking.appointmentDate < :newEndDate AND booking.appointmentEndDate > :newDate)',
        { newDate, newEndDate }
      )
      .getCount();

    if (conflictingBookings > 0) {
      throw new BadRequestException('The selected time slot is already booked');
    }

    // Update booking
    booking.appointmentDate = newDate;
    booking.appointmentEndDate = newEndDate;
    booking.status = BookingStatus.CONFIRMED; // Ensure it's confirmed after reschedule

    const savedBooking = await this.bookingRepository.save(booking);

    // Send push notification to customer about reschedule
    try {
      if (booking.customer?.id) {
        await this.pushNotificationService.sendToUser(
          booking.customer.id,
          {
            title: 'Booking Rescheduled',
            body: `Your booking at ${booking.business?.name} has been rescheduled`,
            data: {
              type: 'booking_rescheduled',
              bookingId: savedBooking.id,
            },
            clickAction: `/my-bookings?booking=${savedBooking.id}`,
          },
          'bookingUpdates',
        );
      }

      // Also notify business owner
      if (booking.business?.owner?.id) {
        await this.pushNotificationService.sendToUser(
          booking.business.owner.id,
          {
            title: 'Booking Rescheduled',
            body: `${booking.customer?.firstName} ${booking.customer?.lastName} rescheduled their booking`,
            data: {
              type: 'booking_rescheduled',
              bookingId: savedBooking.id,
            },
            clickAction: `/business-dashboard?booking=${savedBooking.id}`,
          },
          'bookingUpdates',
        );
      }
    } catch (error) {
      console.error('Failed to send reschedule push notification:', error);
    }

    return savedBooking;
  }

  async updateStatus(id: string, status: BookingStatus, userId: string, userRole: string, reason?: string): Promise<Booking> {
    const booking = await this.findOne(id);
    const previousStatus = booking.status;

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

    if (status === BookingStatus.NO_SHOW) {
      // Mark as no-show - will affect trust score
    }

    await this.bookingRepository.update(id, updateData);

    // Update trust score when booking status changes
    const customerId = booking.customer.id as string;
    await this.trustScoreService.updateTrustScore(customerId);

    // Send email and push notification when booking is accepted (status changes from pending to confirmed)
    if (previousStatus === BookingStatus.PENDING && status === BookingStatus.CONFIRMED) {
      try {
        const updatedBooking = await this.findOne(id);
        if (updatedBooking.customer?.email) {
          await this.emailService.sendBookingConfirmation(
            updatedBooking.customer.email,
            {
              customer: {
                firstName: updatedBooking.customer.firstName,
                lastName: updatedBooking.customer.lastName,
              },
              service: {
                name: updatedBooking.service?.name || 'Service',
                duration: updatedBooking.service?.duration || 0,
              },
              business: {
                name: updatedBooking.business?.name || 'Business',
                address: updatedBooking.business?.address || '',
                phone: updatedBooking.business?.phone || '',
              },
              appointmentDate: updatedBooking.appointmentDate,
              totalAmount: updatedBooking.service?.price ? Number(updatedBooking.service.price) : 0,
            }
          );
        }

        // Send push notification to customer
        if (updatedBooking.customer?.id) {
          await this.pushNotificationService.sendToUser(
            updatedBooking.customer.id,
            {
              title: 'Booking Confirmed! 🎉',
              body: `Your booking at ${updatedBooking.business?.name} has been confirmed`,
              data: {
                type: 'booking_confirmed',
                bookingId: updatedBooking.id,
              },
              clickAction: `/my-bookings?booking=${updatedBooking.id}`,
            },
            'bookingConfirmations',
          );
        }
      } catch (error) {
        console.error('Failed to send booking confirmation notification:', error);
        // Don't throw - notification failure shouldn't break the status update
      }
    }

    // Send push notification and email when booking is cancelled
    if (status === BookingStatus.CANCELLED && booking.customer?.id) {
      try {
        await this.pushNotificationService.sendToUser(
          booking.customer.id,
          {
            title: 'Booking Cancelled',
            body: reason 
              ? `Your booking has been cancelled: ${reason}`
              : 'Your booking has been cancelled',
            data: {
              type: 'booking_cancelled',
              bookingId: booking.id,
              reason: reason || '',
            },
            clickAction: `/my-bookings?booking=${booking.id}`,
          },
          'bookingCancellations',
        );

        // Send cancellation email
        if (booking.customer?.email) {
          await this.emailService.sendBookingCancellation(
            booking.customer.email,
            {
              customer: {
                firstName: booking.customer.firstName,
                lastName: booking.customer.lastName,
              },
              service: {
                name: booking.service?.name || 'Service',
              },
              business: {
                name: booking.business?.name || 'Business',
              },
              appointmentDate: booking.appointmentDate,
              cancellationReason: reason,
            },
          );
        }
      } catch (error) {
        console.error('Failed to send cancellation notification:', error);
      }
    }

    // Delete messages related to this booking when it's cancelled
    if (status === BookingStatus.CANCELLED) {
      try {
        await this.messagesService.deleteMessagesForBooking(id);
      } catch (error) {
        console.error('Failed to delete messages for cancelled booking:', error);
        // Don't throw - message deletion failure shouldn't break the cancellation
      }
    }

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

    // Update trust score when booking is completed
    const customerId = booking.customer.id as string;
    await this.trustScoreService.updateTrustScore(customerId);

    // Delete messages related to this booking after it's completed
    try {
      await this.messagesService.deleteMessagesForBooking(id);
    } catch (error) {
      console.error('Failed to delete messages for booking:', error);
      // Don't throw - message deletion failure shouldn't break the booking completion
    }

    return this.findOne(id);
  }

  async validateAndCheckInQR(qrDataString: string, userId: string, userRole: string): Promise<{ success: boolean; message: string; booking?: Booking }> {
    try {
      // Parse QR code data
      const qrData = JSON.parse(qrDataString);
      
      if (!qrData.bookingId || qrData.type !== 'booking_checkin') {
        throw new BadRequestException('Invalid QR code format');
      }

      // Find the booking
      const booking = await this.bookingRepository.findOne({
        where: { id: qrData.bookingId },
        relations: ['customer', 'business', 'service', 'business.owner'],
      });

      if (!booking) {
        throw new NotFoundException('Booking not found');
      }

      // Check permissions - user must be business owner or employee
      if (userRole === 'customer') {
        throw new ForbiddenException('Only business owners and employees can validate QR codes');
      }

      let hasPermission = false;
      if (userRole === 'business_owner') {
        const business = await this.businessRepository.findOne({
          where: { owner: { id: userId } },
        });
        hasPermission = business?.id === booking.business.id;
      } else if (userRole === 'employee') {
        const member = await this.businessMemberRepository.findOne({
          where: {
            business: { id: booking.business.id },
            user: { id: userId },
            status: BusinessMemberStatus.ACTIVE,
          } as any,
        });
        hasPermission = !!member;
      } else if (userRole === 'super_admin') {
        hasPermission = true;
      }

      if (!hasPermission) {
        throw new ForbiddenException('You do not have permission to validate bookings for this business');
      }

      // Check if booking is already checked in
      if (booking.checkedIn) {
        return {
          success: false,
          message: 'This booking has already been checked in',
          booking,
        };
      }

      // Check if booking status is valid for check-in
      if (booking.status !== BookingStatus.CONFIRMED && booking.status !== BookingStatus.PENDING) {
        return {
          success: false,
          message: `Cannot check in booking with status: ${booking.status}`,
          booking,
        };
      }

      // Check if appointment date is today or in the past
      const appointmentDate = new Date(booking.appointmentDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const appointmentDay = new Date(appointmentDate);
      appointmentDay.setHours(0, 0, 0, 0);

      if (appointmentDay > today) {
        return {
          success: false,
          message: 'Cannot check in a booking that is scheduled for a future date',
          booking,
        };
      }

      // Perform check-in
      await this.bookingRepository.update(booking.id, {
        checkedIn: true,
        checkedInAt: new Date(),
        status: BookingStatus.COMPLETED,
      });

      // Update trust score
      const customerId = booking.customer.id as string;
      await this.trustScoreService.updateTrustScore(customerId);

      const updatedBooking = await this.findOne(booking.id);

      return {
        success: true,
        message: `Successfully checked in ${booking.customer.firstName} ${booking.customer.lastName} for ${booking.service.name}`,
        booking: updatedBooking,
      };
    } catch (error: any) {
      if (error instanceof BadRequestException || error instanceof NotFoundException || error instanceof ForbiddenException) {
        throw error;
      }
      throw new BadRequestException('Invalid QR code data');
    }
  }

  async getBookingsByDate(businessId: string, date: string): Promise<Booking[]> {
    const startDate = new Date(date);
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 1);

    return this.bookingRepository
      .createQueryBuilder('booking')
      .leftJoinAndSelect('booking.customer', 'customer')
      .leftJoinAndSelect('booking.service', 'service')
      .where('booking.businessId = :businessId', { businessId })
      .andWhere('booking.appointmentDate >= :startDate', { startDate })
      .andWhere('booking.appointmentDate < :endDate', { endDate })
      .orderBy('booking.appointmentDate', 'ASC')
      .select([
        'booking.id',
        'booking.appointmentDate',
        'booking.status',
        'customer.id',
        'customer.firstName',
        'customer.lastName',
        'customer.phone',
        'service.id',
        'service.name',
        'service.duration',
      ])
      .getMany();
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

    const bookings = await this.bookingRepository
      .createQueryBuilder('booking')
      .where('booking.businessId = :businessId', { businessId })
      .andWhere('booking.appointmentDate >= :startDate', { startDate })
      .getMany();

    const stats = {
      total: bookings.length,
      confirmed: bookings.filter(b => b.status === BookingStatus.CONFIRMED).length,
      completed: bookings.filter(b => b.status === BookingStatus.COMPLETED).length,
      cancelled: bookings.filter(b => b.status === BookingStatus.CANCELLED).length,
      noShow: bookings.filter(b => b.status === BookingStatus.NO_SHOW).length,
      totalRevenue: 0, // Payment functionality removed
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

  /**
   * Create recurring bookings based on pattern
   */
  private async createRecurringBookings(
    customerId: string,
    serviceId: string,
    firstAppointmentDate: Date,
    firstAppointmentEndDate: Date,
    pattern: 'weekly' | 'biweekly' | 'monthly',
    endDate: Date,
    customFieldValues: any,
    notes: string,
    business: Business,
    service: Service,
    customer: User,
  ): Promise<Booking[]> {
    const bookings: Booking[] = [];
    let currentDate = new Date(firstAppointmentDate);
    let currentEndDate = new Date(firstAppointmentEndDate);
    let sequence = 0;

    // Create first booking (parent)
    const parentBooking = this.bookingRepository.create({
      appointmentDate: currentDate,
      appointmentEndDate: currentEndDate,
      customFieldValues,
      notes,
      isRecurring: true,
      recurrencePattern: pattern,
      recurrenceEndDate: endDate,
      recurrenceSequence: sequence++,
      customer: { id: customerId },
      business: { id: business.id },
      service: { id: serviceId },
    });

    const savedParent = await this.bookingRepository.save(parentBooking);
    bookings.push(savedParent);

    // Calculate interval based on pattern
    let daysToAdd = 0;
    switch (pattern) {
      case 'weekly':
        daysToAdd = 7;
        break;
      case 'biweekly':
        daysToAdd = 14;
        break;
      case 'monthly':
        daysToAdd = 30; // Approximate, can be improved
        break;
    }

    // Create recurring bookings until end date
    while (true) {
      currentDate = new Date(currentDate.getTime() + daysToAdd * 24 * 60 * 60 * 1000);
      currentEndDate = new Date(currentEndDate.getTime() + daysToAdd * 24 * 60 * 60 * 1000);

      if (currentDate > endDate) {
        break;
      }

      // Check for conflicts before creating
      const hasConflict = await this.bookingRepository.findOne({
        where: {
          service: { id: serviceId },
          appointmentDate: currentDate,
          status: In(['pending', 'confirmed']),
        },
      });

      if (hasConflict) {
        // Skip conflicting dates
        continue;
      }

      const recurringBooking = this.bookingRepository.create({
        appointmentDate: currentDate,
        appointmentEndDate: currentEndDate,
        customFieldValues,
        notes,
        isRecurring: true,
        recurrencePattern: pattern,
        recurrenceEndDate: endDate,
        parentBookingId: savedParent.id,
        recurrenceSequence: sequence++,
        customer: { id: customerId },
        business: { id: business.id },
        service: { id: serviceId },
      });

      const saved = await this.bookingRepository.save(recurringBooking);
      bookings.push(saved);
    }

    // Send notification for recurring bookings
    try {
      if (business.owner?.id) {
        await this.pushNotificationService.sendToUser(
          business.owner.id,
          {
            title: 'New Recurring Booking',
            body: `${customer.firstName} ${customer.lastName} created ${bookings.length} recurring bookings for ${service.name}`,
            data: {
              type: 'booking_created',
              bookingId: savedParent.id,
              businessId: business.id,
            },
            clickAction: `/business-dashboard?booking=${savedParent.id}`,
          },
          'bookingUpdates',
        );
      }
    } catch (error) {
      console.error('Failed to send push notification for recurring booking:', error);
    }

    return bookings;
  }
}
