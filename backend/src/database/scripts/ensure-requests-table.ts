import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';

dotenv.config();

/**
 * Script to ensure the requests table exists in the Neon database
 * This will create the table if it doesn't exist
 */
async function ensureRequestsTable() {
  const dbUrl = process.env.DATABASE_URL;
  
  if (!dbUrl) {
    console.error('❌ DATABASE_URL not set!');
    process.exit(1);
  }

  if (!dbUrl.includes('neon.tech')) {
    console.error('❌ DATABASE_URL does not point to Neon.tech!');
    console.error('   Current URL:', dbUrl.substring(0, 50) + '...');
    process.exit(1);
  }

  const dataSource = new DataSource({
    type: 'postgres',
    url: dbUrl,
    ssl: { rejectUnauthorized: false },
  });

  try {
    console.log('🔌 Connecting to Neon.tech database...');
    await dataSource.initialize();
    console.log('✅ Connected to database');

    // Check if requests table exists
    console.log('\n📋 Checking if requests table exists...');
    const tableExists = await dataSource.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'requests'
      );
    `);

    if (tableExists[0].exists) {
      console.log('✅ Requests table already exists');
      
      // Count existing requests
      const count = await dataSource.query(`SELECT COUNT(*) as count FROM requests`);
      console.log(`📊 Total requests in database: ${count[0].count}`);
    } else {
      console.log('⚠️  Requests table does NOT exist. Creating it now...');
      
      // Create the requests table
      await dataSource.query(`
        CREATE TABLE requests (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          "businessId" UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
          "requestType" VARCHAR(50) NOT NULL,
          status VARCHAR(20) NOT NULL DEFAULT 'pending',
          reason TEXT,
          "adminResponse" TEXT,
          "requestedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "respondedAt" TIMESTAMP,
          "respondedBy" UUID REFERENCES users(id) ON DELETE SET NULL,
          metadata JSONB,
          "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "deletedAt" TIMESTAMP
        );
      `);
      console.log('✅ Requests table created');

      // Create indexes
      console.log('📊 Creating indexes...');
      await dataSource.query(`
        CREATE INDEX IF NOT EXISTS idx_requests_business_id ON requests("businessId");
        CREATE INDEX IF NOT EXISTS idx_requests_type ON requests("requestType");
        CREATE INDEX IF NOT EXISTS idx_requests_status ON requests(status);
        CREATE INDEX IF NOT EXISTS idx_requests_pending ON requests("requestType", status) WHERE status = 'pending';
        CREATE INDEX IF NOT EXISTS idx_requests_created_at ON requests("createdAt" DESC);
      `);
      console.log('✅ Indexes created');

      // Add comments
      await dataSource.query(`
        COMMENT ON TABLE requests IS 'Stores all types of business requests (unsuspension, verification, appeals, etc.)';
        COMMENT ON COLUMN requests."requestType" IS 'Type of request: unsuspension, verification, appeal, etc.';
        COMMENT ON COLUMN requests.status IS 'Request status: pending, approved, rejected, cancelled';
      `);
      console.log('✅ Table comments added');

      // Migrate any existing unsuspension requests from businesses table
      console.log('\n🔄 Checking for existing unsuspension requests in businesses table...');
      const existingRequests = await dataSource.query(`
        SELECT COUNT(*) as count
        FROM businesses
        WHERE "unsuspensionRequestedAt" IS NOT NULL
      `);
      
      const count = parseInt(existingRequests[0].count);
      if (count > 0) {
        console.log(`📥 Found ${count} unsuspension request(s) in businesses table. Migrating...`);
        
        await dataSource.query(`
          INSERT INTO requests (
            "businessId",
            "requestType",
            status,
            reason,
            "requestedAt",
            metadata,
            "createdAt",
            "updatedAt"
          )
          SELECT 
            b.id,
            'unsuspension',
            'pending' as status,
            b."unsuspensionRequestReason" as reason,
            COALESCE(b."unsuspensionRequestedAt", CURRENT_TIMESTAMP) as "requestedAt",
            jsonb_build_object(
              'businessName', b.name,
              'ownerEmail', COALESCE(u.email, 'unknown'),
              'ownerId', COALESCE(u.id::text, 'unknown'),
              'migratedFrom', 'businesses_table'
            ) as metadata,
            COALESCE(b."unsuspensionRequestedAt", CURRENT_TIMESTAMP) as "createdAt",
            COALESCE(b."updatedAt", CURRENT_TIMESTAMP) as "updatedAt"
          FROM businesses b
          LEFT JOIN users u ON b."ownerId" = u.id
          WHERE b."unsuspensionRequestedAt" IS NOT NULL
          AND NOT EXISTS (
            SELECT 1 FROM requests r 
            WHERE r."businessId" = b.id 
            AND r."requestType" = 'unsuspension'
          );
        `);
        console.log(`✅ Migrated ${count} unsuspension request(s) to requests table`);
      } else {
        console.log('ℹ️  No existing unsuspension requests to migrate');
      }
    }

    // Verify the table structure
    console.log('\n🔍 Verifying table structure...');
    const columns = await dataSource.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_schema = 'public' 
      AND table_name = 'requests'
      ORDER BY ordinal_position;
    `);
    
    console.log('\n📋 Table columns:');
    columns.forEach((col: any) => {
      console.log(`   - ${col.column_name} (${col.data_type}) ${col.is_nullable === 'NO' ? 'NOT NULL' : 'NULL'}`);
    });

    console.log('\n✅ Requests table is ready!');
    await dataSource.destroy();
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    console.error('   Details:', error);
    await dataSource.destroy();
    process.exit(1);
  }
}

ensureRequestsTable();

