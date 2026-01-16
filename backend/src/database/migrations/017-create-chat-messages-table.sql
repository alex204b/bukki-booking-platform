-- Migration 017: Create Chat Messages Table
-- This migration creates the chat_messages table for storing chat messages in conversations

CREATE TABLE IF NOT EXISTS chat_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "conversationId" UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    "senderId" UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    "messageType" VARCHAR(20) DEFAULT 'text' CHECK ("messageType" IN ('text', 'image', 'file', 'system')),
    status VARCHAR(20) DEFAULT 'sent' CHECK (status IN ('sent', 'delivered', 'read')),
    "isEdited" BOOLEAN DEFAULT FALSE,
    "editedAt" TIMESTAMP,
    metadata JSONB, -- For attachments, links, reply-to, etc.
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP
);

-- Indexes for fast queries
CREATE INDEX IF NOT EXISTS idx_chat_messages_conversation ON chat_messages("conversationId");
CREATE INDEX IF NOT EXISTS idx_chat_messages_sender ON chat_messages("senderId");
CREATE INDEX IF NOT EXISTS idx_chat_messages_created ON chat_messages("createdAt");
CREATE INDEX IF NOT EXISTS idx_chat_messages_conversation_created ON chat_messages("conversationId", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS idx_chat_messages_status ON chat_messages(status);
