import { useEffect, useState, useCallback, useRef } from 'react';
import { useSocket } from '../contexts/SocketContext';

export interface ChatMessage {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  messageType: 'text' | 'image' | 'file' | 'system';
  status: 'sent' | 'delivered' | 'read';
  isEdited: boolean;
  metadata?: any;
  createdAt: string;
  updatedAt: string;
}

export interface Conversation {
  id: string;
  businessId: string;
  customerId: string;
  businessOwnerId: string;
  lastMessageId?: string;
  lastMessageAt?: string;
  lastMessagePreview?: string;
  customerUnreadCount: number;
  businessUnreadCount: number;
  business?: any;
  customer?: any;
  businessOwner?: any;
}

export interface TypingStatus {
  conversationId: string;
  userId: string;
  isTyping: boolean;
}

export interface OnlineStatus {
  userId: string;
  isOnline: boolean;
  lastSeen?: Date;
}

export const useChat = (conversationId?: string) => {
  const { socket, isConnected } = useSocket();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [typingUsers, setTypingUsers] = useState<Map<string, boolean>>(new Map());
  const [onlineUsers, setOnlineUsers] = useState<Map<string, boolean>>(new Map());
  const [hasJoined, setHasJoined] = useState(false);

  // Use ref to track typing timeout
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Join conversation when conversationId is provided
  useEffect(() => {
    if (socket && isConnected && conversationId && !hasJoined) {
      console.log(`[useChat] Joining conversation: ${conversationId}`);
      socket.emit('join_conversation', { conversationId });
      setHasJoined(true);

      // Listen for joined confirmation
      const handleJoined = (data: { conversationId: string }) => {
        console.log('[useChat] Successfully joined conversation:', data.conversationId);
      };

      socket.on('joined_conversation', handleJoined);

      return () => {
        socket.off('joined_conversation', handleJoined);
      };
    }
  }, [socket, isConnected, conversationId, hasJoined]);

  // Leave conversation on cleanup
  useEffect(() => {
    return () => {
      if (socket && conversationId && hasJoined) {
        console.log(`[useChat] Leaving conversation: ${conversationId}`);
        socket.emit('leave_conversation', { conversationId });
        setHasJoined(false);
      }
    };
  }, [socket, conversationId, hasJoined]);

  // Listen for new messages
  useEffect(() => {
    if (!socket) return;

    const handleNewMessage = (data: { message: ChatMessage; conversationId: string }) => {
      console.log('[useChat] New message received:', {
        messageId: data.message?.id,
        conversationId: data.conversationId,
        currentConversationId: conversationId,
        matches: data.conversationId === conversationId,
        contentPreview: data.message?.content?.substring(0, 50),
        senderId: data.message?.senderId,
      });

      // Only add to messages if it's for the current conversation
      if (conversationId && data.conversationId === conversationId) {
        setMessages((prev) => {
          // Check if message already exists (avoid duplicates)
          if (prev.some(msg => msg.id === data.message.id)) {
            console.log('[useChat] Message already exists, skipping:', data.message.id);
            return prev;
          }
          console.log('[useChat] Adding message to state. Previous count:', prev.length, '→ New count:', prev.length + 1);
          return [...prev, data.message];
        });
      } else {
        console.log('[useChat] Message not added - conversationId mismatch or missing:', {
          hasConversationId: !!conversationId,
          receivedConversationId: data.conversationId,
          currentConversationId: conversationId,
        });
      }
    };

    console.log('[useChat] Registering new_message listener for conversationId:', conversationId);
    socket.on('new_message', handleNewMessage);

    return () => {
      console.log('[useChat] Unregistering new_message listener');
      socket.off('new_message', handleNewMessage);
    };
  }, [socket, conversationId]);

  // Listen for typing indicators
  useEffect(() => {
    if (!socket) return;

    const handleUserTyping = (data: TypingStatus) => {
      if (conversationId && data.conversationId === conversationId) {
        setTypingUsers((prev) => {
          const updated = new Map(prev);
          if (data.isTyping) {
            updated.set(data.userId, true);
          } else {
            updated.delete(data.userId);
          }
          return updated;
        });
      }
    };

    socket.on('user_typing', handleUserTyping);

    return () => {
      socket.off('user_typing', handleUserTyping);
    };
  }, [socket, conversationId]);

  // Listen for online/offline status
  useEffect(() => {
    if (!socket) return;

    const handleUserOnline = (data: { userId: string }) => {
      setOnlineUsers((prev) => {
        const updated = new Map(prev);
        updated.set(data.userId, true);
        return updated;
      });
    };

    const handleUserOffline = (data: { userId: string; lastSeen?: Date }) => {
      setOnlineUsers((prev) => {
        const updated = new Map(prev);
        updated.set(data.userId, false);
        return updated;
      });
    };

    socket.on('user_online', handleUserOnline);
    socket.on('user_offline', handleUserOffline);

    return () => {
      socket.off('user_online', handleUserOnline);
      socket.off('user_offline', handleUserOffline);
    };
  }, [socket]);

  // Listen for messages marked as read
  useEffect(() => {
    if (!socket) return;

    const handleMessagesRead = (data: { conversationId: string; messageIds: string[]; readBy: string }) => {
      if (conversationId && data.conversationId === conversationId) {
        setMessages((prev) =>
          prev.map((msg) =>
            data.messageIds.includes(msg.id) ? { ...msg, status: 'read' } : msg
          )
        );
      }
    };

    socket.on('messages_read', handleMessagesRead);

    return () => {
      socket.off('messages_read', handleMessagesRead);
    };
  }, [socket, conversationId]);

  // Send a message
  const sendMessage = useCallback(
    (content: string, messageType: 'text' | 'image' | 'file' = 'text') => {
      if (!socket || !conversationId) {
        console.warn('[useChat] Cannot send message: socket or conversationId missing', {
          hasSocket: !!socket,
          conversationId,
        });
        return;
      }

      console.log('[useChat] Emitting send_message event:', {
        conversationId,
        contentPreview: content.substring(0, 50),
        messageType,
        socketConnected: socket.connected,
      });

      socket.emit('send_message', {
        conversationId,
        content,
        messageType,
      });

      console.log('[useChat] send_message event emitted successfully');
    },
    [socket, conversationId]
  );

  // Start typing indicator
  const startTyping = useCallback(() => {
    if (!socket || !conversationId) return;

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Emit typing start
    socket.emit('typing_start', { conversationId });

    // Auto-stop typing after 3 seconds
    typingTimeoutRef.current = setTimeout(() => {
      stopTyping();
    }, 3000);
  }, [socket, conversationId]);

  // Stop typing indicator
  const stopTyping = useCallback(() => {
    if (!socket || !conversationId) return;

    // Clear timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }

    socket.emit('typing_stop', { conversationId });
  }, [socket, conversationId]);

  // Mark messages as read
  const markAsRead = useCallback(
    (messageIds: string[]) => {
      if (!socket || !conversationId) return;

      socket.emit('mark_read', {
        conversationId,
        messageIds,
      });
    },
    [socket, conversationId]
  );

  // Check if a user is typing
  const isUserTyping = useCallback(
    (userId: string) => {
      return typingUsers.get(userId) || false;
    },
    [typingUsers]
  );

  // Check if a user is online
  const isUserOnline = useCallback(
    (userId: string) => {
      return onlineUsers.get(userId) || false;
    },
    [onlineUsers]
  );

  return {
    messages,
    setMessages, // Allow external message management (for HTTP fallback)
    sendMessage,
    startTyping,
    stopTyping,
    markAsRead,
    isUserTyping,
    isUserOnline,
    isConnected,
    hasJoined,
  };
};
