# WebSocket + Redis Chat System - Setup & Integration Guide

This guide explains how to set up and use the new WebSocket-based real-time chat system with Redis caching (Phase 1 & 2).

## 📋 Table of Contents

1. [Overview](#overview)
2. [What Was Created](#what-was-created)
3. [Database Migrations](#database-migrations)
4. [Backend Setup](#backend-setup)
5. [Frontend Setup](#frontend-setup)
6. [Using the Chat System](#using-the-chat-system)
7. [Migration from Old System](#migration-from-old-system)
8. [Testing WebSocket Connection](#testing-websocket-connection)
9. [Production Deployment](#production-deployment)

---

## 🎯 Overview

The new chat system separates chat messages from other notifications and implements real-time communication using WebSocket (Socket.IO) and Redis caching.

### Key Features

- ✅ Real-time messaging via WebSocket
- ✅ Typing indicators
- ✅ Online/offline status
- ✅ Message read receipts (sent → delivered → read)
- ✅ Conversation threading
- ✅ Redis caching for performance
- ✅ HTTP fallback endpoints
- ✅ Separate tables for chat vs notifications

### Architecture

**Old System:**
- Single `messages` table for everything (chat, invitations, offers)
- HTTP polling every 5 seconds
- No real-time updates
- No typing indicators or presence

**New System:**
- `conversations` table - manages chat threads
- `chat_messages` table - stores chat messages
- `notifications` table - stores system notifications (invitations, offers, etc.)
- WebSocket for real-time updates
- Redis for caching (online users, typing indicators, recent messages)
- HTTP REST API as fallback

---

## 📦 What Was Created

### Backend Files

#### Database Migrations
```
backend/src/database/migrations/
├── 016-create-conversations-table.sql
├── 017-create-chat-messages-table.sql
├── 018-create-notifications-table.sql
└── scripts/
    ├── apply-migration-016.ts
    ├── apply-migration-017.ts
    └── apply-migration-018.ts
```

#### Entities
```
backend/src/chat/entities/
├── conversation.entity.ts
└── chat-message.entity.ts

backend/src/notifications/entities/
└── notification.entity.ts
```

#### Services & Controllers
```
backend/src/chat/
├── chat.gateway.ts          # WebSocket server
├── chat.service.ts          # Business logic
├── conversation.service.ts  # Conversation management
├── chat-cache.service.ts    # Redis caching
├── chat.controller.ts       # HTTP fallback endpoints
├── chat.module.ts           # Module configuration
└── dto/
    └── send-message.dto.ts

backend/src/redis/
├── redis.service.ts         # Redis operations (in-memory initially)
└── redis.module.ts
```

### Frontend Files

```
frontend/src/
├── contexts/
│   └── SocketContext.tsx    # WebSocket connection management
└── hooks/
    └── useChat.ts           # Chat operations hook
```

### Updated Files

- `backend/src/app.module.ts` - Added ChatModule and RedisModule
- `frontend/src/App.tsx` - Added SocketProvider

---

## 🗄️ Database Migrations

### Step 1: Run Migrations

Navigate to the backend directory and run the migration scripts:

```bash
cd backend

# Run migration 016 (conversations table)
npm run ts-node src/database/scripts/apply-migration-016.ts

# Run migration 017 (chat_messages table)
npm run ts-node src/database/scripts/apply-migration-017.ts

# Run migration 018 (notifications table)
npm run ts-node src/database/scripts/apply-migration-018.ts
```

### Step 2: Verify Migrations

Check your database to ensure the tables were created:

```sql
-- Check if tables exist
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('conversations', 'chat_messages', 'notifications');

-- Check conversations table structure
\d conversations

-- Check chat_messages table structure
\d chat_messages

-- Check notifications table structure
\d notifications
```

### What the Migrations Create

**conversations table:**
- Manages chat threads between customer and business
- Tracks unread counts for both parties
- Stores last message preview
- Unique constraint on (businessId, customerId)

**chat_messages table:**
- Stores actual chat messages
- Links to conversations
- Message types: text, image, file, system
- Status tracking: sent, delivered, read
- Edit history tracking

**notifications table:**
- Stores system notifications (team invitations, offers, etc.)
- Separate from chat messages
- Action URLs for quick actions
- Type-based filtering

---

## 🔧 Backend Setup

### 1. Install Dependencies

The required packages should already be installed. If not:

```bash
cd backend
npm install socket.io @nestjs/websockets@^10.0.0
```

### 2. Environment Variables

Ensure your `.env` file has:

```env
# JWT Secret (required for WebSocket authentication)
JWT_SECRET=your-secret-key-here

# Frontend URL (for CORS)
FRONTEND_URL=http://localhost:5173

# Database (already configured)
DATABASE_URL=your-database-url
```

### 3. Start the Backend

```bash
npm run start:dev
```

You should see:

```
[RedisService] Using in-memory storage (replace with Redis in production)
[ChatGateway] initialized
```

### 4. Verify WebSocket Endpoint

The WebSocket server runs on: `ws://localhost:3000/chat`

You can test it's running by checking the logs when a client connects.

---

## 🎨 Frontend Setup

### 1. Install Dependencies

```bash
cd frontend
npm install socket.io-client
```

### 2. Create TypeScript Environment Definitions

Create `frontend/src/vite-env.d.ts` file:

```typescript
/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string;
  // Add more env variables here as needed
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
```

This file enables TypeScript to recognize `import.meta.env` in your code.

### 3. Environment Variables

Create or update your frontend `.env` file:

```bash
cd frontend
echo "# Vite Frontend Environment Variables
# Backend API URL
VITE_API_URL=http://localhost:3000" > .env
```

Or manually create `frontend/.env`:

```env
# Vite Frontend Environment Variables
# Backend API URL
VITE_API_URL=http://localhost:3000
```

**Note:** Change the URL to match your backend server address if different.

### 4. Verify SocketProvider

The `App.tsx` has been updated to include `<SocketProvider>`. The WebSocket will automatically connect when a user logs in.

---

## 💬 Using the Chat System

### Basic Usage Example

Here's how to integrate the chat system into a component:

```tsx
import React, { useEffect } from 'react';
import { useChat } from '../hooks/useChat';
import { useAuth } from '../contexts/AuthContext';

const ChatComponent: React.FC<{ conversationId: string }> = ({ conversationId }) => {
  const { user } = useAuth();
  const {
    messages,
    sendMessage,
    startTyping,
    stopTyping,
    markAsRead,
    isUserTyping,
    isUserOnline,
    isConnected,
  } = useChat(conversationId);

  const [inputValue, setInputValue] = React.useState('');

  // Mark messages as read when they arrive
  useEffect(() => {
    const unreadMessages = messages
      .filter(msg => msg.senderId !== user?.id && msg.status !== 'read')
      .map(msg => msg.id);

    if (unreadMessages.length > 0) {
      markAsRead(unreadMessages);
    }
  }, [messages, user?.id]);

  const handleSend = () => {
    if (inputValue.trim()) {
      sendMessage(inputValue.trim());
      setInputValue('');
      stopTyping();
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
    if (e.target.value.length > 0) {
      startTyping();
    } else {
      stopTyping();
    }
  };

  return (
    <div>
      <div className="connection-status">
        {isConnected ? '🟢 Connected' : '🔴 Disconnected'}
      </div>

      <div className="messages">
        {messages.map(msg => (
          <div key={msg.id} className={msg.senderId === user?.id ? 'sent' : 'received'}>
            <p>{msg.content}</p>
            <span className="status">{msg.status}</span>
          </div>
        ))}
      </div>

      {/* Typing indicator */}
      {isUserTyping(otherUserId) && (
        <div className="typing-indicator">User is typing...</div>
      )}

      <div className="input-area">
        <input
          value={inputValue}
          onChange={handleInputChange}
          onKeyPress={e => e.key === 'Enter' && handleSend()}
          placeholder="Type a message..."
        />
        <button onClick={handleSend}>Send</button>
      </div>
    </div>
  );
};
```

### HTTP Fallback (when WebSocket is unavailable)

You can still use the REST API endpoints:

```typescript
import { api } from '../services/api';

// Get conversations
const response = await api.get('/chat/conversations');

// Send message (HTTP fallback)
await api.post(`/chat/conversations/${conversationId}/messages`, {
  content: 'Hello!',
  messageType: 'text',
});

// Get messages
const messages = await api.get(`/chat/conversations/${conversationId}/messages`);

// Mark as read
await api.patch(`/chat/conversations/${conversationId}/read`);
```

---

## 🔄 Migration from Old System

The old `messages` table is still intact. You have two options:

### Option 1: Gradual Migration

Keep both systems running. New chats use the new system, old messages remain accessible.

### Option 2: Data Migration

Create a migration script to move existing chat messages:

```typescript
// Example migration script
async function migrateOldMessages() {
  const oldMessages = await oldMessageRepository.find({
    where: { type: 'chat' } // Assuming you have a type field
  });

  for (const oldMsg of oldMessages) {
    // Create or get conversation
    const conversation = await conversationService.getOrCreateConversation(
      oldMsg.businessId,
      oldMsg.customerId
    );

    // Create new chat message
    await chatMessageRepository.create({
      conversationId: conversation.id,
      senderId: oldMsg.senderId,
      content: oldMsg.content,
      createdAt: oldMsg.createdAt,
      status: oldMsg.status === 'read' ? 'read' : 'sent',
    });
  }
}
```

### Updating Existing Chat.tsx

The current `Chat.tsx` uses HTTP polling. To integrate WebSocket:

1. **Remove HTTP polling** for messages:
```typescript
// OLD: Remove this
const { data: messages } = useQuery('messages', fetchMessages, {
  refetchInterval: 5000, // Remove polling
});

// NEW: Use WebSocket hook
const { messages, sendMessage, isConnected } = useChat(conversationId);
```

2. **Replace send message mutation**:
```typescript
// OLD: Remove HTTP mutation
const sendMutation = useMutation(messageService.send);

// NEW: Use WebSocket
sendMessage(content);
```

3. **Add connection status**:
```typescript
{!isConnected && (
  <div className="offline-banner">
    Reconnecting to chat...
  </div>
)}
```

---

## 🧪 Testing WebSocket Connection

### 1. Browser Console Test

Open browser console and run:

```javascript
// Get token from localStorage
const token = localStorage.getItem('token');

// Connect to WebSocket
const socket = io('http://localhost:3000/chat', {
  auth: { token }
});

socket.on('connect', () => {
  console.log('✅ Connected to WebSocket');
});

socket.on('disconnect', () => {
  console.log('❌ Disconnected from WebSocket');
});

// Join a conversation
socket.emit('join_conversation', { conversationId: 'your-conversation-id' });

// Send a message
socket.emit('send_message', {
  conversationId: 'your-conversation-id',
  content: 'Hello from console!',
});

// Listen for new messages
socket.on('new_message', (data) => {
  console.log('📨 New message:', data);
});
```

### 2. Test Typing Indicators

```javascript
// Start typing
socket.emit('typing_start', { conversationId: 'your-conversation-id' });

// Stop typing
socket.emit('typing_stop', { conversationId: 'your-conversation-id' });

// Listen for typing
socket.on('user_typing', (data) => {
  console.log('⌨️ User typing:', data);
});
```

### 3. Test Online Status

```javascript
socket.on('user_online', (data) => {
  console.log('🟢 User online:', data.userId);
});

socket.on('user_offline', (data) => {
  console.log('🔴 User offline:', data.userId);
});
```

---

## 🚀 Production Deployment

### 1. Replace In-Memory Redis with Actual Redis

Install ioredis:

```bash
npm install ioredis
```

Update `backend/src/redis/redis.service.ts`:

```typescript
import Redis from 'ioredis';

@Injectable()
export class RedisService {
  private redis: Redis;

  constructor() {
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
    });
  }

  async set(key: string, value: any, ttl?: number): Promise<void> {
    if (ttl) {
      await this.redis.setex(key, ttl, JSON.stringify(value));
    } else {
      await this.redis.set(key, JSON.stringify(value));
    }
  }

  async get(key: string): Promise<any> {
    const value = await this.redis.get(key);
    return value ? JSON.parse(value) : null;
  }

  // Implement other methods...
}
```

Add to `.env`:

```env
REDIS_HOST=your-redis-host
REDIS_PORT=6379
REDIS_PASSWORD=your-redis-password
```

### 2. Configure WebSocket CORS for Production

Update `backend/src/chat/chat.gateway.ts`:

```typescript
@WebSocketGateway({
  cors: {
    origin: process.env.FRONTEND_URL || ['https://yourdomain.com'],
    credentials: true,
  },
  namespace: '/chat',
})
```

### 3. Use Secure WebSocket (wss://)

Update frontend `SocketContext.tsx`:

```typescript
const newSocket = io(`${import.meta.env.VITE_API_URL}/chat`, {
  auth: { token },
  transports: ['websocket'], // Prefer WebSocket in production
  secure: true, // Use wss:// in production
});
```

### 4. Scale WebSocket Servers

For multiple servers, use Redis adapter:

```bash
npm install @socket.io/redis-adapter
```

```typescript
import { createAdapter } from '@socket.io/redis-adapter';
import { createClient } from 'redis';

const pubClient = createClient({ url: process.env.REDIS_URL });
const subClient = pubClient.duplicate();

await Promise.all([pubClient.connect(), subClient.connect()]);

io.adapter(createAdapter(pubClient, subClient));
```

---

## 📊 API Reference

### WebSocket Events

#### Client → Server

| Event | Data | Description |
|-------|------|-------------|
| `join_conversation` | `{ conversationId: string }` | Join a conversation room |
| `leave_conversation` | `{ conversationId: string }` | Leave a conversation room |
| `send_message` | `{ conversationId: string, content: string, messageType?: string }` | Send a message |
| `typing_start` | `{ conversationId: string }` | Indicate user is typing |
| `typing_stop` | `{ conversationId: string }` | Indicate user stopped typing |
| `mark_read` | `{ conversationId: string, messageIds: string[] }` | Mark messages as read |

#### Server → Client

| Event | Data | Description |
|-------|------|-------------|
| `joined_conversation` | `{ conversationId: string }` | Confirmation of joining |
| `new_message` | `{ message: ChatMessage, conversationId: string }` | New message received |
| `user_typing` | `{ conversationId: string, userId: string, isTyping: boolean }` | Typing status change |
| `user_online` | `{ userId: string }` | User came online |
| `user_offline` | `{ userId: string, lastSeen: Date }` | User went offline |
| `messages_read` | `{ conversationId: string, messageIds: string[], readBy: string }` | Messages marked as read |
| `error` | `{ message: string }` | Error occurred |

### HTTP REST Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/chat/conversations` | Get all conversations for current user |
| POST | `/chat/conversations` | Create or get existing conversation |
| GET | `/chat/conversations/:id` | Get conversation by ID |
| GET | `/chat/conversations/:id/messages` | Get messages from conversation |
| POST | `/chat/conversations/:id/messages` | Send a message (HTTP fallback) |
| PATCH | `/chat/conversations/:id/read` | Mark all messages as read |
| PATCH | `/chat/messages/:id` | Edit a message |
| DELETE | `/chat/messages/:id` | Delete a message |
| GET | `/chat/unread-count` | Get total unread message count |

---

## 🐛 Troubleshooting

### TypeScript Error: Property 'env' does not exist on type 'ImportMeta'

**Error:**
```
TS2339: Property 'env' does not exist on type 'ImportMeta'.
```

**Solution:**
1. Create `frontend/src/vite-env.d.ts` file with:
   ```typescript
   /// <reference types="vite/client" />

   interface ImportMetaEnv {
     readonly VITE_API_URL: string;
   }

   interface ImportMeta {
     readonly env: ImportMetaEnv;
   }
   ```

2. Ensure `tsconfig.json` includes "src" in the `include` array
3. Restart your development server

### WebSocket Won't Connect

1. Check that backend is running
   ```bash
   curl http://localhost:3000
   ```
2. Verify `JWT_SECRET` is set in `.env`
3. Check browser console for connection errors
4. Verify CORS settings match frontend URL
5. Ensure `VITE_API_URL` is set in `frontend/.env`

### Messages Not Appearing

1. Check that you've joined the conversation: `socket.emit('join_conversation', { conversationId })`
2. Verify WebSocket connection is established
3. Check backend logs for errors
4. Try HTTP fallback endpoint

### Typing Indicators Not Working

1. Ensure you're calling `startTyping()` on input change
2. Verify you're in the same conversation
3. Check that both users are connected to WebSocket

### Database Errors

1. Verify migrations ran successfully
2. Check database connection in backend logs
3. Ensure foreign key relationships exist (users, businesses)

---

## 📝 Next Steps (Phase 3)

After testing the WebSocket + Redis system, consider:

1. **Migrate to Stream Chat** or similar service for:
   - Message history sync
   - Offline message queue
   - Push notifications
   - File uploads
   - Moderation tools

2. **Add Features**:
   - Voice messages
   - Image sharing
   - Message reactions
   - Message search
   - Conversation archiving

3. **Performance**:
   - Implement message pagination
   - Add infinite scroll
   - Optimize Redis cache TTLs
   - Add rate limiting

---

## 🎉 Summary

You now have:
- ✅ Real-time WebSocket chat with Socket.IO
- ✅ Redis caching for performance
- ✅ Separated chat from notifications
- ✅ Typing indicators and online status
- ✅ Message read receipts
- ✅ HTTP fallback for reliability
- ✅ Production-ready architecture

The system is ready to use! Start the backend, run migrations, and the frontend will automatically connect via WebSocket when users log in.

For questions or issues, check the troubleshooting section or review the created files.
