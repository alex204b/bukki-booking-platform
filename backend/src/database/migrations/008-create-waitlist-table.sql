-- Migration: 008-create-waitlist-table.sql
-- Create waitlist table for managing customer waitlists

CREATE TABLE "waitlist" (
  "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
  "status" character varying NOT NULL DEFAULT 'active',
  "preferredDate" timestamp NULL,
  "notifiedAt" timestamp NULL,
  "bookedAt" timestamp NULL,
  "notes" character varying NULL,
  "customerId" uuid NOT NULL,
  "businessId" uuid NOT NULL,
  "serviceId" uuid NULL,
  "createdAt" timestamp NOT NULL DEFAULT now(),
  "updatedAt" timestamp NOT NULL DEFAULT now(),
  "deletedAt" timestamp NULL,
  CONSTRAINT "PK_waitlist" PRIMARY KEY ("id"),
  CONSTRAINT "FK_waitlist_customer" FOREIGN KEY ("customerId") REFERENCES "users"("id") ON DELETE CASCADE,
  CONSTRAINT "FK_waitlist_business" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE,
  CONSTRAINT "FK_waitlist_service" FOREIGN KEY ("serviceId") REFERENCES "services"("id") ON DELETE CASCADE
);

-- Create enum type for waitlist status
DO $$ BEGIN
  CREATE TYPE "waitlist_status_enum" AS ENUM ('active', 'notified', 'booked', 'cancelled');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Update status column to use enum (if needed, otherwise keep as varchar)
-- ALTER TABLE "waitlist" ALTER COLUMN "status" TYPE waitlist_status_enum USING status::waitlist_status_enum;

-- Add indexes for faster queries
CREATE INDEX "IDX_WAITLIST_CUSTOMER" ON "waitlist" ("customerId");
CREATE INDEX "IDX_WAITLIST_BUSINESS" ON "waitlist" ("businessId");
CREATE INDEX "IDX_WAITLIST_SERVICE" ON "waitlist" ("serviceId");
CREATE INDEX "IDX_WAITLIST_STATUS" ON "waitlist" ("status");
CREATE INDEX "IDX_WAITLIST_CREATED_AT" ON "waitlist" ("createdAt");

