-- Migration 018: Create Notifications Table
-- This migration creates the notifications table for non-chat notifications (promotional, team invitations, system notifications)

CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "recipientId" UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    "senderId" UUID REFERENCES users(id) ON DELETE SET NULL,
    "businessId" UUID REFERENCES businesses(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL CHECK (type IN (
        'team_invitation',
        'promotional_offer',
        'system_notification',
        'booking_confirmed',
        'booking_reminder',
        'review_request',
        'business_update',
        'special_announcement'
    )),
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    status VARCHAR(20) DEFAULT 'unread' CHECK (status IN ('unread', 'read', 'archived', 'deleted')),
    metadata JSONB, -- For offer codes, invitation links, etc.
    "actionUrl" VARCHAR(500), -- Deep link for clicking notification
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "readAt" TIMESTAMP,
    "deletedAt" TIMESTAMP
);

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_notifications_recipient ON notifications("recipientId");
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_status ON notifications(status);
CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications("createdAt" DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_recipient_status ON notifications("recipientId", status) WHERE status = 'unread';
CREATE INDEX IF NOT EXISTS idx_notifications_business ON notifications("businessId") WHERE "businessId" IS NOT NULL;
