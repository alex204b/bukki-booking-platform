import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, DataSource } from 'typeorm';
import { InjectDataSource } from '@nestjs/typeorm';
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
    @InjectDataSource()
    private dataSource: DataSource,
    private reviewsService: ReviewsService,
    private emailService: EmailService,
    private trustScoreService: TrustScoreService,
    private pushNotificationService: PushNotificationService,
    private messagesService: MessagesService,
  ) {}

  async getBusinessBookings(businessId: string): Promise<Booking[]> {
    console.log(`[BookingsService] getBusinessBookings for businessId: ${businessId}`);

    const bookings = await this.bookingRepository.find({
      where: {
        business: { id: businessId }
      },
      relations: ['customer', 'business', 'service'],
      order: { appointmentDate: 'DESC' },
    });

    console.log(`[BookingsService] Found ${bookings.length} bookings for business ${businessId}`);
    return bookings;
  }

  async debugGetRawBookings(businessId: string): Promise<any> {
    console.log(`[BookingsService] DEBUG: Getting raw bookings for businessId: ${businessId}`);

    // Get all bookings without filters
    const allBookings = await this.dataSource.query(
      `SELECT id, "businessId", "customerId", status, "appointmentDate", "createdAt" FROM bookings WHERE "deletedAt" IS NULL LIMIT 100`
    );

    console.log(`[BookingsService] DEBUG: Total bookings in database: ${allBookings.length}`);

    // Get bookings for this specific business
    const businessBookings = await this.dataSource.query(
      `SELECT b.id, b."businessId", b."customerId", b.status, b."appointmentDate",
              c."firstName" as "customerFirstName", c."lastName" as "customerLastName",
              s.name as "serviceName", bus.name as "businessName"
       FROM bookings b
       LEFT JOIN users c ON b."customerId" = c.id
       LEFT JOIN services s ON b."serviceId" = s.id
       LEFT JOIN businesses bus ON b."businessId" = bus.id
       WHERE b."businessId" = $1 AND b."deletedAt" IS NULL`,
      [businessId]
    );

    console.log(`[BookingsService] DEBUG: Bookings for business ${businessId}: ${businessBookings.length}`);

    // Get all distinct businessIds in bookings table
    const distinctBusinessIds = await this.dataSource.query(
      `SELECT DISTINCT "businessId", COUNT(*) as count FROM bookings WHERE "deletedAt" IS NULL GROUP BY "businessId"`
    );

    return {
      totalBookings: allBookings.length,
      businessBookingsCount: businessBookings.length,
      businessBookings: businessBookings,
      allBookings: allBookings.slice(0, 10), // First 10 for reference
      distinctBusinessIds: distinctBusinessIds,
      searchedBusinessId: businessId,
    };
  }

  async create(createBookingDto: any, customerId: string): Promise<Booking | Booking[]> {
    const {
      serviceId,
      appointmentDate,
      appointmentEndDate, // Optional: for custom duration (multi-slot selection)
      resourceId,
      partySize,
      customFieldValues,
      notes,
      isRecurring,
      recurrencePattern,
      recurrenceEndDate,
    } = createBookingDto;

    // Handle customer email (for business owners creating bookings)
    let actualCustomerId = customerId;
    
    // Check if customerId is actually an email address
    if (customerId.includes('@')) {
      const email = customerId;
      
      // Try to find existing customer by email
      let existingCustomer = await this.userRepository.findOne({ where: { email } });
      
      if (existingCustomer) {
        actualCustomerId = existingCustomer.id;
        console.log(`[BookingsService] Found existing customer: ${email} -> ${actualCustomerId}`);
      } else {
        // Customer doesn't exist - create a minimal customer account
        const newCustomer = this.userRepository.create({
          email,
          firstName: email.split('@')[0],
          lastName: 'Customer',
          role: 'customer' as any,
          emailVerified: false,
          password: null, // No password - they'll need to reset if they want to login
        });
        
        const savedCustomer = await this.userRepository.save(newCustomer);
        actualCustomerId = savedCustomer.id;
        console.log(`[BookingsService] Created new customer: ${email} -> ${actualCustomerId}`);
      }
    }

    // Get customer
    const customer = await this.userRepository.findOne({ where: { id: actualCustomerId } });
    if (!customer) {
      throw new BadRequestException('Customer not found.');
    }
    // Email verification is optional - allows phone bookings by business owners

    // Get service and business details
    const service = await this.serviceRepository.findOne({
      where: { id: serviceId },
      relations: ['business', 'business.owner', 'resources'],
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

    // Resource validation and selection
    let selectedResource: any = null;

    // Check if business requires resources
    if (business.requiresResources) {
      const resourceCount = await this.dataSource.query(
        'SELECT COUNT(*) as count FROM resources WHERE "businessId" = $1 AND "deletedAt" IS NULL',
        [business.id]
      );

      if (parseInt(resourceCount[0]?.count) === 0) {
        throw new BadRequestException(
          'This business has not completed resource setup. Please contact them directly.'
        );
      }
    }

    // Validate resource selection
    if (service.requireResourceSelection && !resourceId) {
      throw new BadRequestException(
        'Please select a staff member or resource for this service.'
      );
    }

    if (resourceId) {
      const resourceResult = await this.dataSource.query(
        `SELECT * FROM resources
         WHERE id = $1
         AND "businessId" = $2
         AND "isActive" = true
         AND "deletedAt" IS NULL`,
        [resourceId, business.id]
      );

      if (!resourceResult || resourceResult.length === 0) {
        throw new BadRequestException('Selected resource is not available.');
      }

      selectedResource = resourceResult[0];

      // Validate table capacity
      if (selectedResource.type === 'table' && partySize) {
        if (!selectedResource.capacity || selectedResource.capacity < partySize) {
          throw new BadRequestException(
            `Selected table can only accommodate ${selectedResource.capacity} people.`
          );
        }
      }
    }

    // Auto-assign table if needed
    const appointmentStart = new Date(appointmentDate);
    // Use provided end date or calculate from service duration
    const appointmentEnd = appointmentEndDate 
      ? new Date(appointmentEndDate)
      : new Date(appointmentStart.getTime() + service.duration * 60000);

    if (service.resourceType === 'table' && !resourceId && partySize) {
      selectedResource = await this.findAvailableTable(
        business.id,
        appointmentStart,
        appointmentEnd,
        partySize
      );

      if (!selectedResource) {
        throw new BadRequestException(
          `No tables available for ${partySize} people at this time.`
        );
      }
    }

    // Validate booking limitations based on service rules
    await this.validateBookingLimitations(service, customerId, business.id, appointmentStart);

    // Check resource conflicts
    if (selectedResource) {
      const resourceConflict = await this.bookingRepository
        .createQueryBuilder('booking')
        .where('booking.resourceId = :resourceId', { resourceId: selectedResource.id })
        .andWhere('booking.status IN (:...statuses)', {
          statuses: ['pending', 'confirmed']
        })
        .andWhere('booking.appointmentDate < :endTime', { endTime: appointmentEnd })
        .andWhere('booking.appointmentEndDate > :startTime', { startTime: appointmentStart })
        .getOne();

      if (resourceConflict) {
        throw new BadRequestException(
          'This resource is already booked for the selected time.'
        );
      }
    } else {
      // Fallback: Check for service time slot conflicts (for non-resource bookings)
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

    // Create single booking using raw SQL to ensure persistence
    console.log(`[BookingsService] Creating booking...`);
    console.log(`[BookingsService] Customer ID: ${customerId}, Business ID: ${service.business.id}, Service ID: ${serviceId}`);
    console.log(`[BookingsService] Appointment Date: ${appointmentStart}, End Date: ${appointmentEnd}`);
    
    const bookingStatus = business.autoAcceptBookings ? BookingStatus.CONFIRMED : BookingStatus.PENDING;
    const now = new Date();
    
    try {
      // CRITICAL: Use DataSource directly to ensure INSERT commits to database
      const result = await this.dataSource.query(
        `INSERT INTO bookings (
          "appointmentDate",
          "appointmentEndDate",
          status,
          "paymentStatus",
          "totalAmount",
          "customFieldValues",
          notes,
          "isRecurring",
          "resourceId",
          "partySize",
          "customerId",
          "businessId",
          "serviceId",
          "createdAt",
          "updatedAt"
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15
        )
        RETURNING id, "createdAt", "updatedAt"`,
        [
          appointmentStart,
          appointmentEnd,
          bookingStatus,
          'pending',
          service.price || 0,
          customFieldValues ? JSON.stringify(customFieldValues) : null,
          notes || null,
          false,
          selectedResource?.id || null,
          partySize || null,
          customerId,
          service.business.id,
          serviceId,
          now,
          now,
        ]
      );

      console.log(`[BookingsService] ✅ INSERT successful!`);
      console.log(`[BookingsService] Result:`, result);

      if (!result || result.length === 0) {
        console.error(`[BookingsService] ❌ INSERT returned no result`);
        throw new Error('Failed to create booking - no result returned');
      }

      const savedBookingId = result[0].id;
      console.log(`[BookingsService] Inserted booking ID: ${savedBookingId}`);
      console.log(`[BookingsService] Booking created with businessId: ${service.business.id} (type: ${typeof service.business.id})`);

      // Verify the booking was actually saved
      console.log(`[BookingsService] Verifying booking was saved...`);
      const verification = await this.dataSource.query(
        `SELECT id, "businessId", "businessId"::text as "businessIdText", "customerId", status FROM bookings WHERE id = $1`,
        [savedBookingId]
      );

      if (!verification || verification.length === 0) {
        console.error(`[BookingsService] ❌ CRITICAL: Booking not found after INSERT!`);
        throw new Error('Booking was not saved to database');
      }

      console.log(`[BookingsService] ✅ Verification successful! Booking found in database`);
      console.log(`[BookingsService] Verified booking businessId: ${verification[0].businessId} (text: ${verification[0].businessIdText})`);
      console.log(`[BookingsService] Expected businessId: ${service.business.id}`);
      console.log(`[BookingsService] BusinessId match: ${verification[0].businessId === service.business.id || verification[0].businessIdText === service.business.id}`);
      
      // Get the saved booking with relations
      const savedBooking = await this.findOne(savedBookingId);
      
      if (!savedBooking) {
        console.error(`[BookingsService] ❌ Booking not found via TypeORM after INSERT`);
        // Return the raw data if TypeORM can't find it
        return verification[0] as any;
      }

      console.log(`[BookingsService] ✅ Booking created successfully: ${savedBookingId}`);
      
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
                bookingId: savedBookingId,
                businessId: business.id,
              },
              clickAction: `/business-dashboard?booking=${savedBookingId}`,
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
      let qrCodeData = null;
      try {
        qrCodeData = await this.generateBookingQRCode(savedBookingId);
        await this.dataSource.query(
          `UPDATE bookings SET "qrCode" = $1, "updatedAt" = $2 WHERE id = $3`,
          [qrCodeData, new Date(), savedBookingId]
        );
        console.log(`[BookingsService] QR code generated and saved`);
      } catch (error) {
        console.error(`[BookingsService] Failed to generate QR code:`, error);
        // Don't throw - QR code failure shouldn't break booking creation
      }

      // Send confirmation email to customer with QR code
      try {
        const fullBooking = await this.findOne(savedBookingId);
        await this.emailService.sendBookingConfirmation(
          customer.email,
          {
            customer: {
              firstName: customer.firstName,
              lastName: customer.lastName,
            },
            service: {
              name: service.name,
              duration: service.duration,
            },
            business: {
              name: service.business.name,
              address: service.business.address,
              phone: service.business.phone,
            },
            appointmentDate: appointmentStart,
            totalAmount: service.price || 0,
          },
        );
        console.log(`[BookingsService] Confirmation email sent to ${customer.email}`);
      } catch (error) {
        console.error(`[BookingsService] Failed to send confirmation email:`, error);
        // Don't throw - email failure shouldn't break booking creation
      }

      return savedBooking;
    } catch (error: any) {
      console.error(`[BookingsService] ❌ Error creating booking:`, error);
      console.error(`[BookingsService] Error stack:`, error.stack);
      throw error;
    }
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
    });
  }

  async findAllPaginated(
    userId?: string,
    userRole?: string,
    paginationDto?: PaginationDto,
    businessId?: string,
    status?: BookingStatus,
  ): Promise<PaginatedResult<Booking>> {
    console.log(`[BookingsService] findAllPaginated called`);
    console.log(`[BookingsService] userId: ${userId}, userRole: ${userRole}, businessId: ${businessId}, status: ${status}`);
    
    const { limit = 20, offset = 0, sortBy = 'appointmentDate', sortOrder = 'DESC' } = paginationDto || {};
    const validSortBy = ['appointmentDate', 'createdAt', 'status'].includes(sortBy) ? sortBy : 'appointmentDate';
    const validSortOrder = sortOrder === 'ASC' ? 'ASC' : 'DESC';

    try {
      // First, verify bookings exist in database
      const testQuery = await this.dataSource.query(`SELECT COUNT(*) as count FROM bookings WHERE "deletedAt" IS NULL`);
      console.log(`[BookingsService] Total bookings in database: ${testQuery[0]?.count || 0}`);
      
      // If businessId is provided, check if there are bookings for that business
      if (businessId) {
        console.log(`[BookingsService] Checking bookings for businessId: ${businessId} (type: ${typeof businessId})`);
        
        // First, check ALL bookings to see what businessIds exist
        const allBusinessIds = await this.dataSource.query(
          `SELECT DISTINCT "businessId", COUNT(*) as count FROM bookings WHERE "deletedAt" IS NULL GROUP BY "businessId"`
        );
        console.log(`[BookingsService] All businessIds in bookings table:`, allBusinessIds);
        
        // Check with exact match
        const businessBookingsCount = await this.dataSource.query(
          `SELECT COUNT(*) as count FROM bookings WHERE "businessId" = $1 AND "deletedAt" IS NULL`,
          [businessId]
        );
        console.log(`[BookingsService] Bookings for business ${businessId}: ${businessBookingsCount[0]?.count || 0}`);
        
        // Check with text comparison (in case of UUID format issues)
        const businessBookingsCountText = await this.dataSource.query(
          `SELECT COUNT(*) as count FROM bookings WHERE "businessId"::text = $1 AND "deletedAt" IS NULL`,
          [businessId]
        );
        console.log(`[BookingsService] Bookings for business (text match) ${businessId}: ${businessBookingsCountText[0]?.count || 0}`);
        
        // Also check a sample booking to see the structure
        const sampleBooking = await this.dataSource.query(
          `SELECT id, "businessId", "businessId"::text as "businessIdText", "customerId", status, "appointmentDate" FROM bookings WHERE "deletedAt" IS NULL LIMIT 5`,
          []
        );
        if (sampleBooking && sampleBooking.length > 0) {
          console.log(`[BookingsService] Sample bookings (first 5):`, sampleBooking);
          console.log(`[BookingsService] Looking for businessId: ${businessId}`);
          const matching = sampleBooking.filter((b: any) => b.businessId === businessId || b.businessIdText === businessId);
          console.log(`[BookingsService] Matching bookings in sample:`, matching.length);
        } else {
          console.log(`[BookingsService] ⚠️ No bookings found in database at all!`);
        }
      }
      
      // Build WHERE conditions
      const whereConditions: string[] = [];
      const queryParams: any[] = [];
      let paramIndex = 1;

      // If businessId is explicitly provided, use ONLY that filter (skip role-based filtering)
      if (businessId) {
        console.log(`[BookingsService] businessId filter provided: ${businessId} (type: ${typeof businessId}) - filtering by business only`);
        // Use UUID comparison - PostgreSQL handles this correctly
        whereConditions.push(`b."businessId" = $${paramIndex++}::uuid`);
        queryParams.push(businessId);
        console.log(`[BookingsService] Added WHERE condition: b."businessId" = $${paramIndex - 1}::uuid with value: ${businessId}`);
      } else {
        // Role-based filtering (only when businessId is NOT provided)
        if (userRole === 'customer' && userId) {
          whereConditions.push(`b."customerId" = $${paramIndex++}`);
          queryParams.push(userId);
        } else if (userRole === 'business_owner' && userId) {
          // Get business owned by user
          const ownedBusiness = await this.dataSource.query(
            `SELECT id FROM businesses WHERE "ownerId" = $1 LIMIT 1`,
            [userId]
          );
          
          console.log(`[BookingsService] Business owner - owned business:`, ownedBusiness);
          
          if (ownedBusiness && ownedBusiness.length > 0) {
            const userBusinessId = ownedBusiness[0].id;
            console.log(`[BookingsService] Business owner's business ID: ${userBusinessId}`);
            // Show bookings for their business OR bookings they made as customers
            whereConditions.push(`(b."customerId" = $${paramIndex++} OR b."businessId" = $${paramIndex++})`);
            queryParams.push(userId, userBusinessId);
            console.log(`[BookingsService] Added business owner filter: customer OR business bookings`);
          } else {
            console.log(`[BookingsService] Business owner has no business, showing only customer bookings`);
            whereConditions.push(`b."customerId" = $${paramIndex++}`);
            queryParams.push(userId);
          }
        } else if (userRole === 'employee' && userId) {
          // Get businesses where user is an active member
          const memberships = await this.dataSource.query(
            `SELECT "businessId" FROM "business_members" WHERE "userId" = $1 AND status = $2`,
            [userId, BusinessMemberStatus.ACTIVE]
          );
          
          if (memberships && memberships.length > 0) {
            const businessIds = memberships.map((m: any) => m.businessId);
            if (businessIds.length === 1) {
              whereConditions.push(`b."businessId" = $${paramIndex++}`);
              queryParams.push(businessIds[0]);
            } else {
              // Use IN clause for multiple business IDs
              const placeholders = businessIds.map((_, i) => `$${paramIndex + i}`).join(', ');
              whereConditions.push(`b."businessId" IN (${placeholders})`);
              queryParams.push(...businessIds);
              paramIndex += businessIds.length;
            }
          } else {
            // No businesses, return empty result
            console.log(`[BookingsService] Employee has no business memberships`);
            return createPaginatedResponse([], 0, limit, offset);
          }
        }
        // For super_admin, no additional filtering
      }

      // Apply status filter if provided
      if (status) {
        whereConditions.push(`b.status = $${paramIndex++}`);
        queryParams.push(status);
      }

      // Exclude soft-deleted bookings
      whereConditions.push(`b."deletedAt" IS NULL`);

      const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

      // Build the main query - use simpler approach without json_build_object to avoid issues
      const bookingsQuery = `
        SELECT
          b.*,
          c.id as "customer_id",
          c."firstName" as "customer_firstName",
          c."lastName" as "customer_lastName",
          c.email as "customer_email",
          c.phone as "customer_phone",
          bus.id as "business_id",
          bus.name as "business_name",
          bus.category as "business_category",
          bus.images as "business_images",
          bus.address as "business_address",
          bus.city as "business_city",
          s.id as "service_id",
          s.name as "service_name",
          s.duration as "service_duration"
        FROM bookings b
        LEFT JOIN users c ON b."customerId" = c.id
        LEFT JOIN businesses bus ON b."businessId" = bus.id
        LEFT JOIN services s ON b."serviceId" = s.id
        ${whereClause}
        ORDER BY b."${validSortBy}" ${validSortOrder}
        LIMIT $${paramIndex++} OFFSET $${paramIndex++}
      `;

      queryParams.push(limit, offset);

      // Get total count
      const countQuery = `
        SELECT COUNT(*) as total
        FROM bookings b
        ${whereClause}
      `;
      const countParams = queryParams.slice(0, -2); // Remove limit and offset

      console.log(`[BookingsService] Executing bookings query...`);
      console.log(`[BookingsService] WHERE clause:`, whereClause);
      console.log(`[BookingsService] Query params:`, queryParams);
      console.log(`[BookingsService] Full query:`, bookingsQuery.replace(/\s+/g, ' ').substring(0, 200));
      
      const [bookings, countResult] = await Promise.all([
        this.dataSource.query(bookingsQuery, queryParams).catch((err) => {
          console.error(`[BookingsService] ❌ SQL Error in bookings query:`, err);
          console.error(`[BookingsService] Error details:`, {
            message: err.message,
            code: err.code,
            detail: err.detail,
            hint: err.hint,
          });
          throw err;
        }),
        this.dataSource.query(countQuery, countParams).catch((err) => {
          console.error(`[BookingsService] ❌ SQL Error in count query:`, err);
          throw err;
        }),
      ]);
      
      console.log(`[BookingsService] Raw bookings result:`, bookings.length, 'rows');
      if (bookings.length > 0) {
        console.log(`[BookingsService] Sample booking:`, {
          id: bookings[0].id,
          businessId: bookings[0].businessId,
          customerId: bookings[0].customerId,
          status: bookings[0].status,
          appointmentDate: bookings[0].appointmentDate,
        });
      }

      const total = parseInt(countResult[0]?.total || '0', 10);
      
      // Transform flat result into nested structure
      const parsedBookings = bookings.map((booking: any) => {
        // Build nested objects from flat columns
        const parsed: any = {
          ...booking,
          customer: booking.customer_id ? {
            id: booking.customer_id,
            firstName: booking.customer_firstName,
            lastName: booking.customer_lastName,
            email: booking.customer_email,
            phone: booking.customer_phone,
          } : null,
          business: booking.business_id ? {
            id: booking.business_id,
            name: booking.business_name,
            category: booking.business_category,
            images: booking.business_images || [],
            address: booking.business_address,
            city: booking.business_city,
          } : null,
          service: booking.service_id ? {
            id: booking.service_id,
            name: booking.service_name,
            duration: booking.service_duration,
          } : null,
        };
        
        // Remove flat column names
        delete parsed.customer_id;
        delete parsed.customer_firstName;
        delete parsed.customer_lastName;
        delete parsed.customer_email;
        delete parsed.customer_phone;
        delete parsed.business_id;
        delete parsed.business_name;
        delete parsed.business_category;
        delete parsed.business_images;
        delete parsed.business_address;
        delete parsed.business_city;
        delete parsed.service_id;
        delete parsed.service_name;
        delete parsed.service_duration;
        
        // Parse JSON columns if they exist as strings
        if (parsed.customFieldValues && typeof parsed.customFieldValues === 'string') {
          try {
            parsed.customFieldValues = JSON.parse(parsed.customFieldValues);
          } catch (e) {
            console.warn(`[BookingsService] Failed to parse customFieldValues:`, e);
          }
        }
        if (parsed.paymentDetails && typeof parsed.paymentDetails === 'string') {
          try {
            parsed.paymentDetails = JSON.parse(parsed.paymentDetails);
          } catch (e) {
            console.warn(`[BookingsService] Failed to parse paymentDetails:`, e);
          }
        }
        
        return parsed;
      });

      console.log(`[BookingsService] ✅ Found ${parsedBookings.length} booking(s), total: ${total}`);
      
      // Log detailed info about each booking
      if (parsedBookings.length > 0) {
        console.log(`[BookingsService] First booking details:`, {
          id: parsedBookings[0].id,
          businessId: parsedBookings[0].businessId,
          business: parsedBookings[0].business,
          customer: parsedBookings[0].customer,
          service: parsedBookings[0].service,
          status: parsedBookings[0].status,
        });
      } else {
        console.log(`[BookingsService] ⚠️ No bookings returned after processing!`);
        console.log(`[BookingsService] Raw bookings count: ${bookings.length}`);
        console.log(`[BookingsService] WHERE clause was: ${whereClause}`);
        console.log(`[BookingsService] Query params were:`, queryParams);
        if (businessId) {
          console.log(`[BookingsService] Checking if bookings exist for businessId: ${businessId}`);
          const directCheck = await this.dataSource.query(
            `SELECT id, "businessId", status FROM bookings WHERE "businessId" = $1 AND "deletedAt" IS NULL LIMIT 5`,
            [businessId]
          );
          console.log(`[BookingsService] Direct query result:`, directCheck);
        }
      }
      
      return createPaginatedResponse(parsedBookings, total, limit, offset);
    } catch (error: any) {
      console.error(`[BookingsService] ❌ Error in findAllPaginated:`, error);
      console.error(`[BookingsService] Error stack:`, error.stack);
      throw error;
    }
  }

  async findOne(id: string): Promise<Booking> {
    const booking = await this.bookingRepository.findOne({
      where: { id },
      relations: ['customer', 'business', 'service'],
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

  /**
   * Validates booking limitations based on service rules
   */
  private async validateBookingLimitations(
    service: Service,
    customerId: string,
    businessId: string,
    appointmentDate: Date,
  ): Promise<void> {
    const statuses = ['pending', 'confirmed'];

    // Check if customer can have multiple active bookings for this service
    if (!service.allowMultipleActiveBookings) {
      const existingActiveBooking = await this.bookingRepository
        .createQueryBuilder('booking')
        .leftJoin('booking.service', 'service')
        .leftJoin('booking.customer', 'customer')
        .where('customer.id = :customerId', { customerId })
        .andWhere('service.id = :serviceId', { serviceId: service.id })
        .andWhere('booking.status IN (:...statuses)', { statuses })
        .andWhere('booking.appointmentDate >= :now', { now: new Date() })
        .getOne();

      if (existingActiveBooking) {
        throw new BadRequestException(
          `You already have an active booking for this service. Please complete or cancel it before making a new booking.`
        );
      }
    }

    // Check daily booking limit (per service)
    if (service.maxBookingsPerCustomerPerDay > 0) {
      const selectedDateStart = new Date(appointmentDate);
      selectedDateStart.setHours(0, 0, 0, 0);
      const selectedDateEnd = new Date(appointmentDate);
      selectedDateEnd.setHours(23, 59, 59, 999);

      const userBookingsOnSelectedDate = await this.bookingRepository
        .createQueryBuilder('booking')
        .leftJoin('booking.customer', 'customer')
        .leftJoin('booking.service', 'service')
        .where('customer.id = :customerId', { customerId })
        .andWhere('service.id = :serviceId', { serviceId: service.id })
        .andWhere('booking.appointmentDate >= :selectedDateStart', { selectedDateStart })
        .andWhere('booking.appointmentDate <= :selectedDateEnd', { selectedDateEnd })
        .andWhere('booking.status IN (:...statuses)', { statuses })
        .getCount();

      if (userBookingsOnSelectedDate >= service.maxBookingsPerCustomerPerDay) {
        const limitMsg = service.maxBookingsPerCustomerPerDay === 1
          ? 'You can only book this service once per day'
          : `You have reached the maximum number of bookings (${service.maxBookingsPerCustomerPerDay}) for this service on ${appointmentDate.toLocaleDateString()}`;
        throw new BadRequestException(limitMsg);
      }
    }

    // Check weekly booking limit (per service)
    if (service.maxBookingsPerCustomerPerWeek && service.maxBookingsPerCustomerPerWeek > 0) {
      const weekStart = new Date(appointmentDate);
      const dayOfWeek = weekStart.getDay();
      const diff = weekStart.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1); // Adjust for Sunday
      weekStart.setDate(diff);
      weekStart.setHours(0, 0, 0, 0);

      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);
      weekEnd.setHours(23, 59, 59, 999);

      const userBookingsThisWeek = await this.bookingRepository
        .createQueryBuilder('booking')
        .leftJoin('booking.customer', 'customer')
        .leftJoin('booking.service', 'service')
        .where('customer.id = :customerId', { customerId })
        .andWhere('service.id = :serviceId', { serviceId: service.id })
        .andWhere('booking.appointmentDate >= :weekStart', { weekStart })
        .andWhere('booking.appointmentDate <= :weekEnd', { weekEnd })
        .andWhere('booking.status IN (:...statuses)', { statuses })
        .getCount();

      if (userBookingsThisWeek >= service.maxBookingsPerCustomerPerWeek) {
        throw new BadRequestException(
          `You have reached the maximum number of bookings (${service.maxBookingsPerCustomerPerWeek}) for this service this week.`
        );
      }
    }

    // Check cooldown period between bookings
    if (service.bookingCooldownHours > 0) {
      const cooldownStart = new Date();
      const cooldownEnd = new Date(cooldownStart.getTime() + service.bookingCooldownHours * 60 * 60 * 1000);

      const recentBooking = await this.bookingRepository
        .createQueryBuilder('booking')
        .leftJoin('booking.customer', 'customer')
        .leftJoin('booking.service', 'service')
        .where('customer.id = :customerId', { customerId })
        .andWhere('service.id = :serviceId', { serviceId: service.id })
        .andWhere('booking.appointmentDate >= :cooldownStart', { cooldownStart })
        .andWhere('booking.appointmentDate <= :cooldownEnd', { cooldownEnd })
        .andWhere('booking.status IN (:...statuses)', { statuses })
        .orderBy('booking.appointmentDate', 'DESC')
        .getOne();

      if (recentBooking) {
        const nextAvailable = new Date(recentBooking.appointmentDate.getTime() + service.bookingCooldownHours * 60 * 60 * 1000);
        throw new BadRequestException(
          `You must wait ${service.bookingCooldownHours} hours between bookings for this service. Next available: ${nextAvailable.toLocaleString()}`
        );
      }
    }
  }

  private async findAvailableTable(
    businessId: string,
    startTime: Date,
    endTime: Date,
    partySize: number
  ): Promise<any> {
    const tables = await this.dataSource.query(
      `SELECT * FROM resources
       WHERE "businessId" = $1
       AND type = 'table'
       AND "isActive" = true
       AND capacity >= $2
       AND "deletedAt" IS NULL
       ORDER BY capacity ASC, "sortOrder" ASC`,
      [businessId, partySize]
    );

    for (const table of tables) {
      const conflict = await this.bookingRepository
        .createQueryBuilder('booking')
        .where('booking.resourceId = :resourceId', { resourceId: table.id })
        .andWhere('booking.status IN (:...statuses)', {
          statuses: ['pending', 'confirmed']
        })
        .andWhere('booking.appointmentDate < :endTime', { endTime })
        .andWhere('booking.appointmentEndDate > :startTime', { startTime })
        .getCount();

      if (conflict === 0) {
        return table;
      }
    }

    return null;
  }
}
