import { Injectable, NotFoundException, ForbiddenException, BadRequestException, Inject, forwardRef } from '@nestjs/common';
import { EmailService } from '../common/services/email.service';
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import * as QRCode from 'qrcode';
import { Business, BusinessStatus } from './entities/business.entity';
import { BusinessMember, BusinessMemberStatus } from './entities/business-member.entity';
import { BusinessContact } from './entities/business-contact.entity';
import { User, UserRole } from '../users/entities/user.entity';
import { MessagesService } from '../messages/messages.service';
import { RequestsService } from '../requests/requests.service';
import { StorageService } from '../storage/storage.service';
import { PaginationDto, PaginatedResult, createPaginatedResponse } from '../common/dto/pagination.dto';

@Injectable()
export class BusinessesService {
  constructor(
    @InjectRepository(Business)
    private businessRepository: Repository<Business>,
    @InjectRepository(BusinessMember)
    private businessMemberRepository: Repository<BusinessMember>,
    @InjectRepository(BusinessContact)
    private businessContactRepository: Repository<BusinessContact>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectDataSource()
    private dataSource: DataSource,
    private emailService: EmailService,
    private messagesService: MessagesService,
    @Inject(forwardRef(() => RequestsService))
    private requestsService: RequestsService,
    private storage: StorageService,
  ) {}

  async isOwnerOrMember(businessId: string, userId: string): Promise<boolean> {
    const business = await this.businessRepository.findOne({ where: { id: businessId }, relations: ['owner'] });
    if (!business) throw new NotFoundException('Business not found');
    if (String(business.owner?.id ?? '') === String(userId ?? '')) return true;
    const member = await this.businessMemberRepository.findOne({ where: { business: { id: businessId }, user: { id: userId }, status: BusinessMemberStatus.ACTIVE } as any });
    return !!member;
  }

  async inviteMember(businessId: string, ownerId: string, email: string, message?: string) {
    const business = await this.businessRepository.findOne({ where: { id: businessId }, relations: ['owner'] });
    if (!business) throw new NotFoundException('Business not found');
    if (business.owner.id !== ownerId) throw new ForbiddenException('Only owner can invite');

    const normalizedEmail = email?.trim()?.toLowerCase();
    if (!normalizedEmail) throw new BadRequestException('Email is required');

    const user = await this.userRepository.findOne({ where: { email: normalizedEmail } });
    if (!user) {
      throw new BadRequestException(
        'No account found with this email. The person must sign up on the app first before you can invite them.',
      );
    }

    if (user.role === 'business_owner') {
      throw new BadRequestException(
        'Business owners cannot be invited as employees. They already own their own business.',
      );
    }
    if (user.role === 'employee') {
      throw new BadRequestException(
        'This person is already an employee at another business and cannot be invited to join a different company.',
      );
    }

    const existing = await this.businessMemberRepository.findOne({ where: { business: { id: businessId }, email: normalizedEmail, status: BusinessMemberStatus.ACTIVE } as any });
    if (existing) throw new BadRequestException('This person is already a team member.');
    const existingInvite = await this.businessMemberRepository.findOne({ where: { business: { id: businessId }, email: normalizedEmail, status: BusinessMemberStatus.INVITED } as any });
    if (existingInvite) throw new BadRequestException('An invite was already sent to this email. They need to accept it first.');

    const invite = this.businessMemberRepository.create({ business: { id: businessId } as any, email: normalizedEmail, status: BusinessMemberStatus.INVITED });
    const savedInvite = await this.businessMemberRepository.save(invite);
    await this.messagesService.createTeamInvitationMessage(user.id, businessId, savedInvite.id, message?.trim() || undefined);
    return savedInvite;
  }

  async listMembers(businessId: string, requesterId: string) {
    const allowed = await this.isOwnerOrMember(businessId, requesterId);
    if (!allowed) throw new ForbiddenException('Not allowed');
    return this.businessMemberRepository.find({ where: { business: { id: businessId }, status: BusinessMemberStatus.ACTIVE } as any, relations: ['user'] });
  }

  async listInvitesByEmail(userEmail: string) {
    return this.businessMemberRepository.find({ where: { email: userEmail, status: BusinessMemberStatus.INVITED } as any, relations: ['business'] });
  }

  async removeMember(businessId: string, ownerId: string, memberId: string) {
    const business = await this.businessRepository.findOne({ where: { id: businessId }, relations: ['owner'] });
    if (!business) throw new NotFoundException('Business not found');
    if (business.owner.id !== ownerId) throw new ForbiddenException('Only owner can remove');
    const member = await this.businessMemberRepository.findOne({ where: { id: memberId, business: { id: businessId } } as any });
    if (!member) throw new NotFoundException('Member not found');
    member.status = BusinessMemberStatus.REMOVED;
    return this.businessMemberRepository.save(member);
  }

  // Contacts
  async addContact(businessId: string, email: string, name?: string) {
    const { hashEmailBlindIndex } = await import('../common/utils/crypto.util');
    const emailHash = hashEmailBlindIndex(email);
    const contact = this.businessContactRepository.create({ business: { id: businessId } as any, email, name, emailHash });
    return this.businessContactRepository.save(contact);
  }

  async listContacts(businessId: string) {
    return this.businessContactRepository.find({ where: { business: { id: businessId } } as any });
  }

  async removeContact(businessId: string, contactId: string) {
    const contact = await this.businessContactRepository.findOne({ where: { id: contactId, business: { id: businessId } } as any });
    if (!contact) throw new NotFoundException('Contact not found');
    await this.businessContactRepository.delete(contact.id);
    return { success: true };
  }

  async sendCampaign(businessId: string, subject: string, html: string) {
    const contacts = await this.listContacts(businessId);
    let sent = 0;
    for (const c of contacts) {
      if (c.subscribed) {
        try {
          await this.emailService.sendCampaignEmail(c.email, subject, html);
          sent++;
        } catch {}
      }
    }
    return { queued: contacts.length, sent };
  }

  private async geocodeAddress(createBusinessDto: any): Promise<{ latitude?: number; longitude?: number }> {
    // If coordinates are already provided, use them
    if (createBusinessDto.latitude && createBusinessDto.longitude) {
      return {
        latitude: createBusinessDto.latitude,
        longitude: createBusinessDto.longitude
      };
    }

    try {
      const parts = [
        createBusinessDto.address,
        createBusinessDto.city,
        createBusinessDto.state,
        createBusinessDto.zipCode,
        createBusinessDto.country || 'USA',
      ].filter(Boolean);

      if (parts.length === 0) return {};

      const query = parts.join(', ');
      const params = new URLSearchParams({ q: query, format: 'json', limit: '1' });
      const url = `https://nominatim.openstreetmap.org/search?${params.toString()}`;

      const res = await fetch(url, {
        headers: {
          'User-Agent': `Bukki/1.0 (${process.env.NOMINATIM_CONTACT_EMAIL || 'contact@example.com'})`,
          'Accept-Language': 'en',
        } as any,
      } as any);
      if (!res.ok) return {};
      const data: any[] = await res.json();
      if (!Array.isArray(data) || data.length === 0) return {};

      const best = data[0];
      const latitude = best?.lat ? parseFloat(best.lat) : undefined;
      const longitude = best?.lon ? parseFloat(best.lon) : undefined;
      if (Number.isFinite(latitude) && Number.isFinite(longitude)) {
        return { latitude, longitude };
      }
      return {};
    } catch {
      return {};
    }
  }

  async create(createBusinessDto: any, ownerId: string): Promise<Business> {
    try {
      // Prevent duplicate businesses per owner
      const existing = await this.businessRepository
        .createQueryBuilder('business')
        .where('business.ownerId = :ownerId', { ownerId })
        .getOne();
      if (existing) {
        throw new BadRequestException('You already have a business');
      }

      const coords = await this.geocodeAddress(createBusinessDto);
      const rawFields = createBusinessDto.customBookingFields;
      const customBookingFields = Array.isArray(rawFields)
        ? rawFields
            .filter((f: any) => f && (f.fieldName || f.label))
            .map((f: any) => ({
              fieldName: String(f.fieldName || f.label || ''),
              fieldType: ['text', 'number', 'select', 'textarea', 'checkbox'].includes(f.fieldType || f.type) ? (f.fieldType || f.type) : 'text',
              isRequired: Boolean(f.isRequired ?? f.required ?? false),
              options: Array.isArray(f.options) ? f.options : undefined,
            }))
        : null;

      const allowedKeys = [
        'name', 'description', 'category', 'address', 'city', 'state', 'zipCode', 'country',
        'phone', 'email', 'website', 'latitude', 'longitude', 'workingHours', 'amenities',
        'priceRange', 'businessType', 'bookingAssignment',
      ];
      const sanitized: Record<string, any> = {};
      for (const key of allowedKeys) {
        if (createBusinessDto[key] !== undefined) sanitized[key] = createBusinessDto[key];
      }
      sanitized.customBookingFields = customBookingFields;
      Object.assign(sanitized, coords);

      const business = this.businessRepository.create({
        ...sanitized,
        owner: { id: ownerId },
        status: BusinessStatus.PENDING,
        onboardingCompleted: true,
      });

      let savedBusiness: Business;
      try {
        savedBusiness = await (this.businessRepository.save(business as any) as unknown as Business);
      } catch (error: any) {
        if (error?.code === '23505') {
          throw new BadRequestException('Business with provided details already exists');
        }
        console.error('[BusinessesService.create] Save error:', error?.message || error);
        throw new BadRequestException(error?.message || 'Failed to save business');
      }
    
      // Generate QR code (non-fatal if it fails)
      try {
        const qrCodeData = await this.generateQRCode(savedBusiness.id);
        await this.businessRepository.update(savedBusiness.id, { qrCode: qrCodeData });
      } catch (qrErr: any) {
        console.warn('[BusinessesService.create] QR code generation failed:', qrErr?.message);
      }

    // Send confirmation email to owner
    try {
      // Load owner to get email/name
      const owner = await (this.businessRepository
        .createQueryBuilder('b')
        .leftJoinAndSelect('b.owner', 'owner')
        .where('b.id = :id', { id: savedBusiness.id })
        .select(['owner.email', 'owner.firstName'])
        .getOne());

      const to = owner?.owner?.email;
      const firstName = owner?.owner?.firstName || 'there';
      if (to) {
        const html = `
          <div style="font-family: Arial, sans-serif; max-width:600px; margin:0 auto; padding:20px;">
            <div style="background: #330007; padding:24px; color:#fff; border-radius:8px 8px 0 0;">
              <h2 style="margin:0;">Your business was submitted</h2>
            </div>
            <div style="border:1px solid #e5e7eb; border-top:0; padding:24px; border-radius:0 0 8px 8px;">
              <p>Hi ${firstName},</p>
              <p>Thanks for submitting <strong>${savedBusiness.name || 'your business'}</strong> to BUKKi. Your business is now <strong>PENDING REVIEW</strong>.</p>
              <p>Validation typically takes between <strong>30 minutes and 1 hour</strong>. Once approved, your business will appear in the app and on the admin page for management.</p>
              <p style="color:#6b7280; font-size:13px;">You will receive a notification once the review is complete.</p>
            </div>
          </div>
        `;
        await this.emailService.sendEmail(to, 'BUKKi — Business submitted for review', html);
      }
    } catch (e) {
      // Non-fatal: log and continue
      console.error('Failed to send business submission email:', e?.message || e);
    }

      return this.findOne(savedBusiness.id);
    } catch (e: any) {
      console.error('[BusinessesService.create] Error:', e?.message || e, e?.stack);
      if (e instanceof BadRequestException) throw e;
      throw new BadRequestException(e?.message || 'Failed to create business');
    }
  }

  async findAll(status?: BusinessStatus): Promise<Business[]> {
    const where = status ? { status } : {};
    return this.businessRepository.find({
      where,
      relations: ['owner', 'services'],
      select: {
        id: true,
        name: true,
        description: true,
        category: true,
        address: true,
        city: true,
        state: true,
        zipCode: true,
        country: true,
        latitude: true,
        longitude: true,
        phone: true,
        email: true,
        website: true,
        logo: true,
        images: true,
        status: true,
        workingHours: true,
        customBookingFields: true,
        qrCode: true,
        rating: true,
        reviewCount: true,
        isActive: true,
        showRevenue: true,
        autoAcceptBookings: true,
        maxBookingsPerUserPerDay: true,
        onboardingCompleted: true,
        subscriptionPlan: true,
        subscriptionExpiresAt: true,
        amenities: true,
        priceRange: true,
        createdAt: true,
        updatedAt: true,
        owner: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
        },
      },
    });
  }

  async findAllPaginated(
    paginationDto: PaginationDto,
    status?: BusinessStatus,
  ): Promise<PaginatedResult<Business>> {
    const { limit = 20, offset = 0, sortBy = 'createdAt', sortOrder = 'DESC' } = paginationDto;

    const queryBuilder = this.businessRepository
      .createQueryBuilder('business')
      .leftJoinAndSelect('business.owner', 'owner')
      .leftJoinAndSelect('business.services', 'services');

    // Apply status filter if provided
    if (status) {
      queryBuilder.where('business.status = :status', { status });
    }

    // Apply sorting
    queryBuilder.orderBy(`business.${sortBy}`, sortOrder);

    // Get total count
    const total = await queryBuilder.getCount();

    // Apply pagination
    queryBuilder.skip(offset).take(limit);

    // Execute query
    const businesses = await queryBuilder.getMany();

    return createPaginatedResponse(businesses, total, limit, offset);
  }

  async findOne(id: string): Promise<Business> {
    const business = await this.businessRepository.findOne({
      where: { id },
      relations: ['owner', 'services'],
      select: {
        id: true,
        name: true,
        description: true,
        category: true,
        address: true,
        city: true,
        state: true,
        zipCode: true,
        country: true,
        latitude: true,
        longitude: true,
        phone: true,
        email: true,
        website: true,
        logo: true,
        images: true,
        status: true,
        workingHours: true,
        customBookingFields: true,
        qrCode: true,
        rating: true,
        reviewCount: true,
        isActive: true,
        showRevenue: true,
        autoAcceptBookings: true,
        maxBookingsPerUserPerDay: true,
        onboardingCompleted: true,
        subscriptionPlan: true,
        subscriptionExpiresAt: true,
        amenities: true,
        priceRange: true,
        createdAt: true,
        updatedAt: true,
        owner: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
        },
      },
    });

    if (!business) {
      throw new NotFoundException('Business not found');
    }

    return business;
  }

  async findByOwner(ownerId: string): Promise<Business | null> {
    // Use query builder for better compatibility with Neon database
    return this.businessRepository
      .createQueryBuilder('business')
      .leftJoinAndSelect('business.owner', 'owner')
      .leftJoinAndSelect('business.services', 'services')
      .where('business.ownerId = :ownerId', { ownerId })
      .getOne();
  }

  /** Fields that staff (non-owners) are allowed to update */
  private static readonly STAFF_ALLOWED_UPDATE_FIELDS = ['showRevenue', 'autoAcceptBookings', 'bookingAssignment'];

  async update(id: string, updateData: any, userId: string, userRole: string): Promise<Business> {
    const business = await this.findOne(id);

    const ownerId = String(business.owner?.id ?? '');
    const requestUserId = String(userId ?? '');

    const isOwner = ownerId === requestUserId;
    const isSuperAdmin = userRole === 'super_admin';
    const isMember = !isOwner && (await this.isOwnerOrMember(id, userId));

    if (!isOwner && !isSuperAdmin && !isMember) {
      throw new ForbiddenException('You can only update your own business');
    }

    // Staff (members) may only update a whitelist of fields
    let dataToApply = updateData;
    if (isMember && !isOwner) {
      dataToApply = {};
      for (const key of BusinessesService.STAFF_ALLOWED_UPDATE_FIELDS) {
        if (key in updateData) {
          dataToApply[key] = updateData[key];
        }
      }
    }

    // If address fields changed, re-geocode (only owners/super_admin can change address)
    const addressFields = ['address', 'city', 'state', 'zipCode', 'country'];
    const addressChanged = addressFields.some(k => k in dataToApply);
    Object.assign(business, dataToApply);
    if (addressChanged) {
      const coords = await this.geocodeAddress({
        address: business.address,
        city: business.city,
        state: business.state,
        zipCode: business.zipCode,
        country: business.country,
      });
      if (coords.latitude && coords.longitude) {
        business.latitude = coords.latitude;
        business.longitude = coords.longitude;
      }
    }
    return this.businessRepository.save(business);
  }

  async approve(id: string): Promise<Business> {
    // Load business with owner to get email
    const business = await this.businessRepository.findOne({
      where: { id },
      relations: ['owner'],
    });

    if (!business) {
      throw new NotFoundException('Business not found');
    }

    business.status = BusinessStatus.APPROVED;
    const savedBusiness = await this.businessRepository.save(business);

    // Send approval email to business owner
    if (business.owner && business.owner.email) {
      try {
        await this.emailService.sendBusinessApprovalEmail(
          business.owner.email,
          business.owner.firstName || 'Business Owner',
          business.name,
        );
        console.log(`Approval email sent to ${business.owner.email} for business: ${business.name}`);
      } catch (error) {
        console.error('Failed to send approval email:', error);
        // Don't fail the approval if email fails
      }
    }

    return savedBusiness;
  }

  async reject(id: string, reason?: string): Promise<Business> {
    // Load business with owner to get email
    const business = await this.businessRepository.findOne({
      where: { id },
      relations: ['owner'],
    });

    if (!business) {
      throw new NotFoundException('Business not found');
    }

    business.status = BusinessStatus.REJECTED;
    const savedBusiness = await this.businessRepository.save(business);

    // Send rejection email to business owner
    if (business.owner && business.owner.email) {
      try {
        await this.emailService.sendBusinessRejectionEmail(
          business.owner.email,
          business.owner.firstName || 'Business Owner',
          business.name,
          reason,
        );
        console.log(`Rejection email sent to ${business.owner.email} for business: ${business.name}`);
      } catch (error) {
        console.error('Failed to send rejection email:', error);
        // Don't fail the rejection if email fails
      }
    }

    return savedBusiness;
  }

  async suspend(id: string, reason: string, adminId: string): Promise<Business> {
    // Validate reason is provided
    if (!reason || !reason.trim()) {
      throw new BadRequestException('Reason for suspension is required');
    }

    // 1. Load business with owner relation
    const business = await this.businessRepository.findOne({
      where: { id },
      relations: ['owner'],
    });

    if (!business) {
      throw new NotFoundException('Business not found');
    }

    // 2. Update status
    business.status = BusinessStatus.SUSPENDED;
    const savedBusiness = await this.businessRepository.save(business);

    // 3. Create suspension request record in requests table
    try {
      await this.requestsService.createSuspensionRequest(id, adminId, reason);
      console.log(`Suspension request created in requests table for business ${business.name}`);
    } catch (error) {
      console.error('Failed to create suspension request record:', error);
      // Don't fail the suspension if request creation fails
    }

    // 4. Send suspension email
    if (business.owner && business.owner.email) {
      try {
        await this.emailService.sendBusinessSuspensionEmail(
          business.owner.email,
          business.owner.firstName || 'Business Owner',
          business.name,
          reason
        );
        console.log(`Suspension email sent to ${business.owner.email}`);
      } catch (error) {
        console.error('Failed to send suspension email:', error);
      }
    }

    // 5. Create BUKKi system notification message
    if (business.owner) {
      try {
        // Create suspension request in requests table
        const suspensionRequest = await this.requestsService.createSuspensionRequest(
          id,
          adminId,
          reason,
        );

        await this.messagesService.createSystemNotification(
          business.owner.id,
          `Business Suspended: ${business.name}`,
          `Your business has been suspended. Reason: ${reason}\n\nYou can request unsuspension from your Business Settings page.`,
          { 
            type: 'SUSPENSION_REQUEST',
            requestId: suspensionRequest.id,
            businessId: id, 
            suspensionReason: reason 
          }
        );
        console.log(`System notification created for user ${business.owner.id}`);
      } catch (error) {
        console.error('Failed to create system notification:', error);
      }
    }

    return savedBusiness;
  }

  async unsuspend(id: string, adminId: string): Promise<Business> {
    // 1. Load business with owner relation
    const business = await this.businessRepository.findOne({
      where: { id },
      relations: ['owner'],
    });

    if (!business) {
      throw new NotFoundException('Business not found');
    }

    if (business.status !== BusinessStatus.SUSPENDED) {
      throw new BadRequestException('Business is not suspended');
    }

    // 2. Update any pending unsuspension requests to approved
    try {
      const pendingRequests = await this.requestsService.getPendingRequests();
      const businessRequests = pendingRequests.filter(r => r.business.id === id && r.requestType === 'unsuspension');
      for (const req of businessRequests) {
        await this.requestsService.approveRequest(req.id, adminId, 'Business unsuspended');
      }
    } catch (error) {
      console.error('Failed to update request status:', error);
      // Don't fail unsuspension if request update fails
    }

    // 3. Update status to approved and clear request fields
    business.status = BusinessStatus.APPROVED;
    business.unsuspensionRequestedAt = null;
    business.unsuspensionRequestReason = null;
    const savedBusiness = await this.businessRepository.save(business);

    // 3. Send unsuspension email
    if (business.owner && business.owner.email) {
      try {
        await this.emailService.sendBusinessUnsuspensionEmail(
          business.owner.email,
          business.owner.firstName || 'Business Owner',
          business.name
        );
        console.log(`Unsuspension email sent to ${business.owner.email}`);
      } catch (error) {
        console.error('Failed to send unsuspension email:', error);
      }
    }

    // 4. Create BUKKi system notification message
    if (business.owner) {
      try {
        await this.messagesService.createSystemNotification(
          business.owner.id,
          `Business Reactivated: ${business.name}`,
          `Great news! Your business has been reactivated and is now visible to customers again. You can start accepting bookings immediately.`,
          { businessId: id }
        );
        console.log(`System notification created for user ${business.owner.id}`);
      } catch (error) {
        console.error('Failed to create system notification:', error);
      }
    }

    return savedBusiness;
  }

  async requestUnsuspension(
    businessId: string,
    userId: string,
    reason: string,
  ): Promise<Business> {
    console.log(`[BusinessesService] requestUnsuspension called`);
    console.log(`[BusinessesService] Business ID: ${businessId}, User ID: ${userId}`);
    console.log(`[BusinessesService] Reason: ${reason.substring(0, 50)}...`);

    // Use RequestsService to create the request (stores in requests table)
    console.log(`[BusinessesService] Calling requestsService.createUnsuspensionRequest...`);
    let request;
    try {
      request = await this.requestsService.createUnsuspensionRequest(businessId, userId, reason);
      console.log(`[BusinessesService] ✅ Request created successfully with ID: ${request.id}`);
      console.log(`[BusinessesService] Request details:`, {
        id: request.id,
        businessId: request.business?.id,
        requestType: request.requestType,
        status: request.status,
        requestedAt: request.requestedAt,
      });
    } catch (error: any) {
      console.error(`[BusinessesService] ❌ ERROR creating request:`, error.message);
      console.error(`[BusinessesService] Error stack:`, error.stack);
      throw error;
    }

    // Verify the request exists in database immediately after creation
    console.log(`[BusinessesService] Verifying request exists in database...`);
    try {
      const verifyRequest = await this.requestsService.getRequestById(request.id);
      console.log(`[BusinessesService] ✅ Verified request exists in database: ${verifyRequest.id}`);
    } catch (verifyError: any) {
      console.error(`[BusinessesService] ❌ CRITICAL: Request not found in database after creation!`);
      console.error(`[BusinessesService] Request ID that was created: ${request.id}`);
      console.error(`[BusinessesService] Verify error:`, verifyError.message);
      // Don't throw here - continue to see if notifications work
    }

    // Load business for notifications
    const business = await this.businessRepository.findOne({
      where: { id: businessId },
      relations: ['owner'],
    });

    if (!business) {
      throw new NotFoundException('Business not found');
    }

    // Send notification to all super admins
    try {
      // Find all super admin users
      const admins = await this.userRepository.find({
        where: { role: UserRole.SUPER_ADMIN },
      });

      console.log(`[BusinessesService] Found ${admins.length} admin(s) to notify`);

      // Send system notification to each admin
      for (const admin of admins) {
        await this.messagesService.createSystemNotification(
          admin.id,
          `Unsuspension Request: ${business.name}`,
          `${business.owner.firstName} ${business.owner.lastName} has requested unsuspension for "${business.name}".\n\nReason: ${reason}\n\nPlease review this request in the Admin Dashboard.`,
          {
            type: 'UNSUSPENSION_REQUEST',
            businessId: business.id,
            businessName: business.name,
            ownerId: business.owner.id,
            ownerEmail: business.owner.email,
            requestId: request.id,
            requestedAt: request.requestedAt,
          }
        );
      }
      console.log(`[BusinessesService] ✅ Unsuspension request notifications sent to ${admins.length} admin(s)`);
    } catch (error) {
      console.error(`[BusinessesService] ❌ Failed to send admin notifications:`, error);
    }

    console.log(`[BusinessesService] ✅ Unsuspension request created for business ${business.name} (${business.id}) by ${business.owner.email}`);
    console.log(`[BusinessesService] Request ID: ${request.id}`);

    return business;
  }

  async searchBusinesses(
    query?: string,
    category?: string,
    location?: string,
    minRating?: number,
    minPrice?: number,
    maxPrice?: number,
    sortBy?: 'rating' | 'distance' | 'price' | 'name',
    verified?: boolean,
    amenities?: string[],
    priceRange?: string,
  ): Promise<Business[]> {
    const qb = this.businessRepository
      .createQueryBuilder('business')
      .leftJoinAndSelect('business.owner', 'owner')
      .leftJoinAndSelect('business.services', 'service')
      .where('business.status = :status', { status: BusinessStatus.APPROVED })
      .andWhere('business.isActive = :isActive', { isActive: true });

    if (query) {
      qb.andWhere(
        '(business.name ILIKE :query OR business.description ILIKE :query OR service.name ILIKE :query OR business.city ILIKE :query OR business.address ILIKE :query)',
        { query: `%${query}%` },
      );
    }

    if (category) {
      qb.andWhere('business.category = :category', { category });
    }

    if (location) {
      qb.andWhere('(business.city ILIKE :location OR business.state ILIKE :location)', {
        location: `%${location}%`,
      });
    }

    if (minRating !== undefined) {
      qb.andWhere('business.rating >= :minRating', { minRating });
    }

    if (verified !== undefined) {
      qb.andWhere('business.isVerified = :verified', { verified });
    }

    // Price range filtering
    if (priceRange && priceRange !== 'any') {
      qb.andWhere('business.priceRange = :priceRange', { priceRange });
    }

    // Amenities filtering - business must have ALL specified amenities
    if (amenities && amenities.length > 0) {
      qb.andWhere('business.amenities @> :amenities', {
        amenities: JSON.stringify(amenities)
      });
    }

    // Price filtering based on service prices
    if (minPrice !== undefined || maxPrice !== undefined) {
      if (minPrice !== undefined && maxPrice !== undefined) {
        qb.andWhere('service.price BETWEEN :minPrice AND :maxPrice', { minPrice, maxPrice });
      } else if (minPrice !== undefined) {
        qb.andWhere('service.price >= :minPrice', { minPrice });
      } else if (maxPrice !== undefined) {
        qb.andWhere('service.price <= :maxPrice', { maxPrice });
      }
    }

    // Sorting
    if (sortBy === 'rating') {
      qb.orderBy('business.rating', 'DESC');
    } else if (sortBy === 'name') {
      qb.orderBy('business.name', 'ASC');
    } else {
      qb.orderBy('business.rating', 'DESC'); // Default: by rating
    }

    return qb.getMany();
  }

  async getNearbyBusinesses(latitude: number, longitude: number, radius: number = 10): Promise<Business[]> {
    // Using a simple bounding box approach for now
    // In production, you'd want to use PostGIS for proper geographic queries
    const latRange = radius / 111; // Rough conversion: 1 degree ≈ 111 km
    const lngRange = radius / (111 * Math.cos(latitude * Math.PI / 180));

    return this.businessRepository
      .createQueryBuilder('business')
      .leftJoinAndSelect('business.owner', 'owner')
      .leftJoinAndSelect('business.services', 'services')
      .where('business.status = :status', { status: BusinessStatus.APPROVED })
      .andWhere('business.isActive = :isActive', { isActive: true })
      .andWhere('business.latitude BETWEEN :minLat AND :maxLat', {
        minLat: latitude - latRange,
        maxLat: latitude + latRange,
      })
      .andWhere('business.longitude BETWEEN :minLng AND :maxLng', {
        minLng: longitude - lngRange,
        maxLng: longitude + lngRange,
      })
      .getMany();
  }

  private async generateQRCode(businessId: string): Promise<string> {
    const qrData = {
      businessId,
      type: 'business_checkin',
      timestamp: new Date().toISOString(),
    };

    return QRCode.toDataURL(JSON.stringify(qrData));
  }

  async getBusinessStats(businessId: string): Promise<any> {
    const business = await this.findOne(businessId);

    // All-time stats (for main totals)
    const bookingsQuery = await this.dataSource.query(
      `SELECT
        COUNT(*) as "totalBookings",
        COUNT(DISTINCT "customerId") as "totalCustomers",
        SUM("totalAmount") as "totalRevenue"
       FROM bookings
       WHERE "businessId" = $1 AND "deletedAt" IS NULL`,
      [businessId]
    );

    // This month stats (for % change vs last month)
    const now = new Date();
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();
    const thisMonthBookingsQuery = await this.dataSource.query(
      `SELECT
        COUNT(*) as "totalBookings",
        COUNT(DISTINCT "customerId") as "totalCustomers",
        COALESCE(SUM("totalAmount"), 0) as "totalRevenue"
       FROM bookings
       WHERE "businessId" = $1 AND "deletedAt" IS NULL
         AND "appointmentDate" >= $2 AND "appointmentDate" < $3`,
      [businessId, thisMonthStart, new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString()]
    );
    const lastMonthBookingsQuery = await this.dataSource.query(
      `SELECT
        COUNT(*) as "totalBookings",
        COUNT(DISTINCT "customerId") as "totalCustomers",
        COALESCE(SUM("totalAmount"), 0) as "totalRevenue"
       FROM bookings
       WHERE "businessId" = $1 AND "deletedAt" IS NULL
         AND "appointmentDate" >= $2 AND "appointmentDate" < $3`,
      [businessId, lastMonthStart, thisMonthStart]
    );

    // Query services count
    const servicesQuery = await this.dataSource.query(
      `SELECT COUNT(*) as count FROM services WHERE "businessId" = $1 AND "deletedAt" IS NULL`,
      [businessId]
    );

    const stats = bookingsQuery[0] || { totalBookings: 0, totalCustomers: 0, totalRevenue: 0 };
    const thisMonth = thisMonthBookingsQuery[0] || { totalBookings: 0, totalCustomers: 0, totalRevenue: 0 };
    const lastMonth = lastMonthBookingsQuery[0] || { totalBookings: 0, totalCustomers: 0, totalRevenue: 0 };

    const base = {
      totalBookings: parseInt(stats.totalBookings) || 0,
      totalCustomers: parseInt(stats.totalCustomers) || 0,
      totalServices: parseInt(servicesQuery[0]?.count || 0),
      averageRating: business.rating || 0,
      reviewCount: business.reviewCount || 0,
      // Previous month values for % change
      totalBookingsLastMonth: parseInt(lastMonth.totalBookings) || 0,
      totalCustomersLastMonth: parseInt(lastMonth.totalCustomers) || 0,
      totalBookingsThisMonth: parseInt(thisMonth.totalBookings) || 0,
      totalCustomersThisMonth: parseInt(thisMonth.totalCustomers) || 0,
    } as any;

    if (business.showRevenue) {
      base.totalRevenue = parseFloat(stats.totalRevenue) || 0;
      base.totalRevenueThisMonth = parseFloat(thisMonth.totalRevenue) || 0;
      base.totalRevenueLastMonth = parseFloat(lastMonth.totalRevenue) || 0;
    }

    return base;
  }

  async acceptInvite(businessId: string, userId: string, email: string) {
    const invite = await this.businessMemberRepository.findOne({ 
      where: { business: { id: businessId }, email } as any,
      relations: ['business']
    });
    if (!invite) throw new NotFoundException('Invitation not found');
    
    // Update user role to EMPLOYEE
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (user && user.role !== 'employee') {
      user.role = 'employee' as any;
      await this.userRepository.save(user);
    }
    
    invite.user = { id: userId } as any;
    invite.status = BusinessMemberStatus.ACTIVE;
    const savedInvite = await this.businessMemberRepository.save(invite);
    
    // Return the business ID so frontend can redirect
    return {
      ...savedInvite,
      businessId: invite.business.id,
      businessName: invite.business.name,
    };
  }

  async getMyBusinesses(userId: string): Promise<Business[]> {
    // Get businesses where user is an employee
    const memberships = await this.businessMemberRepository.find({
      where: {
        user: { id: userId },
        status: BusinessMemberStatus.ACTIVE
      } as any,
      relations: ['business', 'business.owner', 'business.services'],
    });

    return memberships.map(m => m.business);
  }

  async getCategoryCounts(): Promise<Record<string, number>> {
    // Use raw SQL query to get accurate counts directly from database
    // This ensures we get the exact category values as stored in the database
    const result = await this.businessRepository.query(`
      SELECT 
        category,
        COUNT(*) as count
      FROM businesses
      WHERE "deletedAt" IS NULL
      GROUP BY category
    `);

    const counts: Record<string, number> = {};
    
    // Initialize all categories with 0
    const allCategories = [
      'beauty_salon',
      'restaurant',
      'mechanic',
      'tailor',
      'fitness',
      'healthcare',
      'education',
      'consulting',
      'other',
    ];

    allCategories.forEach(category => {
      counts[category] = 0;
    });

    // Map database results to counts
    result.forEach((row: any) => {
      if (row.category) {
        const categoryValue = String(row.category).toLowerCase().trim();
        const count = parseInt(row.count, 10) || 0;
        
        // Direct match
        if (allCategories.includes(categoryValue)) {
          counts[categoryValue] = count;
        } else {
          // If category doesn't match, add to 'other'
          counts['other'] = (counts['other'] || 0) + count;
        }
      }
    });

    return counts;
  }

  async addImages(businessId: string, imagePaths: string[]): Promise<Business> {
    const business = await this.findOne(businessId);

    // Initialize images array if it doesn't exist
    if (!business.images) {
      business.images = [];
    }

    // Add new images to the existing array
    business.images = [...business.images, ...imagePaths];

    return this.businessRepository.save(business);
  }

  async deleteImage(businessId: string, imageIndex: number): Promise<Business> {
    const business = await this.findOne(businessId);

    if (!business.images || business.images.length === 0) {
      throw new BadRequestException('No images to delete');
    }

    if (imageIndex < 0 || imageIndex >= business.images.length) {
      throw new BadRequestException('Invalid image index');
    }

    const imageUrl = business.images[imageIndex];
    try {
      await this.storage.deleteByUrl(imageUrl);
    } catch (error) {
      console.error('[BusinessesService] R2 delete failed:', error);
      // Continue – remove from DB even if R2 delete fails (e.g. already gone)
    }

    business.images.splice(imageIndex, 1);
    return this.businessRepository.save(business);
  }
}
