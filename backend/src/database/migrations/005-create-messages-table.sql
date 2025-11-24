CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "recipientId" UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    "businessId" UUID REFERENCES businesses(id) ON DELETE CASCADE,
    "senderId" UUID REFERENCES users(id) ON DELETE SET NULL,
    type VARCHAR(20) NOT NULL CHECK (type IN ('team_invitation', 'promotional_offer')),
    subject VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    status VARCHAR(20) DEFAULT 'unread' CHECK (status IN ('unread', 'read', 'archived')),
    metadata JSONB,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_messages_recipient ON messages("recipientId");
CREATE INDEX IF NOT EXISTS idx_messages_business ON messages("businessId");
CREATE INDEX IF NOT EXISTS idx_messages_status ON messages(status);
CREATE INDEX IF NOT EXISTS idx_messages_type ON messages(type);

