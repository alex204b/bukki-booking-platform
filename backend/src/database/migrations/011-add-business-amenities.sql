-- Migration: Add amenities and priceRange to businesses table
-- Description: Add fields for business amenities/features and price range to enable AI-powered filtering

-- Add amenities column (JSONB array for storing facility features)
ALTER TABLE businesses
ADD COLUMN IF NOT EXISTS amenities JSONB DEFAULT '[]'::jsonb;

-- Add priceRange column (cheap, moderate, expensive)
ALTER TABLE businesses
ADD COLUMN IF NOT EXISTS "priceRange" VARCHAR(20);

-- Add comments for documentation
COMMENT ON COLUMN businesses.amenities IS 'Array of amenity codes like parking, wheelchair_accessible, wifi, outdoor_seating, air_conditioned';
COMMENT ON COLUMN businesses."priceRange" IS 'Price range indicator: cheap, moderate, expensive, or NULL for unspecified';

-- Create index on amenities for faster filtering
CREATE INDEX IF NOT EXISTS idx_businesses_amenities ON businesses USING GIN (amenities);

-- Create index on priceRange for filtering
CREATE INDEX IF NOT EXISTS idx_businesses_price_range ON businesses ("priceRange");
