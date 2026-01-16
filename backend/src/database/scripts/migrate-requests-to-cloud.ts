import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';

dotenv.config();

async function migrateRequestsToCloud() {
  // Local database connection
  const localDataSource = new DataSource({
    type: 'postgres',
    host: process.env.LOCAL_DB_HOST || 'localhost',
    port: parseInt(process.env.LOCAL_DB_PORT || '5432'),
    username: process.env.LOCAL_DB_USERNAME || 'postgres',
    password: process.env.LOCAL_DB_PASSWORD || 'password',
    database: process.env.LOCAL_DB_NAME || 'booking_platform',
  });

  // Cloud database connection (Neon.tech)
  const cloudDbUrl = process.env.DATABASE_URL;
  if (!cloudDbUrl) {
    console.error('✗ DATABASE_URL not set! Cannot connect to cloud database.');
    process.exit(1);
  }

  const cloudDataSource = new DataSource({
    type: 'postgres',
    url: cloudDbUrl,
    ssl: { rejectUnauthorized: false },
  });

  try {
    // Connect to local database
    console.log('📦 Connecting to local database...');
    await localDataSource.initialize();
    console.log('✓ Local database connected');

    // Connect to cloud database
    console.log('☁️  Connecting to Neon.tech...');
    await cloudDataSource.initialize();
    console.log('✓ Cloud database connected');

    // Step 1: Check if requests table exists in cloud, if not create it
    console.log('\n📋 Checking requests table in cloud...');
    const tableExists = await cloudDataSource.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'requests'
      );
    `);

    if (!tableExists[0].exists) {
      console.log('⚠️  Requests table not found, creating it...');
      await cloudDataSource.query(`
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
      console.log('✓ Requests table created');
    }

    // Step 2: Get unsuspension requests from local businesses table
    console.log('\n📥 Fetching unsuspension requests from local database...');
    const localRequests = await localDataSource.query(`
      SELECT 
        b.id as "businessId",
        b.name as "businessName",
        b."unsuspensionRequestedAt",
        b."unsuspensionRequestReason",
        b.status,
        u.id as "ownerId",
        u.email as "ownerEmail",
        u."firstName" as "ownerFirstName",
        u."lastName" as "ownerLastName",
        b."createdAt",
        b."updatedAt"
      FROM businesses b
      LEFT JOIN users u ON b."ownerId" = u.id
      WHERE b."unsuspensionRequestedAt" IS NOT NULL
    `);

    console.log(`Found ${localRequests.length} unsuspension request(s) in local database`);

    if (localRequests.length === 0) {
      console.log('⚠️  No requests to migrate');
      await localDataSource.destroy();
      await cloudDataSource.destroy();
      return;
    }

    // Step 3: Check which businesses exist in cloud
    console.log('\n🔍 Checking which businesses exist in cloud...');
    const cloudBusinessIds = await cloudDataSource.query(`
      SELECT id FROM businesses
    `);
    const cloudBusinessIdSet = new Set(cloudBusinessIds.map((b: any) => b.id));

    // Step 4: Migrate requests to cloud
    console.log('\n☁️  Migrating requests to cloud...');
    let migrated = 0;
    let skipped = 0;

    for (const request of localRequests) {
      // Check if business exists in cloud
      if (!cloudBusinessIdSet.has(request.businessId)) {
        console.log(`⚠️  Skipping request for business ${request.businessId} - business not found in cloud`);
        skipped++;
        continue;
      }

      // Check if request already exists
      const existing = await cloudDataSource.query(`
        SELECT id FROM requests 
        WHERE "businessId" = $1 AND "requestType" = 'unsuspension'
      `, [request.businessId]);

      if (existing.length > 0) {
        console.log(`⚠️  Request for business ${request.businessId} already exists, skipping`);
        skipped++;
        continue;
      }

      // Insert request
      await cloudDataSource.query(`
        INSERT INTO requests (
          "businessId",
          "requestType",
          status,
          reason,
          "requestedAt",
          metadata,
          "createdAt",
          "updatedAt"
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `, [
        request.businessId,
        'unsuspension',
        'pending',
        request.unsuspensionRequestReason || null,
        request.unsuspensionRequestedAt,
        JSON.stringify({
          businessName: request.businessName,
          ownerEmail: request.ownerEmail || 'unknown',
          ownerId: request.ownerId || 'unknown',
          ownerFirstName: request.ownerFirstName,
          ownerLastName: request.ownerLastName,
          migratedFrom: 'local_database'
        }),
        request.createdAt || request.unsuspensionRequestedAt,
        request.updatedAt || request.unsuspensionRequestedAt
      ]);

      migrated++;
      console.log(`✓ Migrated request for business: ${request.businessName}`);
    }

    console.log(`\n✅ Migration complete!`);
    console.log(`   Migrated: ${migrated} request(s)`);
    console.log(`   Skipped: ${skipped} request(s)`);

    // Step 5: Verify
    const cloudRequests = await cloudDataSource.query(`
      SELECT COUNT(*) as count FROM requests WHERE "requestType" = 'unsuspension'
    `);
    console.log(`\n📊 Total unsuspension requests in cloud: ${cloudRequests[0].count}`);

    await localDataSource.destroy();
    await cloudDataSource.destroy();
  } catch (error: any) {
    console.error('✗ Migration failed:', error.message);
    console.error(error);
    process.exit(1);
  }
}

migrateRequestsToCloud();

