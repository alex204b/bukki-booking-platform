-- Migration: Add resource-based booking system
-- Description: Create resources table and enhance bookings/services for resource management

-- Step 1: Create resources table
CREATE TABLE IF NOT EXISTS resources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  type VARCHAR(50) NOT NULL CHECK (type IN ('staff', 'table', 'equipment', 'room')),
  "businessId" UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  "userId" UUID REFERENCES users(id) ON DELETE SET NULL,
  "isActive" BOOLEAN DEFAULT true,
  capacity INTEGER,
  metadata JSONB,
  "workingHours" JSONB,
  "sortOrder" INTEGER DEFAULT 0,
  "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "deletedAt" TIMESTAMP
);

-- Step 2: Create service_resources junction table
CREATE TABLE IF NOT EXISTS service_resources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "serviceId" UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  "resourceId" UUID NOT NULL REFERENCES resources(id) ON DELETE CASCADE,
  priority INTEGER DEFAULT 0,
  "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE("serviceId", "resourceId")
);

-- Step 3: Add resource fields to bookings table
ALTER TABLE bookings
ADD COLUMN IF NOT EXISTS "resourceId" UUID REFERENCES resources(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS "partySize" INTEGER;

-- Step 4: Add resource fields to services table
ALTER TABLE services
ADD COLUMN IF NOT EXISTS "resourceType" VARCHAR(50) CHECK ("resourceType" IN ('staff', 'table', 'equipment', 'room', NULL)),
ADD COLUMN IF NOT EXISTS "allowAnyResource" BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS "requireResourceSelection" BOOLEAN DEFAULT false;

-- Step 5: Add resource management field to businesses table
ALTER TABLE businesses
ADD COLUMN IF NOT EXISTS "requiresResources" BOOLEAN DEFAULT false;

-- Step 6: Create indexes for resources
CREATE INDEX IF NOT EXISTS idx_resources_business ON resources("businessId");
CREATE INDEX IF NOT EXISTS idx_resources_type ON resources(type);
CREATE INDEX IF NOT EXISTS idx_resources_user ON resources("userId");
CREATE INDEX IF NOT EXISTS idx_resources_active ON resources("isActive") WHERE "isActive" = true;
CREATE INDEX IF NOT EXISTS idx_resources_deleted ON resources("deletedAt") WHERE "deletedAt" IS NULL;

-- Step 7: Create indexes for service_resources junction
CREATE INDEX IF NOT EXISTS idx_service_resources_service ON service_resources("serviceId");
CREATE INDEX IF NOT EXISTS idx_service_resources_resource ON service_resources("resourceId");

-- Step 8: Create indexes for bookings
CREATE INDEX IF NOT EXISTS idx_bookings_resource ON bookings("resourceId");
CREATE INDEX IF NOT EXISTS idx_bookings_resource_date ON bookings("resourceId", "appointmentDate") WHERE status IN ('pending', 'confirmed');

-- Step 9: Add comments
COMMENT ON TABLE resources IS 'Stores resources (staff, tables, equipment, rooms) for resource-based booking';
COMMENT ON COLUMN resources.type IS 'Resource type: staff, table, equipment, room';
COMMENT ON COLUMN resources."userId" IS 'For staff resources: links to BusinessMember user';
COMMENT ON COLUMN resources.capacity IS 'For tables: party size capacity. For rooms: max occupancy';
COMMENT ON COLUMN resources.metadata IS 'Extensible metadata: {bio, skills, certifications, etc.}';
COMMENT ON COLUMN resources."workingHours" IS 'Optional resource-specific hours, inherits from business if NULL';

COMMENT ON TABLE service_resources IS 'Junction table linking services to resources';

COMMENT ON COLUMN bookings."resourceId" IS 'Resource assigned to this booking (staff, table, etc.)';
COMMENT ON COLUMN bookings."partySize" IS 'Party size for restaurant table bookings';

COMMENT ON COLUMN services."resourceType" IS 'Type of resource required for this service';
COMMENT ON COLUMN services."allowAnyResource" IS 'Allow "any available" resource selection';
COMMENT ON COLUMN services."requireResourceSelection" IS 'Force customer to select a specific resource';

COMMENT ON COLUMN businesses."requiresResources" IS 'Block bookings until resources are set up';
