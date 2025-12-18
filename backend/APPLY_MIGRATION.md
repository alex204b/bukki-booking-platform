# How to Apply Migration 010

## Quick Start

Choose one of the methods below to apply the performance indexes migration:

## Method 1: Using the Migration Script (Recommended)

```bash
cd backend

# Make sure environment variables are loaded
# The script reads: DB_HOST, DB_PORT, DB_USERNAME, DB_PASSWORD, DB_NAME

# Run the migration script
npx ts-node src/database/scripts/apply-migration-010.ts
```

**Expected Output:**
```
🚀 Starting migration 010: Add Performance Indexes
================================================

📡 Connecting to database...
✅ Connected successfully

📄 Reading migration file: ...
✅ Migration file loaded (XXXX characters)

⚡ Applying migration...
✅ Migration applied successfully in XXms

🔍 Verifying indexes...
✅ Found XX indexes

📊 New indexes from migration 010: XX
   - idx_bookings_business_status on bookings
   - idx_bookings_business_date on bookings
   ...

================================================
🎉 Migration completed successfully!
================================================
```

## Method 2: Direct SQL (For Production/Managed Databases)

### For Neon, Railway, or Supabase:

1. Open your database dashboard
2. Navigate to SQL Editor
3. Copy the contents of: `src/database/migrations/010-add-performance-indexes.sql`
4. Paste and execute

### For Local PostgreSQL:

```bash
psql -U your_username -d booking_platform -f src/database/migrations/010-add-performance-indexes.sql
```

## Method 3: Using Database Client (pgAdmin, DBeaver, etc.)

1. Connect to your database
2. Open SQL query window
3. Load file: `src/database/migrations/010-add-performance-indexes.sql`
4. Execute

## Verification

After applying, verify the indexes were created:

```sql
-- Check all indexes
SELECT
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;

-- Check specific index
\d bookings
```

You should see indexes like:
- `idx_bookings_business_status`
- `idx_bookings_business_date`
- `idx_businesses_geolocation`
- `idx_messages_recipient_status`
- And many more...

## Rollback (If Needed)

If you need to remove the indexes:

```sql
-- Drop all indexes from migration 010
DROP INDEX IF EXISTS idx_bookings_business_status;
DROP INDEX IF EXISTS idx_bookings_business_date;
DROP INDEX IF EXISTS idx_bookings_customer_status;
DROP INDEX IF EXISTS idx_bookings_parent;
DROP INDEX IF EXISTS idx_bookings_checkin;
DROP INDEX IF EXISTS idx_services_business_active;
DROP INDEX IF EXISTS idx_businesses_active_status;
DROP INDEX IF EXISTS idx_reviews_business_rating;
DROP INDEX IF EXISTS idx_messages_recipient_status;
DROP INDEX IF EXISTS idx_messages_chat_conversation;
DROP INDEX IF EXISTS idx_waitlist_business_active;
DROP INDEX IF EXISTS idx_offers_business_active;
DROP INDEX IF EXISTS idx_businesses_latitude;
DROP INDEX IF EXISTS idx_businesses_longitude;
DROP INDEX IF EXISTS idx_businesses_geolocation;
DROP INDEX IF EXISTS idx_device_tokens_user;
DROP INDEX IF EXISTS idx_device_tokens_token;
DROP INDEX IF EXISTS idx_favorites_user;
DROP INDEX IF EXISTS idx_favorites_business;
DROP INDEX IF EXISTS idx_audit_logs_user_created;
DROP INDEX IF EXISTS idx_audit_logs_entity;
DROP INDEX IF EXISTS idx_business_contacts_business;
DROP INDEX IF EXISTS idx_business_contacts_email_hash;
DROP INDEX IF EXISTS idx_businesses_name_trgm;
DROP INDEX IF EXISTS idx_services_name;
```

## Troubleshooting

### Error: "relation does not exist"

**Solution**: Ensure previous migrations (001-009) have been applied first.

### Error: "pg_trgm extension does not exist"

**Solution**: Comment out the trigram index in the migration file:
```sql
-- CREATE INDEX IF NOT EXISTS idx_businesses_name_trgm ...
```

Or install the extension (requires superuser):
```sql
CREATE EXTENSION IF NOT EXISTS pg_trgm;
```

### Migration is slow (taking > 1 minute)

**Cause**: Large tables with millions of rows.

**Solution**: Indexes are being created. This is normal. For very large tables, consider creating indexes CONCURRENTLY (see guide).

## Next Steps

After applying the migration:

1. ✅ Restart your backend server
2. ✅ Monitor query performance
3. ✅ Check application logs for any errors
4. ✅ Test critical features (booking creation, business search)

Performance should improve significantly!
