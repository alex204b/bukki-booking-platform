-- Migration: Add business type and booking assignment
-- personal_service: one employee per customer (barbers, mechanics)
-- parallel: multiple customers at once (restaurants with tables)

ALTER TABLE businesses ADD COLUMN IF NOT EXISTS "businessType" VARCHAR(50) DEFAULT 'personal_service'
  CHECK ("businessType" IN ('personal_service', 'parallel'));

ALTER TABLE businesses ADD COLUMN IF NOT EXISTS "bookingAssignment" VARCHAR(50) DEFAULT 'auto'
  CHECK ("bookingAssignment" IN ('auto', 'manual'));

COMMENT ON COLUMN businesses."businessType" IS 'personal_service: 1 employee per customer. parallel: tables/multi-slot';
COMMENT ON COLUMN businesses."bookingAssignment" IS 'For personal_service: auto=distribute by algorithm, manual=owner assigns';
