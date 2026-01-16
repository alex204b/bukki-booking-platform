-- Change rating column from integer to decimal to support fractional ratings
ALTER TABLE businesses
ALTER COLUMN rating TYPE DECIMAL(3, 1);

-- Update any existing ratings to 0.0
UPDATE businesses
SET rating = 0.0
WHERE rating IS NULL;
