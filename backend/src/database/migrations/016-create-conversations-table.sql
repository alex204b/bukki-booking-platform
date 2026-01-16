-- Migration 016: Create Conversations Table
-- This migration creates the conversations table for managing chat threads between customers and businesses

CREATE TABLE IF NOT EXISTS conversations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "businessId" UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    "customerId" UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    "businessOwnerId" UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    "lastMessageId" UUID,
    "lastMessageAt" TIMESTAMP,
    "lastMessagePreview" TEXT,
    "customerUnreadCount" INT DEFAULT 0,
    "businessUnreadCount" INT DEFAULT 0,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP,
    UNIQUE("businessId", "customerId")
);

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_conversations_business ON conversations("businessId");
CREATE INDEX IF NOT EXISTS idx_conversations_customer ON conversations("customerId");
CREATE INDEX IF NOT EXISTS idx_conversations_business_owner ON conversations("businessOwnerId");
CREATE INDEX IF NOT EXISTS idx_conversations_last_message ON conversations("lastMessageAt");
CREATE INDEX IF NOT EXISTS idx_conversations_customer_unread ON conversations("customerId", "customerUnreadCount") WHERE "customerUnreadCount" > 0;
CREATE INDEX IF NOT EXISTS idx_conversations_business_unread ON conversations("businessOwnerId", "businessUnreadCount") WHERE "businessUnreadCount" > 0;
