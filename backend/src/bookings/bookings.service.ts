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
import { Resource, ResourceType } from '../resources/entities/resource.entity';
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
    @InjectRepository(Resource)
    private resourceRepository: Repository<Resource>,
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
    console.log(`[BookingsService] ========== BOOKING CREATION START ==========`);
    console.log(`[BookingsService] createBookingDto:`, JSON.stringify(createBookingDto, null, 2));
    console.log(`[BookingsService] customerId parameter:`, customerId);

    const {
      serviceId,
      appointmentDate,
      appointmentEndDate,
      resourceId,
      partySize,
      customFieldValues,
      notes,
      isRecurring,
      recurrencePattern,
      recurrenceEndDate,
    } = createBookingDto;

    // ============================================
    // STEP 1: Determine the customer email for confirmation
    // ============================================
    // Priority: DTO.customerEmail > customerId (if email) > will get from DB later
    let confirmationEmail: string | null = null;

    if (createBookingDto.customerEmail && createBookingDto.customerEmail.includes('@')) {
      confirmationEmail = createBookingDto.customerEmail.trim().toLowerCase();
      console.log(`[BookingsService] ✅ Confirmation email from DTO: "${confirmationEmail}"`);
    } else if (customerId && customerId.includes('@')) {
      confirmationEmail = customerId.trim().toLowerCase();
      console.log(`[BookingsService] ✅ Confirmation email from customerId: "${confirmationEmail}"`);
    }

    // ============================================
    // STEP 2: Handle customer lookup/creation
    // ============================================
    let actualCustomerId = customerId;

    // If we have an email, use it to find or create the customer
    if (confirmationEmail) {
      console.log(`[BookingsService] Looking up customer by email: "${confirmationEmail}"`);

      let existingCustomer = await this.userRepository.findOne({
        where: { email: confirmationEmail }
      });

      if (existingCustomer) {
        actualCustomerId = existingCustomer.id;
        console.log(`[BookingsService] ✅ Found existing customer: ${existingCustomer.email} -> ${actualCustomerId}`);
      } else {
        console.log(`[BookingsService] Creating new customer for: "${confirmationEmail}"`);
        const newCustomer = this.userRepository.create({
          email: confirmationEmail,
          firstName: confirmationEmail.split('@')[0],
          lastName: 'Customer',
          role: 'customer' as any,
          emailVerified: false,
          password: null,
        });

        const savedCustomer = await this.userRepository.save(newCustomer);
        actualCustomerId = savedCustomer.id;
        console.log(`[BookingsService] ✅ Created new customer: ${savedCustomer.email} -> ${actualCustomerId}`);
        
        // Verify the email was saved correctly
        if (!savedCustomer.email || savedCustomer.email !== confirmationEmail) {
          console.error(`[BookingsService] ⚠️ WARNING: Customer email mismatch!`);
          console.error(`[BookingsService] Expected: "${confirmationEmail}", Got: "${savedCustomer.email}"`);
        }
      }
    }

    // ============================================
    // STEP 3: Load the customer from database
    // ============================================
    const customer = await this.userRepository.findOne({ where: { id: actualCustomerId } });
    if (!customer) {
      throw new BadRequestException('Customer not found.');
    }

    // If we didn't have confirmationEmail yet, get it from the loaded customer
    // IMPORTANT: Use customer.email as final fallback, but prioritize the DTO email
    if (!confirmationEmail && customer.email) {
      confirmationEmail = customer.email;
      console.log(`[BookingsService] ✅ Confirmation email from DB customer: "${confirmationEmail}"`);
    }

    // Final check: ensure we have a valid confirmation email
    if (!confirmationEmail) {
      console.error(`[BookingsService] ⚠️ WARNING: No confirmation email available!`);
      console.error(`[BookingsService] DTO.customerEmail: "${createBookingDto.customerEmail}"`);
      console.error(`[BookingsService] customerId parameter: "${customerId}"`);
      console.error(`[BookingsService] Customer object email: "${customer.email}"`);
    }

    console.log(`[BookingsService] Customer: ${customer.firstName} ${customer.lastName} (${customer.email})`);
    console.log(`[BookingsService] Confirmation will be sent to: "${confirmationEmail}"`);

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

    const businessType = (business as any).businessType || 'personal_service';
    const isParallel = businessType === 'parallel';
    const isTableService = service.resourceType === ResourceType.TABLE;

    // For parallel businesses (restaurants with multiple tables): find an available table
    // even when service.resourceType is null (e.g. auto-created "Table reservation" service)
    if (!resourceId && (isTableService || isParallel)) {
      const size = partySize ?? 2;
      selectedResource = await this.findAvailableTable(
        business.id,
        appointmentStart,
        appointmentEnd,
        size
      );

      if (selectedResource) {
        // Table found - will use per-resource conflict check below
      } else if (isParallel || isTableService) {
        throw new BadRequestException(
          `No tables available for ${size} people at this time.`
        );
      }
    }

    // Auto-assign staff for personal_service when auto-accept + auto assignment
    const bookingAssignment = (business as any).bookingAssignment ?? 'auto';
    if (
      !selectedResource &&
      businessType === 'personal_service' &&
      business.autoAcceptBookings &&
      bookingAssignment === 'auto'
    ) {
      selectedResource = await this.assignLeastLoadedStaffResource(
        business.id,
        service,
        appointmentStart,
        appointmentEnd,
      );
      // If we couldn't assign (no staff resources), booking proceeds without resource - owner assigns manually
    }

    // Validate booking limitations based on service rules
    await this.validateBookingLimitations(service, actualCustomerId, business.id, appointmentStart);

    // Check resource conflicts
    if (selectedResource) {
      const resourceConflict = await this.bookingRepository
        .createQueryBuilder('booking')
        .leftJoin('booking.resource', 'res')
        .where('res.id = :resourceId', { resourceId: selectedResource.id })
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
        actualCustomerId,
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
    console.log(`[BookingsService] Customer ID: ${actualCustomerId}, Business ID: ${service.business.id}, Service ID: ${serviceId}`);
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
          actualCustomerId,
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
        console.log(`[BookingsService] 📧 Sending NEW BOOKING NOTIFICATION to business owner/staff:`, recipients);
        await this.emailService.sendNewBookingNotification(recipients, {
          businessName: b?.name || 'Your Business',
          serviceName: service.name,
          appointmentDate: appointmentStart.toLocaleString(),
        });
        console.log(`[BookingsService] ✅ Business owner notification email sent to: ${recipients.join(', ')}`);
      } catch (error) {
        console.error(`[BookingsService] ❌ Failed to send business owner notification:`, error);
      }

      // Generate QR code for the booking
      let qrCodeData = null;
      try {
        console.log(`[BookingsService] 🔳 Starting QR code generation for booking ${savedBookingId}...`);
        qrCodeData = await this.generateBookingQRCode(savedBookingId);
        if (!qrCodeData) {
          throw new Error('QR code generation returned null or empty');
        }
        if (!qrCodeData.startsWith('data:image')) {
          throw new Error(`Invalid QR code data URL format: ${qrCodeData.substring(0, 50)}...`);
        }
        await this.dataSource.query(
          `UPDATE bookings SET "qrCode" = $1, "updatedAt" = $2 WHERE id = $3`,
          [qrCodeData, new Date(), savedBookingId]
        );
        console.log(`[BookingsService] ✅ QR code generated and saved successfully (length: ${qrCodeData.length})`);
      } catch (error: any) {
        console.error(`[BookingsService] ❌ Failed to generate QR code:`, error.message);
        console.error(`[BookingsService] QR code error stack:`, error.stack);
        // Don't throw - QR code failure shouldn't break booking creation, but email will still be sent
        qrCodeData = null;
      }

      // ============================================
      // Send confirmation email to customer with QR code
      // ============================================
      console.log(`[BookingsService] 📧 ========== CUSTOMER CONFIRMATION EMAIL ==========`);
      console.log(`[BookingsService] 📧 Target email BEFORE fallback: "${confirmationEmail}"`);
      console.log(`[BookingsService] 📧 Customer: ${customer.firstName} ${customer.lastName} (${customer.email})`);
      console.log(`[BookingsService] 📧 Customer email from DB: "${customer.email}"`);
      console.log(`[BookingsService] 📧 DTO customerEmail: "${createBookingDto.customerEmail}"`);
      console.log(`[BookingsService] 📧 QR Code available: ${!!qrCodeData}`);
      console.log(`[BookingsService] 📧 QR Code length: ${qrCodeData ? qrCodeData.length : 0}`);

      // CRITICAL: Ensure we have a valid email address - ALWAYS use customer.email as final fallback
      // This ensures emails are sent even if confirmationEmail wasn't set correctly earlier
      if (!confirmationEmail || !confirmationEmail.includes('@')) {
        if (customer.email && customer.email.includes('@')) {
          confirmationEmail = customer.email.trim().toLowerCase();
          console.log(`[BookingsService] 📧 ⚠️ Using customer.email as confirmationEmail fallback: "${confirmationEmail}"`);
        }
      }

      console.log(`[BookingsService] 📧 Final confirmationEmail: "${confirmationEmail}"`);

      if (confirmationEmail && confirmationEmail.includes('@')) {
        try {
          console.log(`[BookingsService] 📧 Calling emailService.sendBookingConfirmation...`);
          const emailPromise = this.emailService.sendBookingConfirmation(
            confirmationEmail,
            {
              customer: {
                firstName: customer.firstName || 'Customer',
                lastName: customer.lastName || '',
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
              totalAmount: typeof service.price === 'number' ? service.price : parseFloat(service.price || '0') || 0,
              qrCode: qrCodeData, // This can be null if QR generation failed, but email should still send
              bookingId: savedBookingId,
            },
          );
          
          // Wait for email to complete
          await emailPromise;
          console.log(`[BookingsService] ✅✅✅ CONFIRMATION EMAIL SENT to ${confirmationEmail} ✅✅✅`);
        } catch (error: any) {
          console.error(`[BookingsService] ❌❌❌ FAILED to send confirmation email ❌❌❌`);
          console.error(`[BookingsService] Error message:`, error.message);
          console.error(`[BookingsService] Error code:`, error.code);
          console.error(`[BookingsService] Error response:`, error.response);
          console.error(`[BookingsService] Error command:`, error.command);
          console.error(`[BookingsService] Error stack:`, error.stack);
          // Don't throw - booking was already created successfully
          // Email failure is logged but doesn't break booking creation
          // TODO: Consider implementing retry logic or queue for failed emails
        }
      } else {
        const errorMsg = `Cannot send customer confirmation email - no valid email address: "${confirmationEmail}"`;
        console.error(`[BookingsService] ❌ ${errorMsg}`);
        console.error(`[BookingsService] Customer object:`, { id: customer.id, email: customer.email });
        // Don't throw - booking is still valid even if email fails
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
        relations: ['customer', 'business', 'service', 'resource'],
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
          .leftJoinAndSelect('booking.resource', 'resource')
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
        relations: ['customer', 'business', 'service', 'resource'],
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
          s.duration as "service_duration",
          r.id as "resource_id",
          r."userId" as "resource_userId"
        FROM bookings b
        LEFT JOIN users c ON b."customerId" = c.id
        LEFT JOIN businesses bus ON b."businessId" = bus.id
        LEFT JOIN services s ON b."serviceId" = s.id
        LEFT JOIN resources r ON b."resourceId" = r.id AND r."deletedAt" IS NULL
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
          resource: (booking.resource_id || booking.resource_userId) ? {
            id: booking.resource_id,
            userId: booking.resource_userId,
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
        delete parsed.resource_id;
        delete parsed.resource_userId;
        
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

  async updateStatus(id: string, status: BookingStatus, userId: string, userRole: string, reason?: string, resourceId?: string, assignToUserId?: string): Promise<Booking> {
    const booking = await this.findOne(id);
    const previousStatus = booking.status;

    // Check permissions
    if (userRole === 'customer' && booking.customer.id !== userId) {
      throw new ForbiddenException('You can only update your own bookings');
    }

    if (userRole === 'business_owner') {
      // Check if user owns the booking's business OR is an active member of it
      const bookingBusiness = await this.businessRepository.findOne({
        where: { id: booking.business.id },
        relations: ['owner'],
      });
      const ownsBusiness = bookingBusiness?.owner?.id === userId;
      if (!ownsBusiness) {
        const member = await this.businessMemberRepository.findOne({
          where: { business: { id: booking.business.id }, user: { id: userId }, status: BusinessMemberStatus.ACTIVE } as any,
        });
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

    if (status === BookingStatus.CONFIRMED) {
      const businessId = booking.business?.id || (booking as any).businessId;
      let resolvedResourceId = resourceId;
      if (resourceId && businessId) {
        const resource = await this.resourceRepository.findOne({ where: { id: resourceId }, relations: ['business'] });
        if (resource && resource.business?.id !== businessId) {
          throw new BadRequestException('Resource does not belong to this business');
        }
      }
      if (assignToUserId && !resolvedResourceId) {
        try {
          if (!businessId) throw new BadRequestException('Booking business not found');
          let staffResource = await this.resourceRepository.findOne({
            where: { business: { id: businessId }, user: { id: assignToUserId }, type: ResourceType.STAFF },
          });
          if (!staffResource) {
            const assignUser = await this.userRepository.findOne({ where: { id: assignToUserId } });
            const member = await this.businessMemberRepository.findOne({
              where: { business: { id: businessId }, user: { id: assignToUserId }, status: BusinessMemberStatus.ACTIVE } as any,
              relations: ['user'],
            });
            if (!member) throw new BadRequestException('Selected user is not a team member of this business');
            const business = await this.businessRepository.findOne({ where: { id: businessId } });
            if (!business) throw new NotFoundException('Business not found');
            const resourceName = (assignUser?.firstName && assignUser?.lastName)
              ? `${assignUser.firstName} ${assignUser.lastName}`.trim()
              : (assignUser?.firstName || assignUser?.email || 'Staff');
            // Use create + save; pass minimal relation refs to avoid loading full entities
            staffResource = this.resourceRepository.create({
              name: resourceName || 'Staff',
              type: ResourceType.STAFF,
              business: { id: businessId } as any,
              user: { id: assignToUserId } as any,
              isActive: true,
              sortOrder: 0,
            });
            staffResource = await this.resourceRepository.save(staffResource);
            staffResource = await this.resourceRepository.findOne({
              where: { business: { id: businessId }, user: { id: assignToUserId }, type: ResourceType.STAFF },
            });
            if (!staffResource) throw new BadRequestException('Failed to create staff resource');
          }
          resolvedResourceId = staffResource.id;
        } catch (err: any) {
          if (err instanceof BadRequestException || err instanceof NotFoundException) throw err;
          console.error('[BookingsService] Failed to create/assign staff resource:', err?.message || err);
          throw new BadRequestException(err?.message || 'Failed to assign employee to booking');
        }
      }
      if (resolvedResourceId) updateData.resourceId = resolvedResourceId;
    }

    if (updateData.resourceId !== undefined) {
      await this.dataSource.query(
        'UPDATE bookings SET "resourceId" = $1 WHERE id = $2',
        [updateData.resourceId, id],
      );
      delete updateData.resourceId;
    }
    if (Object.keys(updateData).length > 0) {
      await this.bookingRepository.update(id, updateData);
    }

    // Update trust score when booking status changes (non-blocking)
    const customerId = booking.customer?.id as string;
    if (customerId) {
      try {
        await this.trustScoreService.updateTrustScore(customerId);
      } catch (err: any) {
        console.warn('[BookingsService] Trust score update failed (non-fatal):', err?.message);
      }
    }

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
    try {
      const qrData = {
        bookingId,
        type: 'booking_checkin',
        timestamp: new Date().toISOString(),
      };

      const qrDataString = JSON.stringify(qrData);
      console.log(`[BookingsService] 🔳 Generating QR code for data: ${qrDataString}`);
      
      // QRCode.toDataURL(text, [options]) - options include errorCorrectionLevel, margin, width, etc.
      const dataUrl = await QRCode.toDataURL(qrDataString, {
        errorCorrectionLevel: 'H',
        margin: 1,
        width: 300,
      });
      
      if (!dataUrl || typeof dataUrl !== 'string' || !dataUrl.startsWith('data:image')) {
        throw new Error(`Invalid QR code data URL generated: ${dataUrl ? dataUrl.substring(0, 50) : 'null'}`);
      }
      
      console.log(`[BookingsService] ✅ QR code generated successfully (length: ${dataUrl.length})`);
      return dataUrl;
    } catch (error: any) {
      console.error(`[BookingsService] ❌ Error in generateBookingQRCode:`, error.message);
      console.error(`[BookingsService] QR code generation error stack:`, error.stack);
      throw error; // Re-throw to be caught by caller
    }
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
       AND (LOWER(type) = 'table' OR type = 'TABLE')
       AND "isActive" = true
       AND (capacity IS NULL OR capacity >= $2)
       AND "deletedAt" IS NULL
       ORDER BY COALESCE(capacity, 999) ASC, "sortOrder" ASC NULLS LAST`,
      [businessId, partySize]
    );

    for (const table of tables) {
      const conflict = await this.bookingRepository
        .createQueryBuilder('booking')
        .leftJoin('booking.resource', 'res')
        .where('res.id = :resourceId', { resourceId: table.id })
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

  /**
   * Assign booking to the least-loaded staff resource (fair distribution, not random).
   * Used when businessType=personal_service, autoAcceptBookings=true, bookingAssignment=auto.
   */
  private async assignLeastLoadedStaffResource(
    businessId: string,
    service: any,
    startTime: Date,
    endTime: Date,
  ): Promise<any> {
    // Get STAFF resources - optionally filtered by service
    let staffResources: any[] = [];
    if (service.resources?.length) {
      const linkedIds = service.resources.map((r: any) => r.id);
      staffResources = await this.dataSource.query(
        `SELECT r.* FROM resources r
         INNER JOIN service_resources sr ON sr."resourceId" = r.id AND sr."serviceId" = $2
         WHERE r."businessId" = $1 AND r.type = 'staff' AND r."isActive" = true AND r."deletedAt" IS NULL`,
        [businessId, service.id]
      );
    }
    if (staffResources.length === 0) {
      staffResources = await this.dataSource.query(
        `SELECT * FROM resources
         WHERE "businessId" = $1 AND type = 'staff' AND "isActive" = true AND "deletedAt" IS NULL
         ORDER BY "sortOrder" ASC`,
        [businessId]
      );
    }

    if (staffResources.length === 0) return null;

    const dayStart = new Date(startTime);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(dayStart);
    dayEnd.setDate(dayEnd.getDate() + 1);

    const candidates: { resource: any; load: number }[] = [];

    for (const res of staffResources) {
      const conflict = await this.bookingRepository
        .createQueryBuilder('booking')
        .leftJoin('booking.resource', 'res')
        .where('res.id = :resourceId', { resourceId: res.id })
        .andWhere('booking.status IN (:...statuses)', { statuses: ['pending', 'confirmed'] })
        .andWhere('booking.appointmentDate < :endTime', { endTime })
        .andWhere('booking.appointmentEndDate > :startTime', { startTime })
        .getCount();

      if (conflict > 0) continue;

      const load = await this.bookingRepository
        .createQueryBuilder('booking')
        .leftJoin('booking.resource', 'res')
        .where('res.id = :resourceId', { resourceId: res.id })
        .andWhere('booking.status IN (:...statuses)', { statuses: ['pending', 'confirmed'] })
        .andWhere('booking.appointmentDate >= :dayStart', { dayStart })
        .andWhere('booking.appointmentDate < :dayEnd', { dayEnd })
        .getCount();

      candidates.push({ resource: res, load });
    }

    if (candidates.length === 0) return null;

    candidates.sort((a, b) => a.load - b.load);
    return candidates[0].resource;
  }
}
