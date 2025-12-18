import { Injectable, NotFoundException, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Offer } from './entities/offer.entity';
import { CreateOfferDto } from './dto/create-offer.dto';
import { Business } from '../businesses/entities/business.entity';
import { Booking } from '../bookings/entities/booking.entity';
import { User } from '../users/entities/user.entity';
import { EmailService } from '../common/services/email.service';
import { PushNotificationService } from '../notifications/push-notification.service';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class OffersService {
  constructor(
    @InjectRepository(Offer)
    private offerRepository: Repository<Offer>,
    @InjectRepository(Business)
    private businessRepository: Repository<Business>,
    @InjectRepository(Booking)
    private bookingRepository: Repository<Booking>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private emailService: EmailService,
    private pushNotificationService: PushNotificationService,
    private configService: ConfigService,
  ) {}

  /**
   * Create a new offer (business owner only)
   * Automatically sends to all customers who have booked with this business
   */
  async create(createOfferDto: CreateOfferDto, businessId: string, ownerId: string): Promise<Offer> {
    // Verify business exists and user is the owner
    const business = await this.businessRepository.findOne({
      where: { id: businessId },
      relations: ['owner'],
    });

    if (!business) {
      throw new NotFoundException('Business not found');
    }

    // Check if user is the owner or super admin
    const ownerIdStr = String(business.owner?.id || '');
    const userIdStr = String(ownerId);
    
    if (ownerIdStr !== userIdStr) {
      throw new UnauthorizedException('Only the business owner can create offers');
    }

    // Validate discount fields
    if (!createOfferDto.discountAmount && !createOfferDto.discountPercentage) {
      throw new BadRequestException('Either discountAmount or discountPercentage must be provided');
    }

    if (createOfferDto.discountAmount && createOfferDto.discountPercentage) {
      throw new BadRequestException('Cannot specify both discountAmount and discountPercentage');
    }

    // Create the offer
    const offer = this.offerRepository.create({
      ...createOfferDto,
      businessId,
      validUntil: createOfferDto.validUntil ? new Date(createOfferDto.validUntil) : null,
      isActive: createOfferDto.isActive !== undefined ? createOfferDto.isActive : true,
    });

    const savedOffer = await this.offerRepository.save(offer);

    // Find all unique customers who have booked with this business
    const bookings = await this.bookingRepository.find({
      where: { business: { id: businessId } },
      relations: ['customer'],
      select: ['customer'],
    });

    // Get unique customer IDs
    const uniqueCustomerIds = [...new Set(bookings.map(b => b.customer.id))];

    if (uniqueCustomerIds.length > 0) {
      // Get all customer details
      const customers = await this.userRepository.find({
        where: { id: In(uniqueCustomerIds) },
      });

      // Send offers to all customers (email + push notification)
      await this.sendOffersToCustomers(savedOffer, business, customers);
    }

    return savedOffer;
  }

  /**
   * Get all offers for a specific user (customers who have booked with businesses)
   */
  async getUserOffers(userId: string): Promise<Offer[]> {
    try {
      // Find all businesses the user has booked with
      const bookings = await this.bookingRepository.find({
        where: { customer: { id: userId } },
        relations: ['business'],
        select: ['business'],
      });

      console.log(`[OffersService] Found ${bookings.length} bookings for user ${userId}`);

      const businessIds = [...new Set(bookings.map(b => b.business.id))];

      console.log(`[OffersService] Unique business IDs: ${businessIds.length}`, businessIds);

      if (businessIds.length === 0) {
        console.log(`[OffersService] User ${userId} has no bookings, returning empty array`);
        return [];
      }

      // Get all active offers from those businesses
      const offers = await this.offerRepository.find({
        where: {
          businessId: In(businessIds),
          isActive: true,
        },
        relations: ['business'],
        order: { createdAt: 'DESC' },
      });

      console.log(`[OffersService] Found ${offers.length} active offers`);

      // Filter out expired offers
      const now = new Date();
      const validOffers = offers.filter(offer => {
        if (!offer.validUntil) return true;
        return new Date(offer.validUntil) > now;
      });

      console.log(`[OffersService] Returning ${validOffers.length} valid offers`);
      
      // Verify business relations are loaded
      for (const offer of validOffers) {
        if (!offer.business) {
          console.warn(`[OffersService] Offer ${offer.id} missing business relation`);
        } else if (!offer.business.id) {
          console.warn(`[OffersService] Offer ${offer.id} has business but missing business.id`);
        }
      }
      
      return validOffers;
    } catch (error) {
      console.error('[OffersService] Error getting user offers:', error);
      throw error;
    }
  }

  /**
   * Get all offers for a business (business owner)
   */
  async getBusinessOffers(businessId: string, ownerId: string): Promise<Offer[]> {
    // Verify business ownership
    const business = await this.businessRepository.findOne({
      where: { id: businessId },
      relations: ['owner'],
    });

    if (!business) {
      throw new NotFoundException('Business not found');
    }

    const ownerIdStr = String(business.owner?.id || '');
    const userIdStr = String(ownerId);
    
    if (ownerIdStr !== userIdStr) {
      throw new UnauthorizedException('Only the business owner can view offers');
    }

    return this.offerRepository.find({
      where: { businessId },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Send offers to customers via email and push notifications
   */
  private async sendOffersToCustomers(
    offer: Offer,
    business: Business,
    customers: User[],
  ): Promise<void> {
    const frontendUrl = this.configService.get<string>('FRONTEND_URL', 'http://localhost:3001');
    const offerUrl = `${frontendUrl}/offers`;

    // Format discount text
    let discountText = '';
    if (offer.discountAmount) {
      discountText = `$${offer.discountAmount} off`;
    } else if (offer.discountPercentage) {
      discountText = `${offer.discountPercentage}% off`;
    }

    // Send emails and push notifications to each customer
    for (const customer of customers) {
      try {
        // Send email
        const emailHtml = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #fff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
            <div style="background: linear-gradient(135deg, #f97316 0%, #ea580c 100%); padding: 30px; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 28px;">Special Offer from ${business.name}!</h1>
            </div>
            
            <div style="padding: 30px;">
              <p style="font-size: 16px; color: #333; margin-bottom: 20px;">
                Hello ${customer.firstName},
              </p>
              
              <div style="background: #fff7ed; border-left: 4px solid #f97316; padding: 20px; margin: 20px 0; border-radius: 4px;">
                <h2 style="color: #ea580c; margin-top: 0;">${offer.title}</h2>
                <p style="color: #333; font-size: 16px; line-height: 1.6;">${offer.description}</p>
                ${discountText ? `<p style="font-size: 20px; font-weight: bold; color: #ea580c; margin: 15px 0;">${discountText}</p>` : ''}
                ${offer.discountCode ? `<p style="color: #666; margin-top: 10px;">Use code: <strong style="color: #ea580c;">${offer.discountCode}</strong></p>` : ''}
                ${offer.validUntil ? `<p style="color: #666; margin-top: 10px; font-size: 14px;">Valid until: ${new Date(offer.validUntil).toLocaleDateString()}</p>` : ''}
              </div>

              ${offer.metadata?.termsAndConditions ? `
                <div style="background: #f8fafc; padding: 15px; border-radius: 4px; margin: 20px 0;">
                  <p style="font-size: 12px; color: #666; margin: 0; line-height: 1.5;">${offer.metadata.termsAndConditions}</p>
                </div>
              ` : ''}
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${offerUrl}" style="background: #f97316; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold; font-size: 16px;">
                  View Offer
                </a>
              </div>
              
              <p style="color: #666; font-size: 14px; margin-top: 30px; border-top: 1px solid #e5e7eb; padding-top: 20px;">
                Thank you for being a valued customer of ${business.name}!
              </p>
            </div>
          </div>
        `;

        await this.emailService.sendEmail(
          customer.email,
          `Special Offer: ${offer.title} - ${business.name}`,
          emailHtml,
        );

        // Send push notification
        await this.pushNotificationService.sendToUser(
          customer.id,
          {
            title: `Special Offer from ${business.name}`,
            body: offer.title,
            data: {
              type: 'offer',
              offerId: offer.id,
              businessId: business.id,
            },
            clickAction: offerUrl,
          },
          'offers',
        );
      } catch (error) {
        console.error(`Failed to send offer to customer ${customer.id}:`, error);
        // Continue with other customers even if one fails
      }
    }
  }

  /**
   * Update offer status
   */
  async updateOfferStatus(offerId: string, businessId: string, ownerId: string, isActive: boolean): Promise<Offer> {
    const offer = await this.offerRepository.findOne({
      where: { id: offerId, businessId },
      relations: ['business', 'business.owner'],
    });

    if (!offer) {
      throw new NotFoundException('Offer not found');
    }

    const ownerIdStr = String(offer.business.owner?.id || '');
    const userIdStr = String(ownerId);
    
    if (ownerIdStr !== userIdStr) {
      throw new UnauthorizedException('Only the business owner can update offers');
    }

    offer.isActive = isActive;
    return this.offerRepository.save(offer);
  }

  /**
   * Delete an offer
   */
  async delete(offerId: string, businessId: string, ownerId: string): Promise<void> {
    const offer = await this.offerRepository.findOne({
      where: { id: offerId, businessId },
      relations: ['business', 'business.owner'],
    });

    if (!offer) {
      throw new NotFoundException('Offer not found');
    }

    const ownerIdStr = String(offer.business.owner?.id || '');
    const userIdStr = String(ownerId);
    
    if (ownerIdStr !== userIdStr) {
      throw new UnauthorizedException('Only the business owner can delete offers');
    }

    await this.offerRepository.remove(offer);
  }
}

