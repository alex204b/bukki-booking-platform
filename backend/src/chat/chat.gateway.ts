import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { UseGuards } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ChatService } from './chat.service';
import { ConversationService } from './conversation.service';
import { ChatCacheService } from './chat-cache.service';

interface AuthenticatedSocket extends Socket {
  userId: string;
  userRole: string;
}

@WebSocketGateway({
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true,
  },
  namespace: '/chat',
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  // Track online users: userId -> Set of socketIds
  private onlineUsers: Map<string, Set<string>> = new Map();

  constructor(
    private chatService: ChatService,
    private conversationService: ConversationService,
    private chatCacheService: ChatCacheService,
    private jwtService: JwtService,
  ) {}

  async handleConnection(client: AuthenticatedSocket) {
    try {
      // Authenticate socket connection
      const token = client.handshake.auth.token || client.handshake.headers.authorization?.split(' ')[1];

      if (!token) {
        console.log('[ChatGateway] No token provided, disconnecting');
        client.disconnect();
        return;
      }

      const payload = await this.jwtService.verifyAsync(token);
      client.userId = payload.sub;
      client.userRole = payload.role;

      // Track user as online
      if (!this.onlineUsers.has(client.userId)) {
        this.onlineUsers.set(client.userId, new Set());
        // Mark user as online in cache (only on first connection)
        await this.chatCacheService.setUserOnline(client.userId);
      }
      this.onlineUsers.get(client.userId).add(client.id);

      console.log(`[ChatGateway] User ${client.userId} connected (socket: ${client.id})`);

      // Notify user's conversation partners they're online
      this.broadcastUserOnline(client.userId);

      // Join user to their personal room
      client.join(`user:${client.userId}`);

    } catch (error) {
      console.error('[ChatGateway] Authentication failed:', error);
      client.disconnect();
    }
  }

  async handleDisconnect(client: AuthenticatedSocket) {
    if (client.userId) {
      const userSockets = this.onlineUsers.get(client.userId);
      if (userSockets) {
        userSockets.delete(client.id);

        // If user has no more connections, mark as offline
        if (userSockets.size === 0) {
          this.onlineUsers.delete(client.userId);
          // Mark user as offline in cache
          await this.chatCacheService.setUserOffline(client.userId);
          this.broadcastUserOffline(client.userId);
        }
      }

      console.log(`[ChatGateway] User ${client.userId} disconnected (socket: ${client.id})`);
    }
  }

  @SubscribeMessage('join_conversation')
  async handleJoinConversation(
    @MessageBody() data: { conversationId: string },
    @ConnectedSocket() client: AuthenticatedSocket,
  ) {
    try {
      const conversation = await this.conversationService.getConversationById(data.conversationId);

      // Verify user is part of this conversation
      if (conversation.customerId !== client.userId &&
          conversation.businessOwnerId !== client.userId) {
        client.emit('error', { message: 'Unauthorized to join this conversation' });
        return;
      }

      client.join(`conversation:${data.conversationId}`);
      console.log(`[ChatGateway] User ${client.userId} joined conversation ${data.conversationId}`);

      client.emit('joined_conversation', { conversationId: data.conversationId });
    } catch (error) {
      console.error('[ChatGateway] Error joining conversation:', error);
      client.emit('error', { message: 'Failed to join conversation' });
    }
  }

  @SubscribeMessage('leave_conversation')
  async handleLeaveConversation(
    @MessageBody() data: { conversationId: string },
    @ConnectedSocket() client: AuthenticatedSocket,
  ) {
    client.leave(`conversation:${data.conversationId}`);
    console.log(`[ChatGateway] User ${client.userId} left conversation ${data.conversationId}`);
  }

  @SubscribeMessage('send_message')
  async handleSendMessage(
    @MessageBody() data: { conversationId: string; content: string; messageType?: string },
    @ConnectedSocket() client: AuthenticatedSocket,
  ) {
    try {
      const message = await this.chatService.sendMessage(
        data.conversationId,
        client.userId,
        data.content,
        data.messageType as any,
      );

      // Emit to conversation room
      this.server.to(`conversation:${data.conversationId}`).emit('new_message', {
        message,
        conversationId: data.conversationId,
      });

      // Also emit to recipient's personal room (in case they're not in conversation room)
      const conversation = await this.conversationService.getConversationById(data.conversationId);
      const recipientId = conversation.customerId === client.userId
        ? conversation.businessOwnerId
        : conversation.customerId;

      this.server.to(`user:${recipientId}`).emit('new_message', {
        message,
        conversationId: data.conversationId,
      });

      console.log(`[ChatGateway] Message sent in conversation ${data.conversationId}`);
    } catch (error) {
      console.error('[ChatGateway] Error sending message:', error);
      client.emit('error', { message: 'Failed to send message' });
    }
  }

  @SubscribeMessage('typing_start')
  async handleTypingStart(
    @MessageBody() data: { conversationId: string },
    @ConnectedSocket() client: AuthenticatedSocket,
  ) {
    // Set typing indicator in cache
    await this.chatCacheService.setTyping(data.conversationId, client.userId);

    // Broadcast to conversation (exclude sender)
    client.to(`conversation:${data.conversationId}`).emit('user_typing', {
      conversationId: data.conversationId,
      userId: client.userId,
      isTyping: true,
    });
  }

  @SubscribeMessage('typing_stop')
  async handleTypingStop(
    @MessageBody() data: { conversationId: string },
    @ConnectedSocket() client: AuthenticatedSocket,
  ) {
    // Remove typing indicator from cache
    await this.chatCacheService.removeTyping(data.conversationId, client.userId);

    client.to(`conversation:${data.conversationId}`).emit('user_typing', {
      conversationId: data.conversationId,
      userId: client.userId,
      isTyping: false,
    });
  }

  @SubscribeMessage('mark_read')
  async handleMarkRead(
    @MessageBody() data: { conversationId: string; messageIds: string[] },
    @ConnectedSocket() client: AuthenticatedSocket,
  ) {
    try {
      await this.chatService.markMessagesAsRead(data.conversationId, data.messageIds, client.userId);

      // Notify sender that messages were read
      client.to(`conversation:${data.conversationId}`).emit('messages_read', {
        conversationId: data.conversationId,
        messageIds: data.messageIds,
        readBy: client.userId,
      });
    } catch (error) {
      console.error('[ChatGateway] Error marking messages as read:', error);
    }
  }

  // Broadcast user online status to their conversation partners
  private async broadcastUserOnline(userId: string) {
    try {
      const conversations = await this.conversationService.getUserConversations(userId);

      for (const conv of conversations) {
        const partnerId = conv.customerId === userId ? conv.businessOwnerId : conv.customerId;
        this.server.to(`user:${partnerId}`).emit('user_online', { userId });
      }
    } catch (error) {
      console.error('[ChatGateway] Error broadcasting online status:', error);
    }
  }

  // Broadcast user offline status
  private async broadcastUserOffline(userId: string) {
    try {
      const conversations = await this.conversationService.getUserConversations(userId);

      for (const conv of conversations) {
        const partnerId = conv.customerId === userId ? conv.businessOwnerId : conv.customerId;
        this.server.to(`user:${partnerId}`).emit('user_offline', { userId, lastSeen: new Date() });
      }
    } catch (error) {
      console.error('[ChatGateway] Error broadcasting offline status:', error);
    }
  }

  // Check if user is online
  isUserOnline(userId: string): boolean {
    return this.onlineUsers.has(userId);
  }

  // Send message to specific user
  sendToUser(userId: string, event: string, data: any) {
    this.server.to(`user:${userId}`).emit(event, data);
  }
}
