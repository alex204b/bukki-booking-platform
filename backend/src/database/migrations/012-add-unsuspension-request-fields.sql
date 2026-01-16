-- Migration: Add unsuspension request fields to businesses table
-- Description: Add fields to track unsuspension requests from business owners

-- Add unsuspensionRequestedAt column (timestamp when request was made)
ALTER TABLE businesses
ADD COLUMN IF NOT EXISTS "unsuspensionRequestedAt" TIMESTAMP;

-- Add unsuspensionRequestReason column (text reason provided by business owner)
ALTER TABLE businesses
ADD COLUMN IF NOT EXISTS "unsuspensionRequestReason" TEXT;

-- Add comments for documentation
COMMENT ON COLUMN businesses."unsuspensionRequestedAt" IS 'Timestamp when business owner requested unsuspension';
COMMENT ON COLUMN businesses."unsuspensionRequestReason" IS 'Reason provided by business owner for unsuspension request';

-- Create index on unsuspensionRequestedAt for faster queries on pending requests
CREATE INDEX IF NOT EXISTS idx_businesses_unsuspension_requested_at ON businesses ("unsuspensionRequestedAt") 
WHERE "unsuspensionRequestedAt" IS NOT NULL;

