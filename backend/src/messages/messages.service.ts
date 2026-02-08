import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan, Not, IsNull, In, DataSource } from 'typeorm';
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
    private dataSource: DataSource,
  ) {}

  /**
   * Get all past customers for a business (anyone who has a booking: pending, confirmed, completed, no_show — not cancelled).
   * Allowed for business owner or active business members (employees).
   */
  async getPastCustomers(businessId: string, userId: string): Promise<User[]> {
    const business = await this.businessRepository.findOne({
      where: { id: businessId },
      relations: ['owner'],
    });

    if (!business) {
      throw new NotFoundException('Business not found');
    }

    const isOwner = String(business.owner?.id ?? '') === String(userId ?? '');
    const isMember = !isOwner && (await this.businessMemberRepository.findOne({
      where: {
        business: { id: businessId },
        user: { id: userId },
        status: BusinessMemberStatus.ACTIVE,
      } as any,
    })) !== null;
    if (!isOwner && !isMember) {
      throw new ForbiddenException('You do not have access to this business');
    }

    // Get distinct customer IDs from all non-cancelled bookings; join on business relation so filtering is reliable
    const statuses = [
      BookingStatus.PENDING,
      BookingStatus.CONFIRMED,
      BookingStatus.COMPLETED,
      BookingStatus.NO_SHOW,
    ];
    const rows = await this.bookingRepository
      .createQueryBuilder('booking')
      .innerJoin('booking.customer', 'customer')
      .innerJoin('booking.business', 'biz')
      .where('biz.id = :businessId', { businessId })
      .andWhere('booking.status IN (:...statuses)', { statuses })
      .select('customer.id', 'customerId')
      .distinct(true)
      .getRawMany();

    const customerIds = (rows || [])
      .map((r: { customerId?: string }) => r.customerId)
      .filter((id): id is string => !!id);

    if (customerIds.length === 0) {
      return [];
    }

    return this.userRepository.find({
      where: { id: In(customerIds) },
      select: ['id', 'firstName', 'lastName', 'email', 'phone'],
      order: { lastName: 'ASC', firstName: 'ASC' },
    });
  }

  /**
   * Send promotional offer to past customers. Allowed for business owner or active business members.
   * Message sender is always the business owner so the offer is from the business.
   */
  async sendPromotionalOffer(
    businessId: string,
    userId: string,
    customerIds: string[],
    subject: string,
    content: string,
    metadata?: { offerCode?: string; discount?: number; validUntil?: string },
  ): Promise<Message[]> {
    const business = await this.businessRepository.findOne({
      where: { id: businessId },
      relations: ['owner'],
    });

    if (!business) {
      throw new NotFoundException('Business not found');
    }

    const isOwner = String(business.owner?.id ?? '') === String(userId ?? '');
    const isMember = !isOwner && (await this.businessMemberRepository.findOne({
      where: {
        business: { id: businessId },
        user: { id: userId },
        status: BusinessMemberStatus.ACTIVE,
      } as any,
    })) !== null;
    if (!isOwner && !isMember) {
      throw new ForbiddenException('You do not have access to this business');
    }

    const senderId = business.owner?.id ?? userId;

    const messages: Message[] = [];

    for (const customerId of customerIds) {
      const customer = await this.userRepository.findOne({ where: { id: customerId } });
      if (!customer) continue;

      const message = this.messageRepository.create({
        recipient: { id: customerId } as any,
        business: { id: businessId } as any,
        sender: { id: senderId } as any,
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
    customMessage?: string,
  ): Promise<Message> {
    const business = await this.businessRepository.findOne({
      where: { id: businessId },
      relations: ['owner'],
    });

    if (!business) {
      throw new NotFoundException('Business not found');
    }

    let content = `You have been invited to join ${business.name} as a team member.`;
    if (customMessage?.trim()) {
      content += `\n\nMessage from the owner:\n${customMessage.trim()}`;
    }

    const message = this.messageRepository.create({
      recipient: { id: recipientId } as any,
      business: { id: businessId } as any,
      sender: { id: business.owner.id } as any,
      type: MessageType.TEAM_INVITATION,
      subject: `Team Invitation from ${business.name}`,
      content,
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
    // DEBUG: Log incoming parameters
    console.log('[sendChatMessage] Called with:', {
      senderId,
      businessId,
      contentLength: content?.length,
      bookingId,
    });

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
      throw new NotFoundException('Business not found');
    }

    if (!business.owner || !business.owner.id) {
      throw new BadRequestException('Business owner not found. This business may not be properly configured.');
    }

    // Verify sender
    const sender = await this.userRepository.findOne({ where: { id: senderId } });
    if (!sender) {
      throw new NotFoundException('User not found');
    }

    // DEBUG: Log sender info
    console.log('[sendChatMessage] Sender verified:', {
      senderId: sender.id,
      senderName: `${sender.firstName} ${sender.lastName}`,
      senderEmail: sender.email,
    });

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
        // We'll look for messages where the business owner OR current employee is involved
        // CRITICAL: Use raw SQL to get messages to avoid TypeORM relation issues
        const conversationQuery = `
          SELECT m.id, m."senderId", m."recipientId", m."createdAt"
          FROM messages m
          WHERE m."businessId" = $1
            AND m.type = $2
            AND (
              m."senderId" = $3 OR m."recipientId" = $3 OR
              m."senderId" = $4 OR m."recipientId" = $4
            )
          ORDER BY m."createdAt" DESC
          LIMIT 20
        `;
        const conversationMessagesRaw = await this.dataSource.query(conversationQuery, [
          businessId,
          MessageType.CHAT,
          businessOwnerId,
          senderId,
        ]);
        
        console.log('[sendChatMessage] Found previous messages for recipient lookup:', {
          messageCount: conversationMessagesRaw.length,
          messages: conversationMessagesRaw.map((m: any) => ({
            id: m.id,
            senderId: m.senderId,
            recipientId: m.recipientId,
          })),
        });
        
        // Find a message where business staff (owner or employee) is involved and extract the customer
        let foundRecipient = false;
        const currentSenderId = String(senderId);
        const ownerId = String(businessOwnerId);
        
        for (const msg of conversationMessagesRaw) {
          const msgSenderId = String(msg.senderId);
          const msgRecipientId = String(msg.recipientId);

          // Skip messages where sender and recipient are the same (corrupted data)
          if (msgSenderId === msgRecipientId) {
            console.log('[sendChatMessage] Skipping corrupted message:', { messageId: msg.id });
            continue;
          }

          // If current sender (owner or employee) was the sender, recipient is the customer
          if (msgSenderId === currentSenderId && msgRecipientId !== ownerId && msgRecipientId !== currentSenderId) {
            recipientId = msgRecipientId;
            foundRecipient = true;
            console.log('[sendChatMessage] Found recipient from previous message where current sender was sender:', {
              recipientId,
              messageId: msg.id,
            });
            break;
          }
          // If current sender (owner or employee) was the recipient, sender is the customer
          if (msgRecipientId === currentSenderId && msgSenderId !== ownerId && msgSenderId !== currentSenderId) {
            recipientId = msgSenderId;
            foundRecipient = true;
            console.log('[sendChatMessage] Found recipient from previous message where current sender was recipient:', {
              recipientId,
              messageId: msg.id,
            });
            break;
          }
          // Fallback: If business owner was involved and current sender is employee
          if (isEmployee) {
            if (msgSenderId === ownerId && msgRecipientId !== ownerId && msgRecipientId !== currentSenderId) {
              recipientId = msgRecipientId;
              foundRecipient = true;
              console.log('[sendChatMessage] Found recipient from owner message (employee fallback):', {
                recipientId,
                messageId: msg.id,
              });
              break;
            }
            if (msgRecipientId === ownerId && msgSenderId !== ownerId && msgSenderId !== currentSenderId) {
              recipientId = msgSenderId;
              foundRecipient = true;
              console.log('[sendChatMessage] Found recipient from owner message (employee fallback 2):', {
                recipientId,
                messageId: msg.id,
              });
              break;
            }
          }
        }

        // Final validation: ensure recipient is not the business owner
        if (foundRecipient && String(recipientId) === String(businessOwnerId)) {
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
        }
      }
    } else {
      // Customer sending to business owner
      // CRITICAL: Customer is the sender, business owner is the recipient
      recipientId = String(business.owner.id);

      console.log('[sendChatMessage] Customer sending message:', {
        customerSenderId: senderId,
        businessOwnerRecipientId: recipientId,
        businessOwnerId: business.owner.id,
      });

      // Check if customer is trying to message their own business
      if (String(senderId) === String(business.owner.id)) {
        throw new BadRequestException('You cannot message your own business.');
      }
      
      // Optional: Verify customer has a booking with this business
      // Commented out to allow messaging without booking requirement
      /*
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
      */

    }

    // CRITICAL: Ensure recipient is always different from sender
    if (String(recipientId) === String(senderId)) {
      throw new BadRequestException('Cannot send message to yourself. Recipient must be different from sender.');
    }

    // Generate conversation ID (same for both directions)
    // Use customer ID and business owner ID for consistent conversation ID
    const customerId = isBusinessOwner || isEmployee ? recipientId : senderId;
    const conversationId = this.generateConversationId(customerId, business.owner.id as string);

    // CRITICAL: Ensure senderId is the ACTUAL sender (the person calling this function)
    // Do NOT swap or change senderId under any circumstances
    const actualSenderId = String(senderId);
    const actualRecipientId = String(recipientId);

    // CRITICAL: Log before setting actualSenderId/actualRecipientId to catch any swapping
    console.log('[sendChatMessage] Setting actualSenderId and actualRecipientId:', {
      originalSenderId: senderId,
      originalRecipientId: recipientId,
      actualSenderId,
      actualRecipientId,
      senderIsBusinessOwner: String(senderId) === String(business.owner.id),
      senderIsEmployee: isEmployee,
      senderIsCustomer: !isBusinessOwner && !isEmployee,
    });

    // CRITICAL VALIDATION: Ensure sender and recipient are different
    if (actualSenderId === actualRecipientId) {
      console.error('[sendChatMessage] CRITICAL ERROR: Sender and recipient are the same!', {
        senderId: actualSenderId,
        recipientId: actualRecipientId,
      });
      throw new BadRequestException('Sender and recipient cannot be the same.');
    }

    // CRITICAL VALIDATION: If sender is customer, recipient MUST be business owner
    if (!isBusinessOwner && !isEmployee) {
      if (actualRecipientId !== String(business.owner.id)) {
        console.error('[sendChatMessage] CRITICAL ERROR: Customer sender but recipient is not business owner!', {
          senderId: actualSenderId,
          recipientId: actualRecipientId,
          businessOwnerId: business.owner.id,
        });
        throw new BadRequestException('Customer messages must be sent to business owner.');
      }
    }

    // CRITICAL VALIDATION: Verify sender entity ID matches the senderId parameter
    if (String(sender.id) !== actualSenderId) {
      console.error('[sendChatMessage] CRITICAL ERROR: Sender entity ID mismatch!', {
        expectedSenderId: actualSenderId,
        actualSenderEntityId: sender.id,
        senderEntityName: `${sender.firstName} ${sender.lastName}`,
      });
      throw new BadRequestException('Sender ID mismatch. This should never happen.');
    }

    // DEBUG: Log before creating message
    console.log('[sendChatMessage] Creating message with:', {
      actualSenderId,
      actualRecipientId,
      senderEntityId: sender.id,
      senderName: `${sender.firstName} ${sender.lastName}`,
      businessId,
      conversationId,
    });

    // Verify recipient user exists and load full object
    const recipient = await this.userRepository.findOne({ where: { id: actualRecipientId } });
    if (!recipient) {
      throw new NotFoundException(`Recipient user not found: ${actualRecipientId}`);
    }

    // CRITICAL VALIDATION: Verify recipient entity ID matches
    if (String(recipient.id) !== actualRecipientId) {
      console.error('[sendChatMessage] CRITICAL ERROR: Recipient entity ID mismatch!', {
        expectedRecipientId: actualRecipientId,
        actualRecipientEntityId: recipient.id,
        recipientEntityName: `${recipient.firstName} ${recipient.lastName}`,
      });
      throw new BadRequestException('Recipient ID mismatch. This should never happen.');
    }

    console.log('[sendChatMessage] Recipient verified:', {
      recipientId: recipient.id,
      recipientName: `${recipient.firstName} ${recipient.lastName}`,
    });

    // CRITICAL: Re-verify sender one more time before creating message
    // Reload sender to ensure we have the latest data
    const verifiedSender = await this.userRepository.findOne({ where: { id: actualSenderId } });
    if (!verifiedSender) {
      throw new NotFoundException(`Sender user not found: ${actualSenderId}`);
    }
    if (String(verifiedSender.id) !== actualSenderId) {
      throw new BadRequestException('Sender verification failed');
    }

    // CRITICAL: Verify sender name matches expected
    console.log('[sendChatMessage] Final sender verification:', {
      verifiedSenderId: verifiedSender.id,
      verifiedSenderName: `${verifiedSender.firstName} ${verifiedSender.lastName}`,
      expectedSenderId: actualSenderId,
      expectedSenderName: `${sender.firstName} ${sender.lastName}`,
      idsMatch: String(verifiedSender.id) === actualSenderId,
      namesMatch: `${verifiedSender.firstName} ${verifiedSender.lastName}` === `${sender.firstName} ${sender.lastName}`,
    });

    // CRITICAL FINAL VALIDATION: Ensure senderId hasn't been modified
    // Re-check against the original senderId parameter one more time
    if (String(actualSenderId) !== String(senderId)) {
      console.error('[sendChatMessage] ❌❌❌ CRITICAL: actualSenderId was modified!', {
        originalSenderId: senderId,
        currentActualSenderId: actualSenderId,
        verifiedSenderId: verifiedSender.id,
      });
      throw new BadRequestException('Sender ID was modified during processing. This should never happen.');
    }

    // CRITICAL: Use raw SQL insert to ensure exact senderId and recipientId are used
    // This completely bypasses TypeORM's relation resolution
    console.log('[sendChatMessage] Inserting message with raw SQL:', {
      originalSenderId: senderId,
      actualSenderId,
      actualRecipientId,
      businessId,
      conversationId,
      verifiedSenderName: `${verifiedSender.firstName} ${verifiedSender.lastName}`,
      verifiedSenderId: verifiedSender.id,
      senderIdsMatch: String(actualSenderId) === String(senderId) && String(actualSenderId) === String(verifiedSender.id),
    });

    const metadataJson = bookingId ? JSON.stringify({ bookingId }) : null;
    
    // CRITICAL: Column order MUST match database schema:
    // recipientId, businessId, senderId, type, subject, content, status, conversationId, bookingId, metadata
    const insertQuery = `
      INSERT INTO messages (
        "recipientId", 
        "businessId", 
        "senderId", 
        type, 
        subject, 
        content, 
        status, 
        "conversationId", 
        "bookingId", 
        metadata,
        "createdAt",
        "updatedAt"
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())
      RETURNING id
    `;

    const sqlParams = [
      actualRecipientId,        // $1: recipientId - MUST be first to match schema
      businessId,               // $2: businessId
      actualSenderId,           // $3: senderId - MUST be third to match schema
      MessageType.CHAT,         // $4: type
      `Chat with ${business.name}`, // $5: subject
      content,                  // $6: content
      MessageStatus.UNREAD,     // $7: status
      conversationId,          // $8: conversationId
      bookingId || null,        // $9: bookingId
      metadataJson,             // $10: metadata
    ];

    // CRITICAL: Log exact SQL parameters before execution
    // NOTE: Column order is recipientId, businessId, senderId (matching DB schema)
    console.log('[sendChatMessage] SQL Parameters (matching DB column order):', {
      param1_recipientId: sqlParams[0],  // recipientId (first column in DB)
      param2_businessId: sqlParams[1],   // businessId
      param3_senderId: sqlParams[2],     // senderId (third column in DB)
      param4_type: sqlParams[3],
      param5_subject: sqlParams[4],
      param6_content: sqlParams[5]?.substring(0, 50),
      param7_status: sqlParams[6],
      param8_conversationId: sqlParams[7],
      param9_bookingId: sqlParams[8],
      param10_metadata: sqlParams[9],
      originalSenderId: senderId,
      actualSenderId,
      actualRecipientId,
      senderIdInParams: sqlParams[2],  // Should be actualSenderId
      recipientIdInParams: sqlParams[0], // Should be actualRecipientId
      senderIdsMatch: String(sqlParams[2]) === String(senderId),
      recipientIdsMatch: String(sqlParams[0]) === String(actualRecipientId),
    });

    const insertResult = await this.dataSource.query(insertQuery, sqlParams);

    const savedMessageId = insertResult[0]?.id;
    
    if (!savedMessageId) {
      throw new BadRequestException('Failed to save message - no ID returned');
    }

    console.log('[sendChatMessage] Message inserted with ID:', savedMessageId);

    // CRITICAL: Verify what was actually inserted in the database using raw SQL
    const verifyQuery = `
      SELECT id, "senderId", "recipientId", content, "createdAt"
      FROM messages
      WHERE id = $1
    `;
    const dbResult = await this.dataSource.query(verifyQuery, [savedMessageId]);
    
    if (dbResult && dbResult[0]) {
      const dbSenderId = String(dbResult[0].senderId);
      const dbRecipientId = String(dbResult[0].recipientId);
      
      console.log('[sendChatMessage] Direct database query result:', {
        messageId: dbResult[0].id,
        dbSenderId,
        dbRecipientId,
        expectedSenderId: actualSenderId,
        expectedRecipientId: actualRecipientId,
        senderIdMatches: dbSenderId === actualSenderId,
        recipientIdMatches: dbRecipientId === actualRecipientId,
        content: dbResult[0].content,
      });

      if (dbSenderId !== actualSenderId) {
        console.error('[sendChatMessage] ❌❌❌ CRITICAL: Database has WRONG senderId!', {
          expected: actualSenderId,
          actualInDB: dbSenderId,
          messageId: savedMessageId,
        });
      }
    }

    // Load the saved message with relations to verify
    const savedMessage = await this.messageRepository.findOne({
      where: { id: savedMessageId },
      relations: ['sender', 'recipient'],
    });

    if (!savedMessage) {
      throw new BadRequestException('Failed to load saved message');
    }

    // DEBUG: Verify saved message via TypeORM
    const verifyMessage = savedMessage;

    if (verifyMessage) {
      const savedSenderId = String(verifyMessage.sender?.id);
      const savedRecipientId = String(verifyMessage.recipient?.id);
      
      console.log('[sendChatMessage] Message saved and verified:', {
        messageId: verifyMessage.id,
        savedSenderId,
        savedSenderName: verifyMessage.sender ? `${verifyMessage.sender.firstName} ${verifyMessage.sender.lastName}` : 'N/A',
        savedRecipientId,
        savedRecipientName: verifyMessage.recipient ? `${verifyMessage.recipient.firstName} ${verifyMessage.recipient.lastName}` : 'N/A',
        content: verifyMessage.content,
        expectedSenderId: actualSenderId,
        expectedRecipientId: actualRecipientId,
        senderMatches: savedSenderId === actualSenderId,
        recipientMatches: savedRecipientId === actualRecipientId,
      });

      // CRITICAL: If the saved message has wrong sender/recipient, log error
      if (savedSenderId !== actualSenderId) {
        console.error('[sendChatMessage] ❌❌❌ CRITICAL ERROR: Saved message has WRONG sender!', {
          expectedSenderId: actualSenderId,
          actualSavedSenderId: savedSenderId,
          messageId: verifyMessage.id,
        });
      }

      if (savedRecipientId !== actualRecipientId) {
        console.error('[sendChatMessage] ❌❌❌ CRITICAL ERROR: Saved message has WRONG recipient!', {
          expectedRecipientId: actualRecipientId,
          actualSavedRecipientId: savedRecipientId,
          messageId: verifyMessage.id,
        });
      }
    } else {
      console.error('[sendChatMessage] ERROR: Could not verify saved message!');
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
    console.log('[getConversation] Called with:', { userId, businessId });

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

    // For business owners/employees, we need to find ALL messages for this business
    // For customers, find messages between customer and business owner
    const businessOwnerId = business.owner.id as string;

    let messages: Message[];

    if (isBusinessOwner || isEmployee) {
      // Business owner/employee: Get ALL chat messages for this business
      messages = await this.messageRepository.find({
        where: {
          business: { id: businessId },
          type: MessageType.CHAT,
        },
        relations: ['sender', 'recipient', 'business'],
        order: { createdAt: 'ASC' },
      });
    } else {
      // Customer: Get messages in their conversation with business owner
      const conversationId = this.generateConversationId(userId, businessOwnerId);

      messages = await this.messageRepository.find({
        where: {
          conversationId,
          type: MessageType.CHAT,
        },
        relations: ['sender', 'recipient', 'business'],
        order: { createdAt: 'ASC' },
      });
    }

    // DEBUG: Log retrieved messages
    console.log(`[getConversation] Retrieved ${messages.length} messages`);
    messages.slice(-3).forEach((msg, idx) => {
      console.log(`[getConversation] Last ${messages.length - idx} messages - Message ${msg.id}:`, {
        senderId: msg.sender?.id,
        senderName: msg.sender ? `${msg.sender.firstName} ${msg.sender.lastName}` : 'N/A',
        recipientId: msg.recipient?.id,
        recipientName: msg.recipient ? `${msg.recipient.firstName} ${msg.recipient.lastName}` : 'N/A',
        content: msg.content,
        createdAt: msg.createdAt,
      });
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
   * Mark all messages in a conversation as read.
   * For customers: conversation is with business owner (userId = customer, other = owner).
   * For business owners/employees: conversation is with a customer; customerId must be passed.
   */
  async markConversationAsRead(
    userId: string,
    businessId: string,
    customerId?: string,
  ): Promise<void> {
    const business = await this.businessRepository.findOne({
      where: { id: businessId },
      relations: ['owner'],
    });

    if (!business) {
      throw new NotFoundException('Business not found');
    }

    const ownerId = business.owner.id as string;
    // For owner/employee viewing a customer chat, conversationId is (customerId, ownerId)
    const conversationId = customerId
      ? this.generateConversationId(customerId, ownerId)
      : this.generateConversationId(userId, ownerId);

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
   * Create a system notification message from BUKKi
   * Used for automated platform notifications (e.g., business suspension, important updates)
   */
  async createSystemNotification(
    recipientId: string,
    subject: string,
    content: string,
    metadata?: any,
  ): Promise<Message> {
    const recipient = await this.userRepository.findOne({
      where: { id: recipientId },
    });

    if (!recipient) {
      throw new NotFoundException('Recipient not found');
    }

    const message = this.messageRepository.create({
      recipient,
      sender: null, // System message - no sender (displays as "BUKKi System")
      business: null,
      type: MessageType.SYSTEM_NOTIFICATION,
      subject,
      content,
      status: MessageStatus.UNREAD,
      metadata,
    });

    const savedMessage = await this.messageRepository.save(message);

    // Send push notification for system messages
    try {
      await this.pushNotificationService.sendToUser(
        recipientId,
        {
          title: subject,
          body: content,
        },
      );
    } catch (error) {
      // Don't throw - notification failure shouldn't break message sending
    }

    return savedMessage;
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

