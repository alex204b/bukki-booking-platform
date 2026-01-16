import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { ChatMessage, MessageStatus, MessageType } from './entities/chat-message.entity';
import { Conversation } from './entities/conversation.entity';
import { ConversationService } from './conversation.service';

@Injectable()
export class ChatService {
  constructor(
    @InjectRepository(ChatMessage)
    private chatMessageRepository: Repository<ChatMessage>,
    @InjectRepository(Conversation)
    private conversationRepository: Repository<Conversation>,
    private conversationService: ConversationService,
  ) {}

  async sendMessage(
    conversationId: string,
    senderId: string,
    content: string,
    messageType: MessageType = MessageType.TEXT,
    metadata?: any,
  ): Promise<ChatMessage> {
    // Verify conversation exists and user has access
    const conversation = await this.conversationRepository.findOne({
      where: { id: conversationId },
      relations: ['customer', 'businessOwner'],
    });

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    // Verify sender is part of conversation
    if (conversation.customerId !== senderId && conversation.businessOwnerId !== senderId) {
      throw new ForbiddenException('You are not part of this conversation');
    }

    // Create message
    const message = this.chatMessageRepository.create({
      conversationId,
      senderId,
      content,
      messageType,
      status: MessageStatus.SENT,
      metadata,
    });

    const savedMessage = await this.chatMessageRepository.save(message);

    // Load sender relation
    const messageWithSender = await this.chatMessageRepository.findOne({
      where: { id: savedMessage.id },
      relations: ['sender'],
    });

    // Update conversation's last message
    await this.conversationService.updateLastMessage(
      conversationId,
      savedMessage.id,
      content.substring(0, 100),
    );

    // Increment unread count for recipient
    const isFromCustomer = senderId === conversation.customerId;
    if (isFromCustomer) {
      await this.conversationRepository.update(conversationId, {
        businessUnreadCount: () => 'business Unread_count + 1',
      });
    } else {
      await this.conversationRepository.update(conversationId, {
        customerUnreadCount: () => '"customerUnreadCount" + 1',
      });
    }

    return messageWithSender;
  }

  async getConversationMessages(
    conversationId: string,
    userId: string,
    limit: number = 50,
    offset: number = 0,
  ): Promise<{ messages: ChatMessage[]; total: number }> {
    // Verify user has access to conversation
    const conversation = await this.conversationRepository.findOne({
      where: { id: conversationId },
    });

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    if (conversation.customerId !== userId && conversation.businessOwnerId !== userId) {
      throw new ForbiddenException('You do not have access to this conversation');
    }

    const [messages, total] = await this.chatMessageRepository.findAndCount({
      where: { conversationId },
      relations: ['sender'],
      order: { createdAt: 'DESC' },
      take: limit,
      skip: offset,
    });

    return {
      messages: messages.reverse(), // Reverse to show oldest first
      total,
    };
  }

  async markMessagesAsRead(
    conversationId: string,
    messageIds: string[],
    userId: string,
  ): Promise<void> {
    // Verify user has access
    const conversation = await this.conversationRepository.findOne({
      where: { id: conversationId },
    });

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    if (conversation.customerId !== userId && conversation.businessOwnerId !== userId) {
      throw new ForbiddenException('You do not have access to this conversation');
    }

    // Update message statuses
    await this.chatMessageRepository.update(
      {
        id: In(messageIds),
        conversationId,
      },
      {
        status: MessageStatus.READ,
      },
    );

    // Reset unread count for this user
    const isCustomer = userId === conversation.customerId;
    if (isCustomer) {
      await this.conversationRepository.update(conversationId, {
        customerUnreadCount: 0,
      });
    } else {
      await this.conversationRepository.update(conversationId, {
        businessUnreadCount: 0,
      });
    }
  }

  async markConversationAsRead(conversationId: string, userId: string): Promise<void> {
    const conversation = await this.conversationRepository.findOne({
      where: { id: conversationId },
    });

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    // Get all unread messages from this conversation for this user
    const messages = await this.chatMessageRepository.find({
      where: {
        conversationId,
        status: MessageStatus.SENT,
      },
      select: ['id'],
    });

    if (messages.length > 0) {
      const messageIds = messages.map(m => m.id);
      await this.markMessagesAsRead(conversationId, messageIds, userId);
    }
  }

  async deleteMessage(messageId: string, userId: string): Promise<void> {
    const message = await this.chatMessageRepository.findOne({
      where: { id: messageId },
      relations: ['sender'],
    });

    if (!message) {
      throw new NotFoundException('Message not found');
    }

    if (message.senderId !== userId) {
      throw new ForbiddenException('You can only delete your own messages');
    }

    await this.chatMessageRepository.softDelete(messageId);
  }

  async editMessage(
    messageId: string,
    userId: string,
    newContent: string,
  ): Promise<ChatMessage> {
    const message = await this.chatMessageRepository.findOne({
      where: { id: messageId },
    });

    if (!message) {
      throw new NotFoundException('Message not found');
    }

    if (message.senderId !== userId) {
      throw new ForbiddenException('You can only edit your own messages');
    }

    message.content = newContent;
    message.isEdited = true;
    message.editedAt = new Date();

    return this.chatMessageRepository.save(message);
  }
}
