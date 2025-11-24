-- Add missing fields to businesses table
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS "showRevenue" BOOLEAN DEFAULT false;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS "autoAcceptBookings" BOOLEAN DEFAULT false;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS "maxBookingsPerUserPerDay" INTEGER DEFAULT 2;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS "onboardingCompleted" BOOLEAN DEFAULT false;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS "latitude" DOUBLE PRECISION;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS "longitude" DOUBLE PRECISION;

-- Add indexes for better performance on location-based queries
CREATE INDEX IF NOT EXISTS idx_businesses_location ON businesses(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_businesses_city ON businesses(city);
CREATE INDEX IF NOT EXISTS idx_businesses_status ON businesses(status);

