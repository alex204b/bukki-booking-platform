import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan, Not, IsNull } from 'typeorm';
import { Message, MessageType, MessageStatus } from './entities/message.entity';
import { User } from '../users/entities/user.entity';
import { Business } from '../businesses/entities/business.entity';
import { Booking, BookingStatus } from '../bookings/entities/booking.entity';
import { BusinessMember, BusinessMemberStatus } from '../businesses/entities/business-member.entity';
import { EmailService } from '../common/services/email.service';
import { PushNotificationService } from '../notifications/push-notification.service';
import { PaginationDto, PaginatedResult, createPaginatedResponse } from '../common/dto/pagination.dto';

@Injectable()
export class MessagesService {
  constructor(
    @InjectRepository(Message)
    private messageRepository: Repository<Message>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Business)
    private businessRepository: Repository<Business>,
    @InjectRepository(Booking)
    private bookingRepository: Repository<Booking>,
    @InjectRepository(BusinessMember)
    private businessMemberRepository: Repository<BusinessMember>,
    private emailService: EmailService,
    private pushNotificationService: PushNotificationService,
  ) {}

  /**
   * Get all past customers for a business (customers who have completed bookings)
   */
  async getPastCustomers(businessId: string, ownerId: string): Promise<User[]> {
    const business = await this.businessRepository.findOne({
      where: { id: businessId, owner: { id: ownerId } },
    });

    if (!business) {
      throw new ForbiddenException('Business not found or you are not the owner');
    }

    // Get all unique customers who have completed bookings at this business
    const bookings = await this.bookingRepository.find({
      where: {
        business: { id: businessId },
        status: BookingStatus.COMPLETED,
      },
      relations: ['customer'],
      select: {
        customer: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
        },
      },
    });

    // Get unique customers
    const customerMap = new Map<string, User>();
    bookings.forEach(booking => {
      if (booking.customer && !customerMap.has(booking.customer.id as string)) {
        customerMap.set(booking.customer.id as string, booking.customer as User);
      }
    });

    return Array.from(customerMap.values());
  }

  /**
   * Send promotional offer to past customers
   */
  async sendPromotionalOffer(
    businessId: string,
    ownerId: string,
    customerIds: string[],
    subject: string,
    content: string,
    metadata?: { offerCode?: string; discount?: number; validUntil?: string },
  ): Promise<Message[]> {
    const business = await this.businessRepository.findOne({
      where: { id: businessId, owner: { id: ownerId } },
    });

    if (!business) {
      throw new ForbiddenException('Business not found or you are not the owner');
    }

    const messages: Message[] = [];

    for (const customerId of customerIds) {
      const customer = await this.userRepository.findOne({ where: { id: customerId } });
      if (!customer) continue;

      const message = this.messageRepository.create({
        recipient: { id: customerId } as any,
        business: { id: businessId } as any,
        sender: { id: ownerId } as any,
        type: MessageType.PROMOTIONAL_OFFER,
        subject,
        content,
        status: MessageStatus.UNREAD,
        metadata,
      });

      const savedMessage = await this.messageRepository.save(message);
      messages.push(savedMessage);

      // Send email notification
      await this.emailService.sendPromotionalOffer(
        customer.email,
        customer.firstName,
        business.name,
        subject,
        content,
        metadata,
      );
    }

    return messages;
  }

  /**
   * Get all messages for a user (invitations + promotional offers)
   */
  async getUserMessages(userId: string, status?: MessageStatus): Promise<Message[]> {
    const where: any = { recipient: { id: userId } };
    if (status) {
      where.status = status;
    }

    return this.messageRepository.find({
      where,
      relations: ['business', 'sender'],
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Get all messages for a user (paginated)
   */
  async getUserMessagesPaginated(
    userId: string,
    paginationDto: PaginationDto,
    status?: MessageStatus,
  ): Promise<PaginatedResult<Message>> {
    const { limit = 20, offset = 0, sortBy = 'createdAt', sortOrder = 'DESC' } = paginationDto;

    const queryBuilder = this.messageRepository
      .createQueryBuilder('message')
      .leftJoinAndSelect('message.business', 'business')
      .leftJoinAndSelect('message.sender', 'sender')
      .where('message.recipientId = :userId', { userId });

    if (status) {
      queryBuilder.andWhere('message.status = :status', { status });
    }

    queryBuilder.orderBy(`message.${sortBy}`, sortOrder);

    const total = await queryBuilder.getCount();
    queryBuilder.skip(offset).take(limit);

    const messages = await queryBuilder.getMany();

    return createPaginatedResponse(messages, total, limit, offset);
  }

  /**
   * Mark message as read
   */
  async markAsRead(messageId: string, userId: string): Promise<Message> {
    const message = await this.messageRepository.findOne({
      where: { id: messageId, recipient: { id: userId } },
    });

    if (!message) {
      throw new NotFoundException('Message not found');
    }

    message.status = MessageStatus.READ;
    return this.messageRepository.save(message);
  }

  /**
   * Archive message
   */
  async archiveMessage(messageId: string, userId: string): Promise<Message> {
    const message = await this.messageRepository.findOne({
      where: { id: messageId, recipient: { id: userId } },
    });

    if (!message) {
      throw new NotFoundException('Message not found');
    }

    message.status = MessageStatus.ARCHIVED;
    return this.messageRepository.save(message);
  }

  /**
   * Create team invitation message (called when business owner invites employee)
   */
  async createTeamInvitationMessage(
    recipientId: string,
    businessId: string,
    businessMemberId: string,
  ): Promise<Message> {
    const business = await this.businessRepository.findOne({
      where: { id: businessId },
      relations: ['owner'],
    });

    if (!business) {
      throw new NotFoundException('Business not found');
    }

    const message = this.messageRepository.create({
      recipient: { id: recipientId } as any,
      business: { id: businessId } as any,
      sender: { id: business.owner.id } as any,
      type: MessageType.TEAM_INVITATION,
      subject: `Team Invitation from ${business.name}`,
      content: `You have been invited to join ${business.name} as a team member.`,
      status: MessageStatus.UNREAD,
      metadata: {
        businessMemberId,
      },
    });

    return this.messageRepository.save(message);
  }

  /**
   * Send a chat message between customer and business
   */
  async sendChatMessage(
    senderId: string,
    businessId: string,
    content: string,
    bookingId?: string,
  ): Promise<Message> {
    console.log('[sendChatMessage] Starting:', { senderId, businessId, contentLength: content?.length, bookingId });
    
    // Validate content
    if (!content || !content.trim()) {
      throw new BadRequestException('Message content cannot be empty');
    }
    
    // Verify business exists
    const business = await this.businessRepository.findOne({
      where: { id: businessId },
      relations: ['owner'],
    });

    if (!business) {
      console.error('[sendChatMessage] Business not found:', businessId);
      throw new NotFoundException('Business not found');
    }

    if (!business.owner || !business.owner.id) {
      console.error('[sendChatMessage] Business owner not found:', { businessId, owner: business.owner });
      throw new BadRequestException('Business owner not found. This business may not be properly configured.');
    }

    // Verify sender
    const sender = await this.userRepository.findOne({ where: { id: senderId } });
    if (!sender) {
      throw new NotFoundException('User not found');
    }

    // Determine recipient:
    // - If sender is business owner/employee, recipient is the customer (we need customerId from booking or previous messages)
    // - If sender is customer, recipient is business owner
    const businessOwnerId = String(business.owner.id);
    const currentSenderId = String(senderId);
    const isBusinessOwner = businessOwnerId === currentSenderId;
    
    // Check if sender is employee
    const isEmployee = await this.businessMemberRepository.findOne({
      where: {
        business: { id: businessId },
        user: { id: senderId },
        status: BusinessMemberStatus.ACTIVE,
      } as any,
    }) !== null;

    console.log('[sendChatMessage] User role check:', {
      senderId: currentSenderId,
      businessOwnerId,
      isBusinessOwner,
      isEmployee,
      businessId,
    });

    let recipientId: string;

    if (isBusinessOwner || isEmployee) {
      // Business owner/employee sending to customer
      // If bookingId provided, get customer from booking
      if (bookingId) {
        const booking = await this.bookingRepository.findOne({
          where: { id: bookingId },
          relations: ['customer'],
        });
        if (!booking || !booking.customer) {
          throw new NotFoundException('Booking not found or has no customer');
        }
        recipientId = booking.customer.id as string;
      } else {
        // Get customer from conversation - use conversationId to find the customer
        // The conversationId format is: chat_customerId_businessOwnerId (sorted)
        // So we can extract the customer ID from existing messages
        const conversationId = this.generateConversationId('temp', businessOwnerId);
        
        // Find any message in this conversation to get the customer ID
        // We'll look for messages where the business owner is involved
        const conversationMessages = await this.messageRepository.find({
          where: [
            { business: { id: businessId }, type: MessageType.CHAT, sender: { id: businessOwnerId } },
            { business: { id: businessId }, type: MessageType.CHAT, recipient: { id: businessOwnerId } },
          ] as any,
          relations: ['sender', 'recipient'],
          order: { createdAt: 'DESC' },
          take: 20, // Get more messages to find a valid one
        });
        
        // Find a message where the business owner is involved and the other person is NOT the business owner
        let foundRecipient = false;
        for (const msg of conversationMessages) {
          const msgSenderId = String(msg.sender.id);
          const msgRecipientId = String(msg.recipient.id);
          const currentSenderId = String(senderId);
          const ownerId = String(businessOwnerId);
          
          // Skip messages where sender and recipient are the same (corrupted data)
          if (msgSenderId === msgRecipientId) {
            console.warn('[sendChatMessage] Skipping corrupted message with same sender/recipient:', msg.id);
            continue;
          }
          
          // CRITICAL: Ensure we never set recipient to the business owner
          // If business owner was the sender, recipient must be the customer (and NOT the owner)
          if (msgSenderId === ownerId && msgRecipientId !== ownerId && msgRecipientId !== currentSenderId) {
            recipientId = msgRecipientId;
            foundRecipient = true;
            console.log('[sendChatMessage] Found recipient from message where owner was sender:', {
              recipientId,
              messageId: msg.id,
              ownerId,
              currentSenderId,
            });
            break;
          }
          // If business owner was the recipient, sender must be the customer (and NOT the owner)
          if (msgRecipientId === ownerId && msgSenderId !== ownerId && msgSenderId !== currentSenderId) {
            recipientId = msgSenderId;
            foundRecipient = true;
            console.log('[sendChatMessage] Found recipient from message where owner was recipient:', {
              recipientId,
              messageId: msg.id,
              ownerId,
              currentSenderId,
            });
            break;
          }
        }
        
        // Final validation: ensure recipient is not the business owner
        if (foundRecipient && String(recipientId) === String(businessOwnerId)) {
          console.error('[sendChatMessage] ERROR: Found recipient is the business owner! Resetting...', {
            recipientId,
            businessOwnerId,
            senderId,
          });
          foundRecipient = false;
          recipientId = undefined as any;
        }
        
        if (!foundRecipient) {
          // No previous conversation - get the first customer with a booking for this business
          const firstBooking = await this.bookingRepository.findOne({
            where: {
              business: { id: businessId },
            },
            relations: ['customer'],
            order: { appointmentDate: 'DESC' },
          });
          
          if (!firstBooking || !firstBooking.customer) {
            throw new BadRequestException('Cannot determine recipient. No bookings found for this business. Please start the conversation from the customer side or specify a booking.');
          }
          
          recipientId = firstBooking.customer.id as string;
          console.log('[sendChatMessage] Using customer from first booking:', recipientId);
        }
      }
    } else {
      // Customer sending to business owner
      recipientId = String(business.owner.id);
      
      // Check if customer is trying to message their own business
      if (String(senderId) === String(business.owner.id)) {
        console.error('[sendChatMessage] Customer is trying to message their own business:', {
          senderId,
          businessId,
          businessOwnerId: business.owner.id,
        });
        throw new BadRequestException('You cannot message your own business.');
      }
      
      // Verify customer has a booking with this business
      const hasBooking = await this.bookingRepository.findOne({
        where: {
          customer: { id: senderId },
          business: { id: businessId },
        },
      });

      if (!hasBooking) {
        console.log('[sendChatMessage] Customer has no booking:', {
          senderId,
          businessId,
          recipientId,
        });
        throw new BadRequestException('You can only message businesses you have bookings with. Please make a booking first.');
      }
    }

    // CRITICAL: Ensure recipient is always different from sender
    if (String(recipientId) === String(senderId)) {
      console.error('[sendChatMessage] ERROR: Recipient ID equals Sender ID!', {
        senderId,
        recipientId,
        businessId,
        isBusinessOwner,
        isEmployee,
      });
      throw new BadRequestException('Cannot send message to yourself. Recipient must be different from sender.');
    }

    // Generate conversation ID (same for both directions)
    // Use customer ID and business owner ID for consistent conversation ID
    const customerId = isBusinessOwner || isEmployee ? recipientId : senderId;
    const conversationId = this.generateConversationId(customerId, business.owner.id as string);

    // Create message
    const message = this.messageRepository.create({
      sender: { id: senderId } as any,
      recipient: { id: recipientId } as any,
      business: { id: businessId } as any,
      type: MessageType.CHAT,
      subject: `Chat with ${business.name}`,
      content,
      status: MessageStatus.UNREAD,
      conversationId,
      bookingId: bookingId || undefined,
      metadata: bookingId ? { bookingId } : undefined,
    });

    const savedMessage = await this.messageRepository.save(message);

    // Reload the message with relations to verify it was saved correctly
    const verifiedMessage = await this.messageRepository.findOne({
      where: { id: savedMessage.id },
      relations: ['sender', 'recipient'],
    });

    // Debug logging
    console.log('[sendChatMessage] Message created:', {
      messageId: savedMessage.id,
      senderId,
      senderName: `${sender.firstName} ${sender.lastName}`,
      recipientId,
      recipientName: verifiedMessage?.recipient ? `${verifiedMessage.recipient.firstName} ${verifiedMessage.recipient.lastName}` : 'N/A',
      businessId,
      conversationId,
      content: content.substring(0, 50),
      verifiedSenderId: verifiedMessage?.sender?.id,
      verifiedRecipientId: verifiedMessage?.recipient?.id,
      senderMatches: String(verifiedMessage?.sender?.id) === String(senderId),
      recipientMatches: String(verifiedMessage?.recipient?.id) === String(recipientId),
    });

    if (verifiedMessage && String(verifiedMessage.sender.id) === String(verifiedMessage.recipient.id)) {
      console.error('[sendChatMessage] CRITICAL ERROR: Message saved with same sender and recipient!', {
        messageId: savedMessage.id,
        senderId: verifiedMessage.sender.id,
        recipientId: verifiedMessage.recipient.id,
      });
    }

    // Send push notification to recipient
    try {
      await this.pushNotificationService.sendToUser(
        recipientId,
        {
          title: isBusinessOwner || isEmployee 
            ? `${sender.firstName} ${sender.lastName}`
            : business.name,
          body: content.length > 100 ? content.substring(0, 100) + '...' : content,
          data: {
            type: 'chat_message',
            businessId,
            conversationId,
            messageId: savedMessage.id,
          },
          clickAction: `/chat/${businessId}`,
        },
        'messages',
      );
    } catch (error) {
      console.error('Failed to send push notification for chat message:', error);
      // Don't throw - notification failure shouldn't break message sending
    }

    return savedMessage;
  }

  /**
   * Get conversation between user and business
   */
  async getConversation(
    userId: string,
    businessId: string,
  ): Promise<Message[]> {
    // Get business owner ID for conversation ID
    const business = await this.businessRepository.findOne({
      where: { id: businessId },
      relations: ['owner'],
    });

    if (!business) {
      throw new NotFoundException('Business not found');
    }

    // Check if user is business owner or employee
    const isBusinessOwner = business.owner.id === userId;
    const isEmployee = await this.businessMemberRepository.findOne({
      where: {
        business: { id: businessId },
        user: { id: userId },
        status: BusinessMemberStatus.ACTIVE,
      } as any,
    }) !== null;

    // For business owners/employees, we need to find the customer ID from existing messages
    // For customers, use their own ID
    let customerId: string;
    if (isBusinessOwner || isEmployee) {
      // Find a message in this conversation to get the customer ID
      const businessOwnerId = business.owner.id as string;
      const tempConversationId = this.generateConversationId(userId, businessOwnerId);
      
      // Try to find any message in this conversation
      const sampleMessage = await this.messageRepository.findOne({
        where: [
          { conversationId: tempConversationId, sender: { id: businessOwnerId } },
          { conversationId: tempConversationId, recipient: { id: businessOwnerId } },
        ] as any,
        relations: ['sender', 'recipient'],
      });

      if (sampleMessage) {
        // Get the customer ID (whoever is not the business owner)
        customerId = sampleMessage.sender.id === businessOwnerId 
          ? sampleMessage.recipient.id as string
          : sampleMessage.sender.id as string;
      } else {
        // No messages yet, try to find from bookings
        const booking = await this.bookingRepository.findOne({
          where: { business: { id: businessId } },
          relations: ['customer'],
          order: { appointmentDate: 'DESC' },
        });
        customerId = booking?.customer?.id as string || userId;
      }
    } else {
      customerId = userId;
    }

    // Generate conversation ID using customer ID and business owner ID
    const conversationId = this.generateConversationId(customerId, business.owner.id as string);

    const messages = await this.messageRepository.find({
      where: [
        { conversationId, sender: { id: userId } },
        { conversationId, recipient: { id: userId } },
      ] as any,
      relations: ['sender', 'recipient', 'business'],
      order: { createdAt: 'ASC' },
      select: {
        sender: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          avatar: true,
        },
        recipient: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          avatar: true,
        },
        business: {
          id: true,
          name: true,
        },
      },
    });

    // Debug logging
    console.log('[getConversation] Debug:', {
      userId,
      businessId,
      customerId,
      businessOwnerId: business.owner.id,
      conversationId,
      messageCount: messages.length,
      messages: messages.map(msg => ({
        id: msg.id,
        senderId: msg.sender?.id,
        senderName: msg.sender ? `${msg.sender.firstName} ${msg.sender.lastName}` : 'N/A',
        recipientId: msg.recipient?.id,
        recipientName: msg.recipient ? `${msg.recipient.firstName} ${msg.recipient.lastName}` : 'N/A',
        content: msg.content.substring(0, 30),
        isUserSender: String(msg.sender?.id) === String(userId),
        isUserRecipient: String(msg.recipient?.id) === String(userId),
      })),
    });

    return messages;
  }

  /**
   * Get all conversations for a user (list of businesses they've chatted with)
   * For business owners/employees: group by customer
   * For customers: group by business
   */
  async getConversations(userId: string, userRole?: string): Promise<Array<{
    business: Business;
    lastMessage: Message;
    unreadCount: number;
    customer?: User;
  }>> {
    // Get all unique conversations for this user
    const conversations = await this.messageRepository
      .createQueryBuilder('message')
      .leftJoinAndSelect('message.business', 'business')
      .leftJoinAndSelect('business.owner', 'owner')
      .leftJoinAndSelect('message.sender', 'sender')
      .leftJoinAndSelect('message.recipient', 'recipient')
      .where('message.type = :type', { type: MessageType.CHAT })
      .andWhere('(message.sender.id = :userId OR message.recipient.id = :userId)', { userId })
      .orderBy('message.createdAt', 'DESC')
      .getMany();

    // For business owners/employees, group by customer instead of business
    if (userRole === 'business_owner' || userRole === 'employee') {
      // Get user's business
      let userBusiness: Business | null = null;
      
      if (userRole === 'business_owner') {
        userBusiness = await this.businessRepository.findOne({
          where: { owner: { id: userId } },
          relations: ['owner'],
        });
      } else {
        // For employees, find their business membership
        const membership = await this.businessMemberRepository.findOne({
          where: { 
            user: { id: userId }, 
            status: BusinessMemberStatus.ACTIVE 
          },
          relations: ['business'],
        });
        userBusiness = membership?.business || null;
      }

      if (!userBusiness) {
        return [];
      }

      // Filter messages for this business and group by customer
      const conversationMap = new Map<string, {
        business: Business;
        lastMessage: Message;
        unreadCount: number;
        customer: User;
      }>();

      const businessMessages = conversations.filter((message) => message.business.id === userBusiness.id);
      
      // Debug logging
      console.log('[getConversations] Business owner/employee:', {
        userId,
        userRole,
        businessId: userBusiness.id,
        totalMessages: conversations.length,
        businessMessages: businessMessages.length,
      });
      
      businessMessages.forEach((message) => {
          // Determine the customer (the other user in the conversation)
          const customer = String(message.sender.id) === String(userId) ? message.recipient : message.sender;
          const customerId = String(customer.id);
          
          if (!conversationMap.has(customerId)) {
            conversationMap.set(customerId, {
              business: message.business,
              lastMessage: message,
              unreadCount: 0,
              customer: customer,
            });
          }

          const conv = conversationMap.get(customerId)!;
          
          // Update last message if this one is newer
          if (new Date(message.createdAt) > new Date(conv.lastMessage.createdAt)) {
            conv.lastMessage = message;
          }

          // Count unread messages where user is recipient
          if (message.recipient.id === userId && message.status === MessageStatus.UNREAD) {
            conv.unreadCount++;
          }
        });

      return Array.from(conversationMap.values());
    }

    // For customers, group by business (original behavior)
    const conversationMap = new Map<string, {
      business: Business;
      lastMessage: Message;
      unreadCount: number;
    }>();

    conversations.forEach((message) => {
      const businessId = message.business.id;
      
      if (!conversationMap.has(businessId)) {
        conversationMap.set(businessId, {
          business: message.business,
          lastMessage: message,
          unreadCount: 0,
        });
      }

      const conv = conversationMap.get(businessId)!;
      
      // Update last message if this one is newer
      if (new Date(message.createdAt) > new Date(conv.lastMessage.createdAt)) {
        conv.lastMessage = message;
      }

      // Count unread messages where user is recipient
      if (message.recipient.id === userId && message.status === MessageStatus.UNREAD) {
        conv.unreadCount++;
      }
    });

    return Array.from(conversationMap.values());
  }

  /**
   * Mark all messages in a conversation as read
   */
  async markConversationAsRead(
    userId: string,
    businessId: string,
  ): Promise<void> {
    const business = await this.businessRepository.findOne({
      where: { id: businessId },
      relations: ['owner'],
    });

    if (!business) {
      throw new NotFoundException('Business not found');
    }

    const conversationId = this.generateConversationId(userId, business.owner.id as string);

    await this.messageRepository.update(
      {
        conversationId,
        recipient: { id: userId },
        status: MessageStatus.UNREAD,
      } as any,
      { status: MessageStatus.READ },
    );
  }

  /**
   * Generate conversation ID (same for both directions)
   */
  private generateConversationId(userId: string, businessOwnerId: string): string {
    // Sort IDs to ensure same conversation ID regardless of direction
    const ids = [userId, businessOwnerId].sort();
    return `chat_${ids[0]}_${ids[1]}`;
  }

  /**
   * Clean up old chat messages to save database space
   * Archives messages older than the specified days (default: 90 days)
   * Deletes archived messages older than the specified days (default: 180 days)
   */
  async cleanupOldMessages(
    archiveAfterDays: number = 90,
    deleteAfterDays: number = 180,
  ): Promise<{ archived: number; deleted: number }> {
    const now = new Date();
    const archiveDate = new Date(now.getTime() - archiveAfterDays * 24 * 60 * 60 * 1000);
    const deleteDate = new Date(now.getTime() - deleteAfterDays * 24 * 60 * 60 * 1000);

    // Archive old chat messages (not already archived)
    const archiveResult = await this.messageRepository.update(
      {
        type: MessageType.CHAT,
        status: MessageStatus.READ,
        createdAt: LessThan(archiveDate),
      },
      { status: MessageStatus.ARCHIVED },
    );

    // Delete very old archived chat messages
    const deleteResult = await this.messageRepository.delete({
      type: MessageType.CHAT,
      status: MessageStatus.ARCHIVED,
      createdAt: LessThan(deleteDate),
    });

    return {
      archived: archiveResult.affected || 0,
      deleted: deleteResult.affected || 0,
    };
  }

  /**
   * Delete all chat messages related to a specific booking
   * Called when a booking is completed or cancelled
   */
  async deleteMessagesForBooking(bookingId: string): Promise<number> {
    const result = await this.messageRepository.delete({
      bookingId,
      type: MessageType.CHAT,
    });

    return result.affected || 0;
  }

  /**
   * Delete messages for bookings that have ended (appointment date in the past)
   * This is called by a scheduled job to clean up messages for past bookings
   * Note: This requires checking booking end dates, which would need booking repository access
   * For now, we'll rely on deleteMessagesForBooking being called when bookings are completed/cancelled
   */
  async deleteMessagesForPastBookings(): Promise<number> {
    // This method can be enhanced later to check booking end dates
    // For now, messages are deleted when bookings are completed/cancelled via deleteMessagesForBooking
    return 0;
  }

  /**
   * Clean up old promotional offers and team invitations (optional)
   * These are kept longer than chat messages as they may be important records
   */
  async cleanupOldSystemMessages(
    deleteAfterDays: number = 365, // Keep for 1 year
  ): Promise<number> {
    const deleteDate = new Date(
      new Date().getTime() - deleteAfterDays * 24 * 60 * 60 * 1000,
    );

    const deleteResult = await this.messageRepository.delete({
      type: MessageType.PROMOTIONAL_OFFER,
      status: MessageStatus.ARCHIVED,
      createdAt: LessThan(deleteDate),
    });

    const deleteResult2 = await this.messageRepository.delete({
      type: MessageType.TEAM_INVITATION,
      status: MessageStatus.ARCHIVED,
      createdAt: LessThan(deleteDate),
    });

    return (deleteResult.affected || 0) + (deleteResult2.affected || 0);
  }
}

