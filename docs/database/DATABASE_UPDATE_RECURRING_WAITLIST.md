# Database Update for Recurring Bookings and Waitlist Features

This document outlines the necessary steps to update your database schema to support the new recurring bookings and waitlist features.

## Changes Introduced

### 1. Recurring Booking Fields (bookings table)
The following fields have been added to the `bookings` table:
- `isRecurring` (boolean, default: false) - Indicates if this is a recurring booking
- `recurrencePattern` (varchar, nullable) - Pattern: 'weekly', 'biweekly', or 'monthly'
- `recurrenceEndDate` (timestamp, nullable) - End date for the recurring series
- `parentBookingId` (varchar, nullable) - Links child bookings to the parent booking
- `recurrenceSequence` (integer, nullable) - Sequence number in the recurring series

### 2. Waitlist Table (new table)
A new `waitlist` table has been created with:
- Customer, business, and service relationships
- Status tracking (active, notified, booked, cancelled)
- Preferred date and notes
- Notification timestamps

## How to Apply the Update

### Development Environment (`NODE_ENV=development`)

If `synchronize: true` is set in your `TypeOrmModule.forRoot` configuration (which is typically the case in development), TypeORM will automatically apply these schema changes when the backend starts.

**Steps:**
1. Ensure your backend's `AppModule` has `synchronize: true` for development.
2. Start your backend application:
   ```bash
   cd backend
   npm start
   ```
3. TypeORM will detect the new columns and table and apply them automatically. You should see logs indicating schema synchronization.

### Production Environment (`NODE_ENV=production`)

In a production environment, `synchronize: true` should be set to `false` to prevent accidental data loss. You should use a proper migration strategy. SQL migration scripts have been generated for this purpose.

**Steps:**
1. **Backup your database:** Before running any migrations, always back up your production database.

2. Locate the migration files:
   - `backend/src/database/migrations/007-add-recurring-booking-fields.sql`
   - `backend/src/database/migrations/008-create-waitlist-table.sql`

3. Connect to your PostgreSQL database using a client like `psql`, DBeaver, pgAdmin, or your cloud provider's console.

4. Execute the SQL commands from the migration files in order:

   **First, add recurring booking fields:**
   ```sql
   ALTER TABLE "bookings"
   ADD COLUMN "isRecurring" boolean NOT NULL DEFAULT false,
   ADD COLUMN "recurrencePattern" character varying NULL,
   ADD COLUMN "recurrenceEndDate" timestamp NULL,
   ADD COLUMN "parentBookingId" character varying NULL,
   ADD COLUMN "recurrenceSequence" integer NULL;

   CREATE INDEX "IDX_BOOKING_PARENT_ID" ON "bookings" ("parentBookingId");
   CREATE INDEX "IDX_BOOKING_IS_RECURRING" ON "bookings" ("isRecurring");
   ```

   **Then, create the waitlist table:**
   ```sql
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

   CREATE INDEX "IDX_WAITLIST_CUSTOMER" ON "waitlist" ("customerId");
   CREATE INDEX "IDX_WAITLIST_BUSINESS" ON "waitlist" ("businessId");
   CREATE INDEX "IDX_WAITLIST_SERVICE" ON "waitlist" ("serviceId");
   CREATE INDEX "IDX_WAITLIST_STATUS" ON "waitlist" ("status");
   CREATE INDEX "IDX_WAITLIST_CREATED_AT" ON "waitlist" ("createdAt");
   ```

5. Verify the changes by inspecting the `bookings` table schema and the new `waitlist` table.

## Post-Update

After the database is updated, restart your backend application to ensure it uses the new schema. The recurring bookings and waitlist functionality will then be fully operational.

## Notes

- The `isRecurring` field defaults to `false` for all existing bookings, so existing data will not be affected.
- The waitlist table is completely new, so there's no existing data to migrate.
- All foreign key constraints ensure data integrity between waitlist entries and related entities.

