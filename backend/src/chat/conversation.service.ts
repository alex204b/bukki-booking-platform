import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Conversation } from './entities/conversation.entity';
import { Business } from '../businesses/entities/business.entity';
import { User } from '../users/entities/user.entity';
import { Booking } from '../bookings/entities/booking.entity';

@Injectable()
export class ConversationService {
  constructor(
    @InjectRepository(Conversation)
    private conversationRepository: Repository<Conversation>,
    @InjectRepository(Business)
    private businessRepository: Repository<Business>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Booking)
    private bookingRepository: Repository<Booking>,
  ) {}

  async getOrCreateConversation(
    businessId: string,
    customerId: string,
  ): Promise<Conversation> {
    // Check if conversation already exists
    let conversation = await this.conversationRepository.findOne({
      where: {
        businessId,
        customerId,
      },
      relations: ['business', 'customer', 'businessOwner'],
    });

    if (conversation) {
      return conversation;
    }

    // Get business owner
    const business = await this.businessRepository.findOne({
      where: { id: businessId },
      relations: ['owner'],
    });

    if (!business || !business.owner) {
      throw new NotFoundException('Business or business owner not found');
    }

    // Verify customer has booking with this business
    const hasBooking = await this.bookingRepository.findOne({
      where: {
        customer: { id: customerId },
        business: { id: businessId },
      },
    });

    if (!hasBooking) {
      throw new BadRequestException('You must have a booking with this business to start a conversation');
    }

    // Create new conversation
    conversation = this.conversationRepository.create({
      businessId,
      customerId,
      businessOwnerId: business.owner.id as string,
      customerUnreadCount: 0,
      businessUnreadCount: 0,
    });

    return this.conversationRepository.save(conversation);
  }

  async getConversationById(conversationId: string): Promise<Conversation> {
    const conversation = await this.conversationRepository.findOne({
      where: { id: conversationId },
      relations: ['business', 'customer', 'businessOwner'],
    });

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    return conversation;
  }

  async getUserConversations(
    userId: string,
    userRole?: string,
  ): Promise<Conversation[]> {
    let conversations: Conversation[];

    if (userRole === 'business_owner') {
      // Get conversations where user is business owner
      conversations = await this.conversationRepository.find({
        where: { businessOwnerId: userId },
        relations: ['business', 'customer'],
        order: { lastMessageAt: 'DESC' },
      });
    } else {
      // Get conversations where user is customer
      conversations = await this.conversationRepository.find({
        where: { customerId: userId },
        relations: ['business', 'businessOwner'],
        order: { lastMessageAt: 'DESC' },
      });
    }

    return conversations;
  }

  async updateLastMessage(
    conversationId: string,
    messageId: string,
    messagePreview: string,
  ): Promise<void> {
    await this.conversationRepository.update(conversationId, {
      lastMessageId: messageId,
      lastMessageAt: new Date(),
      lastMessagePreview: messagePreview,
    });
  }

  async getTotalUnreadCount(userId: string, userRole?: string): Promise<number> {
    const conversations = await this.getUserConversations(userId, userRole);

    return conversations.reduce((total, conv) => {
      if (userRole === 'business_owner') {
        return total + conv.businessUnreadCount;
      } else {
        return total + conv.customerUnreadCount;
      }
    }, 0);
  }
}
