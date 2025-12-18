import { Controller, Get, Post, Body, Param, Patch, Query, UseGuards, Request, ForbiddenException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { MessagesService } from './messages.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { MessageStatus } from './entities/message.entity';
import { PaginationDto } from '../common/dto/pagination.dto';

@ApiTags('Messages')
@Controller('messages')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class MessagesController {
  constructor(private readonly messagesService: MessagesService) {}

  @Get()
  @ApiOperation({ summary: 'Get all messages for current user (paginated)' })
  @ApiResponse({ status: 200, description: 'Messages retrieved successfully' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'offset', required: false, type: Number })
  @ApiQuery({ name: 'sortBy', required: false, type: String })
  @ApiQuery({ name: 'sortOrder', required: false, enum: ['ASC', 'DESC'] })
  @ApiQuery({ name: 'status', required: false, enum: MessageStatus })
  async getUserMessages(
    @Request() req,
    @Query() paginationDto: PaginationDto,
    @Query('status') status?: MessageStatus,
  ) {
    return this.messagesService.getUserMessagesPaginated(req.user.id, paginationDto, status);
  }

  @Get('business/:businessId/past-customers')
  @ApiOperation({ summary: 'Get past customers for a business (business owners only)' })
  @ApiResponse({ status: 200, description: 'Past customers retrieved successfully' })
  async getPastCustomers(@Param('businessId') businessId: string, @Request() req) {
    return this.messagesService.getPastCustomers(businessId, req.user.id);
  }

  @Post('business/:businessId/send-promotional-offer')
  @ApiOperation({ summary: 'Send promotional offer to past customers' })
  @ApiResponse({ status: 201, description: 'Promotional offers sent successfully' })
  async sendPromotionalOffer(
    @Param('businessId') businessId: string,
    @Body() body: {
      customerIds: string[];
      subject: string;
      content: string;
      offerCode?: string;
      discount?: number;
      validUntil?: string;
    },
    @Request() req,
  ) {
    return this.messagesService.sendPromotionalOffer(
      businessId,
      req.user.id,
      body.customerIds,
      body.subject,
      body.content,
      {
        offerCode: body.offerCode,
        discount: body.discount,
        validUntil: body.validUntil,
      },
    );
  }

  @Patch(':id/read')
  @ApiOperation({ summary: 'Mark message as read' })
  @ApiResponse({ status: 200, description: 'Message marked as read' })
  async markAsRead(@Param('id') id: string, @Request() req) {
    return this.messagesService.markAsRead(id, req.user.id);
  }

  @Patch(':id/archive')
  @ApiOperation({ summary: 'Archive message' })
  @ApiResponse({ status: 200, description: 'Message archived' })
  async archiveMessage(@Param('id') id: string, @Request() req) {
    return this.messagesService.archiveMessage(id, req.user.id);
  }

  // Chat endpoints
  @Post('chat/:businessId')
  @ApiOperation({ summary: 'Send a chat message to a business' })
  @ApiResponse({ status: 201, description: 'Chat message sent successfully' })
  async sendChatMessage(
    @Param('businessId') businessId: string,
    @Body() body: { content: string; bookingId?: string },
    @Request() req,
  ) {
    try {
      console.log('[MessagesController] sendChatMessage called:', {
        userId: req.user.id,
        businessId,
        contentLength: body.content?.length,
        bookingId: body.bookingId,
      });
      const result = await this.messagesService.sendChatMessage(
        req.user.id,
        businessId,
        body.content,
        body.bookingId,
      );
      return result;
    } catch (error: any) {
      console.error('[MessagesController] Error in sendChatMessage:', {
        error: error.message,
        status: error.status,
        response: error.response,
        stack: error.stack,
      });
      throw error;
    }
  }

  @Get('chat/:businessId/conversation')
  @ApiOperation({ summary: 'Get conversation with a business' })
  @ApiResponse({ status: 200, description: 'Conversation retrieved successfully' })
  async getConversation(
    @Param('businessId') businessId: string,
    @Request() req,
  ) {
    return this.messagesService.getConversation(req.user.id, businessId);
  }

  @Get('chat/conversations')
  @ApiOperation({ summary: 'Get all conversations for current user' })
  @ApiResponse({ status: 200, description: 'Conversations retrieved successfully' })
  async getConversations(@Request() req) {
    return this.messagesService.getConversations(req.user.id, req.user.role);
  }

  @Patch('chat/:businessId/read')
  @ApiOperation({ summary: 'Mark conversation as read' })
  @ApiResponse({ status: 200, description: 'Conversation marked as read' })
  async markConversationAsRead(
    @Param('businessId') businessId: string,
    @Request() req,
  ) {
    await this.messagesService.markConversationAsRead(req.user.id, businessId);
    return { message: 'Conversation marked as read' };
  }

  @Post('cleanup')
  @ApiOperation({ summary: 'Clean up old messages (admin only)' })
  @ApiResponse({ status: 200, description: 'Old messages cleaned up' })
  async cleanupOldMessages(
    @Body() body: { archiveAfterDays?: number; deleteAfterDays?: number },
    @Request() req,
  ) {
    // Only allow super_admin to run cleanup manually
    if (req.user.role !== 'super_admin') {
      throw new ForbiddenException('Only administrators can run cleanup');
    }

    const result = await this.messagesService.cleanupOldMessages(
      body.archiveAfterDays,
      body.deleteAfterDays,
    );
    return {
      message: 'Cleanup completed',
      archived: result.archived,
      deleted: result.deleted,
    };
  }
}

