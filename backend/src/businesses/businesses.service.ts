import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { EmailService } from '../common/services/email.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as QRCode from 'qrcode';
import { Business, BusinessStatus } from './entities/business.entity';
import { BusinessMember, BusinessMemberStatus } from './entities/business-member.entity';
import { BusinessContact } from './entities/business-contact.entity';
import { User } from '../users/entities/user.entity';

@Injectable()
export class BusinessesService {
  constructor(
    @InjectRepository(Business)
    private businessRepository: Repository<Business>,
    @InjectRepository(BusinessMember)
    private businessMemberRepository: Repository<BusinessMember>,
    @InjectRepository(BusinessContact)
    private businessContactRepository: Repository<BusinessContact>,
    private emailService: EmailService,
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
    return this.businessMemberRepository.save(invite);
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
    const coords = await this.geocodeAddress(createBusinessDto);
    const business = this.businessRepository.create({
      ...createBusinessDto,
      ...coords,
      owner: { id: ownerId },
      onboardingCompleted: true,
    });

    const savedBusiness = await (this.businessRepository.save(business as any) as unknown as Business);
    
    // Generate QR code
    const qrCodeData = await this.generateQRCode(savedBusiness.id);
    await this.businessRepository.update(savedBusiness.id, { qrCode: qrCodeData });

    return this.findOne(savedBusiness.id);
  }

  async findAll(status?: BusinessStatus): Promise<Business[]> {
    const where = status ? { status } : {};
    return this.businessRepository.find({
      where,
      relations: ['owner', 'services'],
      select: {
        owner: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
        },
      },
    });
  }

  async findOne(id: string): Promise<Business> {
    const business = await this.businessRepository.findOne({
      where: { id },
      relations: ['owner', 'services'],
      select: {
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
      relations: ['services'],
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

  async searchBusinesses(query: string, category?: string, location?: string): Promise<Business[]> {
    const qb = this.businessRepository.createQueryBuilder('business')
      .leftJoinAndSelect('business.owner', 'owner')
      .leftJoinAndSelect('business.services', 'services')
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
    const invite = await this.businessMemberRepository.findOne({ where: { business: { id: businessId }, email } as any });
    if (!invite) throw new NotFoundException('Invitation not found');
    invite.user = { id: userId } as any;
    invite.status = BusinessMemberStatus.ACTIVE;
    return this.businessMemberRepository.save(invite);
  }
}
