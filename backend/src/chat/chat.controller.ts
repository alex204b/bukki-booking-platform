import { Controller, Get, Post, Body, Param, Query, UseGuards, Request, Patch, Delete } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ChatService } from './chat.service';
import { ConversationService } from './conversation.service';
import { SendMessageDto, CreateConversationDto } from './dto/send-message.dto';

@ApiTags('Chat')
@Controller('chat')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ChatController {
  constructor(
    private chatService: ChatService,
    private conversationService: ConversationService,
  ) {}

  @Get('conversations')
  @ApiOperation({ summary: 'Get all conversations for current user' })
  async getConversations(@Request() req) {
    return this.conversationService.getUserConversations(req.user.id, req.user.role);
  }

  @Post('conversations')
  @ApiOperation({ summary: 'Create or get existing conversation' })
  async createConversation(
    @Body() dto: CreateConversationDto,
    @Request() req,
  ) {
    const conversation = await this.conversationService.getOrCreateConversation(
      dto.businessId,
      req.user.id,
    );

    // Send initial message if provided
    if (dto.initialMessage) {
      await this.chatService.sendMessage(
        conversation.id,
        req.user.id,
        dto.initialMessage,
      );
    }

    return conversation;
  }

  @Get('conversations/:id')
  @ApiOperation({ summary: 'Get conversation by ID' })
  async getConversation(@Param('id') id: string) {
    return this.conversationService.getConversationById(id);
  }

  @Get('conversations/:id/messages')
  @ApiOperation({ summary: 'Get messages from a conversation' })
  async getMessages(
    @Param('id') conversationId: string,
    @Query('limit') limit: number = 50,
    @Query('offset') offset: number = 0,
    @Request() req,
  ) {
    return this.chatService.getConversationMessages(
      conversationId,
      req.user.id,
      Number(limit),
      Number(offset),
    );
  }

  @Post('conversations/:id/messages')
  @ApiOperation({ summary: 'Send a message (HTTP fallback)' })
  async sendMessage(
    @Param('id') conversationId: string,
    @Body() dto: SendMessageDto,
    @Request() req,
  ) {
    return this.chatService.sendMessage(
      conversationId,
      req.user.id,
      dto.content,
      dto.messageType,
      dto.metadata,
    );
  }

  @Patch('conversations/:id/read')
  @ApiOperation({ summary: 'Mark all messages in conversation as read' })
  async markConversationAsRead(
    @Param('id') conversationId: string,
    @Request() req,
  ) {
    await this.chatService.markConversationAsRead(conversationId, req.user.id);
    return { success: true };
  }

  @Patch('messages/:id')
  @ApiOperation({ summary: 'Edit a message' })
  async editMessage(
    @Param('id') messageId: string,
    @Body('content') content: string,
    @Request() req,
  ) {
    return this.chatService.editMessage(messageId, req.user.id, content);
  }

  @Delete('messages/:id')
  @ApiOperation({ summary: 'Delete a message' })
  async deleteMessage(
    @Param('id') messageId: string,
    @Request() req,
  ) {
    await this.chatService.deleteMessage(messageId, req.user.id);
    return { success: true };
  }

  @Get('unread-count')
  @ApiOperation({ summary: 'Get total unread message count' })
  async getUnreadCount(@Request() req) {
    const count = await this.conversationService.getTotalUnreadCount(
      req.user.id,
      req.user.role,
    );
    return { count };
  }
}
