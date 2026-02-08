-- Add optional priceMax for price range (e.g. "from 10 to 50")
ALTER TABLE services ADD COLUMN IF NOT EXISTS "priceMax" DECIMAL(10, 2) NULL;
COMMENT ON COLUMN services."priceMax" IS 'Optional max price for range display; when set, price is min';
