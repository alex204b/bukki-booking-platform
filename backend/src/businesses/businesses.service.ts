import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { EmailService } from '../common/services/email.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as QRCode from 'qrcode';
import { Business, BusinessStatus } from './entities/business.entity';
import { BusinessMember, BusinessMemberStatus } from './entities/business-member.entity';
import { BusinessContact } from './entities/business-contact.entity';
import { User } from '../users/entities/user.entity';
import { MessagesService } from '../messages/messages.service';
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
    private emailService: EmailService,
    private messagesService: MessagesService,
  ) {}

  async isOwnerOrMember(businessId: string, userId: string): Promise<boolean> {
    const business = await this.businessRepository.findOne({ where: { id: businessId }, relations: ['owner'] });
    if (!business) throw new NotFoundException('Business not found');
    if (business.owner.id === userId) return true;
    const member = await this.businessMemberRepository.findOne({ where: { business: { id: businessId }, user: { id: userId }, status: BusinessMemberStatus.ACTIVE } as any });
    return !!member;
  }

  async inviteMember(businessId: string, ownerId: string, email: string) {
    const business = await this.businessRepository.findOne({ where: { id: businessId }, relations: ['owner'] });
    if (!business) throw new NotFoundException('Business not found');
    if (business.owner.id !== ownerId) throw new ForbiddenException('Only owner can invite');
    const existing = await this.businessMemberRepository.findOne({ where: { business: { id: businessId }, email, status: BusinessMemberStatus.ACTIVE } as any });
    if (existing) throw new BadRequestException('Member already exists');
    const invite = this.businessMemberRepository.create({ business: { id: businessId } as any, email, status: BusinessMemberStatus.INVITED });
    const savedInvite = await this.businessMemberRepository.save(invite);
    
    // Create message for team invitation if user exists
    const user = await this.userRepository.findOne({ where: { email } });
    if (user) {
      await this.messagesService.createTeamInvitationMessage(user.id, businessId, savedInvite.id);
    }
    
    return savedInvite;
  }

  async listMembers(businessId: string, requesterId: string) {
    const allowed = await this.isOwnerOrMember(businessId, requesterId);
    if (!allowed) throw new ForbiddenException('Not allowed');
    return this.businessMemberRepository.find({ where: { business: { id: businessId }, status: BusinessMemberStatus.ACTIVE } as any });
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
    // Prevent duplicate businesses per owner
    const existing = await this.businessRepository.findOne({ where: { owner: { id: ownerId } } as any });
    if (existing) {
      throw new BadRequestException('You already have a business');
    }

    const coords = await this.geocodeAddress(createBusinessDto);
    const business = this.businessRepository.create({
      ...createBusinessDto,
      ...coords,
      owner: { id: ownerId },
      status: BusinessStatus.PENDING,
      onboardingCompleted: true,
    });

    let savedBusiness: Business;
    try {
      savedBusiness = await (this.businessRepository.save(business as any) as unknown as Business);
    } catch (error: any) {
      // Surface DB errors clearly
      if (error?.code === '23505') {
        // unique_violation in Postgres
        throw new BadRequestException('Business with provided details already exists');
      }
      throw error;
    }
    
    // Generate QR code
    const qrCodeData = await this.generateQRCode(savedBusiness.id);
    await this.businessRepository.update(savedBusiness.id, { qrCode: qrCodeData });

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
            <div style="background: linear-gradient(135deg,#f97316,#ea580c); padding:24px; color:#fff; border-radius:8px 8px 0 0;">
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
  }

  async findAll(status?: BusinessStatus): Promise<Business[]> {
    const where = status ? { status } : {};
    return this.businessRepository.find({
      where,
      relations: ['owner'],
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
      .leftJoinAndSelect('business.owner', 'owner');

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
      relations: ['owner'],
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
    return this.businessRepository.findOne({
      where: { owner: { id: ownerId } },
      relations: ['owner'],
    });
  }

  async update(id: string, updateData: any, userId: string, userRole: string): Promise<Business> {
    const business = await this.findOne(id);

    // Check if user owns the business or is super admin
    if (business.owner.id !== userId && userRole !== 'super_admin') {
      throw new ForbiddenException('You can only update your own business');
    }

    // If address fields changed, re-geocode
    const addressFields = ['address', 'city', 'state', 'zipCode', 'country'];
    const addressChanged = addressFields.some(k => k in updateData);
    Object.assign(business, updateData);
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
    const business = await this.findOne(id);
    business.status = BusinessStatus.APPROVED;
    return this.businessRepository.save(business);
  }

  async reject(id: string, reason?: string): Promise<Business> {
    const business = await this.findOne(id);
    business.status = BusinessStatus.REJECTED;
    return this.businessRepository.save(business);
  }

  async suspend(id: string): Promise<Business> {
    const business = await this.findOne(id);
    business.status = BusinessStatus.SUSPENDED;
    return this.businessRepository.save(business);
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
      .leftJoin('business.services', 'service')
      .where('business.status = :status', { status: BusinessStatus.APPROVED })
      .andWhere('business.isActive = :isActive', { isActive: true });

    if (query) {
      qb.andWhere('(business.name ILIKE :query OR business.description ILIKE :query)', {
        query: `%${query}%`,
      });
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

    // Group by business to avoid duplicates from service joins
    qb.groupBy('business.id').addGroupBy('owner.id');

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
    
    // This would typically involve more complex queries
    // For now, returning basic stats
    const base = {
      totalBookings: business.bookings?.length || 0,
      totalServices: business.services?.length || 0,
      averageRating: business.rating,
      reviewCount: business.reviewCount,
    } as any;

    if (business.showRevenue) {
      // Placeholder: revenue aggregation would be implemented properly
      base.totalRevenue = 0;
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
      relations: ['business', 'business.owner'],
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

    // Delete the file from filesystem
    const fs = await import('fs/promises');
    const path = await import('path');
    const imagePath = business.images[imageIndex];
    const fullPath = path.join(process.cwd(), imagePath);

    try {
      await fs.unlink(fullPath);
    } catch (error) {
      console.error('Error deleting file:', error);
      // Continue even if file deletion fails (file might not exist)
    }

    // Remove from array
    business.images.splice(imageIndex, 1);

    return this.businessRepository.save(business);
  }
}
