import { Injectable } from '@nestjs/common';
import { RedisService } from '../redis/redis.service';
import { ChatMessage } from './entities/chat-message.entity';

/**
 * Chat Cache Service - Manages Redis caching for chat features
 * Caches: online users, typing indicators, recent messages, unread counts
 */
@Injectable()
export class ChatCacheService {
  private readonly ONLINE_USERS_KEY = 'online:users';
  private readonly TYPING_PREFIX = 'typing';
  private readonly MESSAGES_PREFIX = 'conversation';
  private readonly UNREAD_PREFIX = 'user';
  private readonly TYPING_TTL = 5; // 5 seconds
  private readonly MESSAGE_CACHE_LIMIT = 50; // Cache last 50 messages per conversation

  constructor(private redisService: RedisService) {}

  // ==================== Online Users ====================

  /**
   * Mark user as online
   */
  async setUserOnline(userId: string): Promise<void> {
    await this.redisService.sadd(this.ONLINE_USERS_KEY, userId);
  }

  /**
   * Mark user as offline
   */
  async setUserOffline(userId: string): Promise<void> {
    await this.redisService.srem(this.ONLINE_USERS_KEY, userId);
  }

  /**
   * Check if user is online
   */
  async isUserOnline(userId: string): Promise<boolean> {
    return this.redisService.sismember(this.ONLINE_USERS_KEY, userId);
  }

  /**
   * Get all online users
   */
  async getOnlineUsers(): Promise<string[]> {
    return this.redisService.smembers(this.ONLINE_USERS_KEY);
  }

  // ==================== Typing Indicators ====================

  /**
   * Set typing indicator for a user in a conversation
   */
  async setTyping(conversationId: string, userId: string): Promise<void> {
    const key = `${this.TYPING_PREFIX}:${conversationId}:${userId}`;
    await this.redisService.set(key, 'true', this.TYPING_TTL);
  }

  /**
   * Remove typing indicator
   */
  async removeTyping(conversationId: string, userId: string): Promise<void> {
    const key = `${this.TYPING_PREFIX}:${conversationId}:${userId}`;
    await this.redisService.del(key);
  }

  /**
   * Get all users typing in a conversation
   */
  async getTypingUsers(conversationId: string): Promise<string[]> {
    // Note: In a real Redis implementation, you'd use KEYS or SCAN
    // This is a simplified version for the in-memory implementation
    const typingUsers: string[] = [];

    // For production with actual Redis, implement proper key scanning
    // For now, this is a placeholder that returns empty array
    // The typing indicators will work through WebSocket events instead

    return typingUsers;
  }

  // ==================== Message Caching ====================

  /**
   * Cache recent messages for a conversation
   */
  async cacheMessages(conversationId: string, messages: ChatMessage[]): Promise<void> {
    const key = `${this.MESSAGES_PREFIX}:${conversationId}:messages`;

    // Clear existing cache
    await this.redisService.del(key);

    // Store messages as JSON strings in a list
    if (messages.length > 0) {
      const messageStrings = messages.map(msg => JSON.stringify({
        id: msg.id,
        conversationId: msg.conversationId,
        senderId: msg.senderId,
        content: msg.content,
        messageType: msg.messageType,
        status: msg.status,
        isEdited: msg.isEdited,
        metadata: msg.metadata,
        createdAt: msg.createdAt,
        updatedAt: msg.updatedAt,
      }));

      await this.redisService.rpush(key, ...messageStrings);

      // Keep only recent messages
      await this.redisService.ltrim(key, -this.MESSAGE_CACHE_LIMIT, -1);
    }
  }

  /**
   * Add a new message to the cache
   */
  async addMessageToCache(conversationId: string, message: ChatMessage): Promise<void> {
    const key = `${this.MESSAGES_PREFIX}:${conversationId}:messages`;

    const messageString = JSON.stringify({
      id: message.id,
      conversationId: message.conversationId,
      senderId: message.senderId,
      content: message.content,
      messageType: message.messageType,
      status: message.status,
      isEdited: message.isEdited,
      metadata: message.metadata,
      createdAt: message.createdAt,
      updatedAt: message.updatedAt,
    });

    await this.redisService.rpush(key, messageString);

    // Keep only recent messages
    await this.redisService.ltrim(key, -this.MESSAGE_CACHE_LIMIT, -1);
  }

  /**
   * Get cached messages for a conversation
   */
  async getCachedMessages(conversationId: string): Promise<ChatMessage[] | null> {
    const key = `${this.MESSAGES_PREFIX}:${conversationId}:messages`;
    const messageStrings = await this.redisService.lrange(key, 0, -1);

    if (!messageStrings || messageStrings.length === 0) {
      return null;
    }

    return messageStrings.map(str => JSON.parse(str));
  }

  /**
   * Invalidate message cache for a conversation
   */
  async invalidateMessageCache(conversationId: string): Promise<void> {
    const key = `${this.MESSAGES_PREFIX}:${conversationId}:messages`;
    await this.redisService.del(key);
  }

  // ==================== Unread Counts ====================

  /**
   * Increment unread count for a user
   */
  async incrementUnreadCount(userId: string, conversationId: string): Promise<number> {
    const key = `${this.UNREAD_PREFIX}:${userId}:unread`;
    return this.redisService.hincrby(key, conversationId, 1);
  }

  /**
   * Reset unread count for a conversation
   */
  async resetUnreadCount(userId: string, conversationId: string): Promise<void> {
    const key = `${this.UNREAD_PREFIX}:${userId}:unread`;
    await this.redisService.hdel(key, conversationId);
  }

  /**
   * Get unread count for a specific conversation
   */
  async getUnreadCount(userId: string, conversationId: string): Promise<number> {
    const key = `${this.UNREAD_PREFIX}:${userId}:unread`;
    const count = await this.redisService.hget(key, conversationId);
    return count ? parseInt(count, 10) : 0;
  }

  /**
   * Get all unread counts for a user
   */
  async getAllUnreadCounts(userId: string): Promise<Record<string, number>> {
    const key = `${this.UNREAD_PREFIX}:${userId}:unread`;
    const counts = await this.redisService.hgetall(key);

    // Convert string values to numbers
    const result: Record<string, number> = {};
    Object.entries(counts).forEach(([conversationId, count]) => {
      result[conversationId] = parseInt(count, 10);
    });

    return result;
  }

  /**
   * Get total unread count for a user (sum of all conversations)
   */
  async getTotalUnreadCount(userId: string): Promise<number> {
    const counts = await this.getAllUnreadCounts(userId);
    return Object.values(counts).reduce((sum, count) => sum + count, 0);
  }

  // ==================== Utility ====================

  /**
   * Clear all chat cache (useful for testing or maintenance)
   */
  async clearAllCache(): Promise<void> {
    await this.redisService.flushall();
  }
}
