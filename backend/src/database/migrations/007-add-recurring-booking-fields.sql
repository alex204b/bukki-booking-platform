-- Migration: 007-add-recurring-booking-fields.sql
-- Add recurring booking fields to bookings table

ALTER TABLE "bookings"
ADD COLUMN "isRecurring" boolean NOT NULL DEFAULT false,
ADD COLUMN "recurrencePattern" character varying NULL,
ADD COLUMN "recurrenceEndDate" timestamp NULL,
ADD COLUMN "parentBookingId" character varying NULL,
ADD COLUMN "recurrenceSequence" integer NULL;

-- Add index for parent booking lookups
CREATE INDEX "IDX_BOOKING_PARENT_ID" ON "bookings" ("parentBookingId");

-- Add index for recurring bookings
CREATE INDEX "IDX_BOOKING_IS_RECURRING" ON "bookings" ("isRecurring");

