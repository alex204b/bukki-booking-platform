import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';

dotenv.config();

async function migrateBusinessesToRequests() {
  // Connect to cloud database (Neon.tech)
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error('✗ DATABASE_URL not set! Cannot connect to cloud database.');
    process.exit(1);
  }

  const dataSource = new DataSource({
    type: 'postgres',
    url: dbUrl,
    ssl: { rejectUnauthorized: false },
  });

  try {
    console.log('☁️  Connecting to Neon.tech...');
    await dataSource.initialize();
    console.log('✓ Cloud database connected');

    // Step 1: Check if requests table exists, create if not
    console.log('\n📋 Checking requests table...');
    const tableExists = await dataSource.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'requests'
      );
    `);

    if (!tableExists[0].exists) {
      console.log('⚠️  Creating requests table...');
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
        
        CREATE INDEX IF NOT EXISTS idx_requests_business_id ON requests("businessId");
        CREATE INDEX IF NOT EXISTS idx_requests_type ON requests("requestType");
        CREATE INDEX IF NOT EXISTS idx_requests_status ON requests(status);
        CREATE INDEX IF NOT EXISTS idx_requests_pending ON requests("requestType", status) WHERE status = 'pending';
        CREATE INDEX IF NOT EXISTS idx_requests_created_at ON requests("createdAt" DESC);
      `);
      console.log('✓ Requests table created');
    }

    // Step 2: Check how many unsuspension requests exist in businesses table
    console.log('\n📥 Checking for unsuspension requests in businesses table...');
    const countResult = await dataSource.query(`
      SELECT COUNT(*) as count
      FROM businesses
      WHERE "unsuspensionRequestedAt" IS NOT NULL
    `);
    const count = parseInt(countResult[0].count);
    console.log(`Found ${count} unsuspension request(s) in businesses table`);

    if (count === 0) {
      console.log('⚠️  No requests to migrate');
      await dataSource.destroy();
      return;
    }

    // Step 3: Migrate data from businesses to requests table
    console.log('\n☁️  Migrating requests to requests table...');
    const result = await dataSource.query(`
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
          'ownerFirstName', u."firstName",
          'ownerLastName', u."lastName",
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
      )
      RETURNING id, "businessId", "requestType"
    `);

    console.log(`✅ Successfully migrated ${result.length} request(s)`);

    // Step 4: Verify
    const verifyResult = await dataSource.query(`
      SELECT COUNT(*) as count FROM requests WHERE "requestType" = 'unsuspension'
    `);
    console.log(`\n📊 Total unsuspension requests in requests table: ${verifyResult[0].count}`);

    // Show migrated requests
    const migratedRequests = await dataSource.query(`
      SELECT 
        r.id,
        r."requestType",
        r.status,
        b.name as business_name,
        r."requestedAt"
      FROM requests r
      JOIN businesses b ON r."businessId" = b.id
      WHERE r."requestType" = 'unsuspension'
      ORDER BY r."requestedAt" DESC
      LIMIT 10
    `);

    if (migratedRequests.length > 0) {
      console.log('\n📋 Sample of migrated requests:');
      migratedRequests.forEach((req: any, idx: number) => {
        console.log(`   ${idx + 1}. ${req.business_name} - ${req.status} - ${new Date(req.requestedAt).toLocaleString()}`);
      });
    }

    await dataSource.destroy();
    console.log('\n✅ Migration complete!');
  } catch (error: any) {
    console.error('✗ Migration failed:', error.message);
    console.error(error);
    process.exit(1);
  }
}

migrateBusinessesToRequests();

