-- Migration: Add chat fields to messages table
-- This migration adds support for chat messaging between customers and businesses

-- Add conversationId column for grouping chat messages
ALTER TABLE messages 
ADD COLUMN IF NOT EXISTS "conversationId" VARCHAR(255);

-- Add bookingId column for linking chat messages to bookings
ALTER TABLE messages 
ADD COLUMN IF NOT EXISTS "bookingId" VARCHAR(36);

-- Add index on conversationId for faster conversation queries
CREATE INDEX IF NOT EXISTS "IDX_messages_conversationId" ON messages("conversationId");

-- Add index on bookingId for faster booking-related message queries
CREATE INDEX IF NOT EXISTS "IDX_messages_bookingId" ON messages("bookingId");

-- Update MessageType enum to include CHAT (if using enum type)
-- Note: If your database uses enum types, you may need to:
-- ALTER TYPE message_type_enum ADD VALUE 'chat';
-- Otherwise, TypeORM will handle this automatically with synchronize

-- Add index on type and createdAt for cleanup queries
CREATE INDEX IF NOT EXISTS "IDX_messages_type_createdAt" ON messages("type", "createdAt");

-- Add index on status and createdAt for archive queries
CREATE INDEX IF NOT EXISTS "IDX_messages_status_createdAt" ON messages("status", "createdAt");

