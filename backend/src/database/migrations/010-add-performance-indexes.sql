-- Migration: 010-add-performance-indexes.sql
-- Adds additional indexes for query performance optimization
-- Created: 2025-12-05

-- ========================================
-- COMPOSITE INDEXES FOR COMMON QUERIES
-- ========================================

-- Bookings: Filter by business + status (used in business dashboard)
CREATE INDEX IF NOT EXISTS idx_bookings_business_status
  ON bookings("businessId", status);

-- Bookings: Filter by business + date range (used for scheduling)
CREATE INDEX IF NOT EXISTS idx_bookings_business_date
  ON bookings("businessId", "appointmentDate");

-- Bookings: Filter by customer + status (used in customer's booking history)
CREATE INDEX IF NOT EXISTS idx_bookings_customer_status
  ON bookings("customerId", status);

-- Bookings: Recurring bookings (parent lookup)
CREATE INDEX IF NOT EXISTS idx_bookings_parent
  ON bookings("parentBookingId")
  WHERE "parentBookingId" IS NOT NULL;

-- Bookings: Checked-in status (for trust score updates)
CREATE INDEX IF NOT EXISTS idx_bookings_checkin
  ON bookings("checkedIn", "checkedInAt")
  WHERE "checkedIn" = true;

-- Services: Active services per business (used in service listing)
CREATE INDEX IF NOT EXISTS idx_services_business_active
  ON services("businessId", "isActive");

-- Businesses: Active + approved (used in search/nearby queries)
CREATE INDEX IF NOT EXISTS idx_businesses_active_status
  ON businesses("isActive", status)
  WHERE "isActive" = true AND status = 'approved';

-- Reviews: Business ratings (for calculating average)
CREATE INDEX IF NOT EXISTS idx_reviews_business_rating
  ON reviews("businessId", rating);

-- Messages: Unread messages per recipient (notification count)
CREATE INDEX IF NOT EXISTS idx_messages_recipient_status
  ON messages("recipientId", status);

-- Messages: Chat messages (businessId + createdAt for conversation)
CREATE INDEX IF NOT EXISTS idx_messages_chat_conversation
  ON messages("businessId", "senderId", "createdAt")
  WHERE type = 'chat';

-- Waitlist: Active waitlist per business
CREATE INDEX IF NOT EXISTS idx_waitlist_business_active
  ON waitlist("businessId", status)
  WHERE status = 'active';

-- Offers: Active offers per business
CREATE INDEX IF NOT EXISTS idx_offers_business_active
  ON offers("businessId", "isActive", "validUntil")
  WHERE "isActive" = true;

-- ========================================
-- GEOSPATIAL INDEXES (for nearby search)
-- ========================================

-- Businesses: Lat/Lng for radius searches
-- Note: For production, consider using PostGIS extension for better performance
CREATE INDEX IF NOT EXISTS idx_businesses_latitude
  ON businesses(latitude)
  WHERE latitude IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_businesses_longitude
  ON businesses(longitude)
  WHERE longitude IS NOT NULL;

-- Composite geospatial index (for bounding box queries)
CREATE INDEX IF NOT EXISTS idx_businesses_geolocation
  ON businesses(latitude, longitude)
  WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

-- ========================================
-- ADDITIONAL ENTITY INDEXES
-- ========================================

-- Device Tokens: User lookup (for push notifications)
CREATE INDEX IF NOT EXISTS idx_device_tokens_user
  ON device_tokens("userId", "isActive")
  WHERE "isActive" = true;

-- Device Tokens: Token lookup (for deactivation)
CREATE INDEX IF NOT EXISTS idx_device_tokens_token
  ON device_tokens(token);

-- Favorites: User's favorites list
CREATE INDEX IF NOT EXISTS idx_favorites_user
  ON favorites("userId");

-- Favorites: Business favorites count
CREATE INDEX IF NOT EXISTS idx_favorites_business
  ON favorites("businessId");

-- Audit Logs: User activity tracking
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_created
  ON audit_logs("userId", "createdAt")
  WHERE "userId" IS NOT NULL;

-- Audit Logs: Entity audit trail
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity
  ON audit_logs("entityType", "entityId");

-- Business Contacts: Business email list
CREATE INDEX IF NOT EXISTS idx_business_contacts_business
  ON business_contacts("businessId", subscribed)
  WHERE subscribed = true;

-- Business Contacts: Email hash lookup (for encrypted email search)
CREATE INDEX IF NOT EXISTS idx_business_contacts_email_hash
  ON business_contacts("emailHash");

-- ========================================
-- TEXT SEARCH INDEXES (for search functionality)
-- ========================================

-- Businesses: Full-text search on name and description
-- Note: Requires pg_trgm extension. Uncomment if you install the extension:
-- CREATE EXTENSION IF NOT EXISTS pg_trgm;
-- CREATE INDEX IF NOT EXISTS idx_businesses_name_trgm
--   ON businesses USING gin(name gin_trgm_ops);

-- Services: Name search
CREATE INDEX IF NOT EXISTS idx_services_name
  ON services(name);

-- ========================================
-- PERFORMANCE NOTES
-- ========================================

-- 1. These indexes significantly improve query performance for:
--    - Business dashboard queries (bookings by business + status)
--    - Customer booking history (bookings by customer)
--    - Nearby business search (geolocation)
--    - Notification queries (unread messages, active waitlist)
--    - Analytics queries (reviews, ratings)

-- 2. Partial indexes (WHERE clauses) are used to:
--    - Reduce index size
--    - Speed up writes
--    - Focus on commonly queried data

-- 3. For large-scale deployments, consider:
--    - PostGIS extension for advanced geospatial queries
--    - Full-text search extensions (pg_trgm, ts_vector)
--    - Regular VACUUM and ANALYZE maintenance
--    - Monitoring index usage with pg_stat_user_indexes

-- ========================================
-- RECOMMENDATIONS FOR FUTURE
-- ========================================

-- If using PostGIS for production geospatial queries:
-- CREATE EXTENSION IF NOT EXISTS postgis;
-- ALTER TABLE businesses ADD COLUMN geom geometry(Point, 4326);
-- UPDATE businesses SET geom = ST_SetSRID(ST_MakePoint(longitude, latitude), 4326);
-- CREATE INDEX idx_businesses_geom ON businesses USING GIST(geom);

-- For full-text search on business descriptions:
-- ALTER TABLE businesses ADD COLUMN search_vector tsvector;
-- UPDATE businesses SET search_vector = to_tsvector('english', name || ' ' || COALESCE(description, ''));
-- CREATE INDEX idx_businesses_search ON businesses USING GIN(search_vector);
