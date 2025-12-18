-- Create offers table
CREATE TABLE IF NOT EXISTS offers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    "discountAmount" DECIMAL(10, 2),
    "discountPercentage" DECIMAL(5, 2),
    "discountCode" VARCHAR(50),
    "validUntil" TIMESTAMP,
    "isActive" BOOLEAN DEFAULT true,
    metadata JSONB,
    "businessId" UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_offers_businessId ON offers("businessId");
CREATE INDEX IF NOT EXISTS idx_offers_isActive ON offers("isActive");
CREATE INDEX IF NOT EXISTS idx_offers_validUntil ON offers("validUntil");

