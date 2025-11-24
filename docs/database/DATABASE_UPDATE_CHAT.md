# Database Update for Chat Messaging

## Overview
This document describes the database changes needed to support chat messaging between customers and businesses.

## Automatic Update (Development)
If you're running in **development mode** (`NODE_ENV=development`), TypeORM will automatically update the database schema when you start the backend. No manual steps required!

## Manual Update (Production)

### Option 1: Run SQL Migration Script
Execute the migration script located at:
```
backend/src/database/migrations/006-add-chat-fields-to-messages.sql
```

This script will:
- Add `conversationId` column to the `messages` table
- Add `bookingId` column to the `messages` table
- Create indexes for better query performance

### Option 2: Manual SQL Commands
Run these commands in your PostgreSQL database:

```sql
-- Add conversationId column for grouping chat messages
ALTER TABLE messages 
ADD COLUMN IF NOT EXISTS "conversationId" VARCHAR(255);

-- Add bookingId column for linking chat messages to bookings
ALTER TABLE messages 
ADD COLUMN IF NOT EXISTS "bookingId" VARCHAR(36);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS "IDX_messages_conversationId" ON messages("conversationId");
CREATE INDEX IF NOT EXISTS "IDX_messages_bookingId" ON messages("bookingId");
CREATE INDEX IF NOT EXISTS "IDX_messages_type_createdAt" ON messages("type", "createdAt");
CREATE INDEX IF NOT EXISTS "IDX_messages_status_createdAt" ON messages("status", "createdAt");
```

### Update MessageType Enum
If your database uses PostgreSQL enum types, you may need to add the `CHAT` value:

```sql
ALTER TYPE message_type_enum ADD VALUE IF NOT EXISTS 'chat';
```

**Note:** TypeORM typically handles enum updates automatically with `synchronize: true` in development.

## Verification
After updating, verify the changes:

```sql
-- Check columns exist
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'messages' 
AND column_name IN ('conversationId', 'bookingId');

-- Check indexes exist
SELECT indexname 
FROM pg_indexes 
WHERE tablename = 'messages' 
AND indexname LIKE 'IDX_messages%';
```

## Message Cleanup System

### Automatic Cleanup
The system automatically cleans up old messages:
- **Chat messages**: Archived after 90 days, deleted after 180 days
- **System messages** (promotional offers, invitations): Deleted after 365 days

Cleanup runs automatically:
- Daily at 2 AM for chat messages
- Monthly on the 1st at 3 AM for system messages

### Manual Cleanup
Admins can trigger cleanup manually via API:

```bash
POST /messages/cleanup
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "archiveAfterDays": 90,
  "deleteAfterDays": 180
}
```

## New Columns

### `conversationId` (VARCHAR(255), nullable)
- Groups chat messages between a customer and business
- Format: `chat_{userId}_{businessOwnerId}` (sorted IDs)
- Used to retrieve conversation history

### `bookingId` (VARCHAR(36), nullable)
- Links chat messages to specific bookings
- Optional - messages can exist without a booking reference
- Useful for context when messaging about a specific booking

## Impact
- **Storage**: Minimal - only adds 2 nullable columns
- **Performance**: Improved with new indexes
- **Backward Compatibility**: Fully compatible - existing messages will have NULL values for new columns

