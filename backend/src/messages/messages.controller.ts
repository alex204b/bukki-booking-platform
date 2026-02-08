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
    @Query() query: any,
    @Query('status') status?: string,
  ) {
    try {
      // Parse and validate query parameters manually to avoid validation errors
      const limit = query.limit ? parseInt(query.limit, 10) : 20;
      const offset = query.offset ? parseInt(query.offset, 10) : 0;
      const sortBy = query.sortBy || 'createdAt';
      const sortOrder = query.sortOrder || 'DESC';

      // Validate status if provided
      let messageStatus: MessageStatus | undefined;
      if (status) {
        const validStatuses = Object.values(MessageStatus);
        if (validStatuses.includes(status as MessageStatus)) {
          messageStatus = status as MessageStatus;
        }
      }

      const paginationDto: PaginationDto = {
        limit: Math.min(Math.max(limit, 1), 100), // Clamp between 1 and 100
        offset: Math.max(offset, 0), // Ensure non-negative
        sortBy,
        sortOrder: sortOrder as 'ASC' | 'DESC',
      };

      return this.messagesService.getUserMessagesPaginated(req.user.id, paginationDto, messageStatus);
    } catch (error: any) {
      throw error;
    }
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
    // DEBUG: Log request details including full user object
    console.log('[MessagesController.sendChatMessage] Request received:', {
      businessId,
      contentLength: body.content?.length,
      content: body.content?.substring(0, 50), // First 50 chars for debugging
      bookingId: body.bookingId,
      userId: req.user?.id,
      userEmail: req.user?.email,
      userName: req.user ? `${req.user.firstName} ${req.user.lastName}` : 'N/A',
      userRole: req.user?.role,
      fullUserObject: req.user ? {
        id: req.user.id,
        email: req.user.email,
        firstName: req.user.firstName,
        lastName: req.user.lastName,
        role: req.user.role,
      } : null,
    });

    if (!req.user || !req.user.id) {
      console.error('[MessagesController.sendChatMessage] ERROR: No user in request!');
      throw new ForbiddenException('User not authenticated');
    }

    // CRITICAL: Log the exact senderId being passed to the service
    const senderIdToUse = req.user.id;
    console.log('[MessagesController.sendChatMessage] Passing senderId to service:', {
      senderId: senderIdToUse,
      senderName: `${req.user.firstName} ${req.user.lastName}`,
      senderEmail: req.user.email,
    });

    return this.messagesService.sendChatMessage(
      senderIdToUse,
      businessId,
      body.content,
      body.bookingId,
    );
  }

  @Get('chat/conversations')
  @ApiOperation({ summary: 'Get all conversations for current user' })
  @ApiResponse({ status: 200, description: 'Conversations retrieved successfully' })
  async getConversations(@Request() req) {
    return this.messagesService.getConversations(req.user.id, req.user.role);
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

  @Patch('chat/:businessId/read')
  @ApiOperation({ summary: 'Mark conversation as read' })
  @ApiResponse({ status: 200, description: 'Conversation marked as read' })
  async markConversationAsRead(
    @Param('businessId') businessId: string,
    @Request() req,
    @Body() body?: { customerId?: string },
  ) {
    await this.messagesService.markConversationAsRead(req.user.id, businessId, body?.customerId);
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

