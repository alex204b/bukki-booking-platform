-- Migration: Create business_members table for employee invitations
-- This table stores invitations and active memberships for businesses

-- Create business_members table
CREATE TABLE IF NOT EXISTS business_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "businessId" UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    "userId" UUID REFERENCES users(id) ON DELETE SET NULL,
    email VARCHAR(255) NOT NULL,
    status VARCHAR(20) DEFAULT 'invited' CHECK (status IN ('invited', 'active', 'removed')),
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_business_members_business ON business_members("businessId");
CREATE INDEX IF NOT EXISTS idx_business_members_user ON business_members("userId");
CREATE INDEX IF NOT EXISTS idx_business_members_email ON business_members(email);
CREATE INDEX IF NOT EXISTS idx_business_members_status ON business_members(status);

-- Update users table to include 'employee' role
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('customer', 'business_owner', 'employee', 'super_admin'));

-- Create trigger for updated_at
CREATE TRIGGER update_business_members_updated_at BEFORE UPDATE ON business_members
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

