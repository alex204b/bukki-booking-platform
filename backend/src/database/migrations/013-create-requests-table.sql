-- Migration: Create requests table and migrate existing unsuspension requests
-- Description: Create a scalable requests table and migrate data from businesses table

-- Step 1: Create requests table
CREATE TABLE IF NOT EXISTS requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "businessId" UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  "requestType" VARCHAR(50) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  reason TEXT,
  "adminResponse" TEXT,
  "requestedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "respondedAt" TIMESTAMP,
  "respondedBy" UUID REFERENCES users(id) ON DELETE SET NULL,
  metadata JSONB,
  "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "deletedAt" TIMESTAMP
);

-- Step 2: Create indexes
CREATE INDEX IF NOT EXISTS idx_requests_business_id ON requests("businessId");
CREATE INDEX IF NOT EXISTS idx_requests_type ON requests("requestType");
CREATE INDEX IF NOT EXISTS idx_requests_status ON requests(status);
CREATE INDEX IF NOT EXISTS idx_requests_pending ON requests("requestType", status) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_requests_created_at ON requests("createdAt" DESC);

-- Step 3: Migrate existing unsuspension requests from businesses table to requests table
INSERT INTO requests (
  "businessId",
  "requestType",
  status,
  reason,
  "requestedAt",
  metadata,
  "createdAt",
  "updatedAt"
)
SELECT 
  b.id,
  'unsuspension',
  'pending' as status,
  b."unsuspensionRequestReason" as reason,
  b."unsuspensionRequestedAt" as "requestedAt",
  jsonb_build_object(
    'businessName', b.name,
    'ownerEmail', u.email,
    'ownerId', u.id::text,
    'migratedFrom', 'businesses_table'
  ) as metadata,
  b."unsuspensionRequestedAt" as "createdAt",
  b."updatedAt"
FROM businesses b
JOIN users u ON b."ownerId" = u.id
WHERE b."unsuspensionRequestedAt" IS NOT NULL
AND NOT EXISTS (
  SELECT 1 FROM requests r 
  WHERE r."businessId" = b.id 
  AND r."requestType" = 'unsuspension'
);

-- Step 4: Add comments
COMMENT ON TABLE requests IS 'Stores all types of business requests (unsuspension, verification, appeals, etc.)';
COMMENT ON COLUMN requests."requestType" IS 'Type of request: unsuspension, verification, appeal, etc.';
COMMENT ON COLUMN requests.status IS 'Request status: pending, approved, rejected, cancelled';
