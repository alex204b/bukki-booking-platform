import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';

dotenv.config();

/**
 * Test script to verify requests can be saved to the Neon database
 */
async function testRequestSave() {
  const dbUrl = process.env.DATABASE_URL;
  
  if (!dbUrl) {
    console.error('❌ DATABASE_URL not set!');
    process.exit(1);
  }

  if (!dbUrl.includes('neon.tech')) {
    console.error('❌ DATABASE_URL does not point to Neon.tech!');
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
    console.log('✅ Connected to database\n');

    // Check if requests table exists
    const tableExists = await dataSource.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'requests'
      );
    `);

    if (!tableExists[0].exists) {
      console.error('❌ Requests table does NOT exist!');
      console.error('   Run: npm run ensure:requests-table');
      await dataSource.destroy();
      process.exit(1);
    }

    console.log('✅ Requests table exists\n');

    // Get a test business
    const businesses = await dataSource.query(`
      SELECT id, name, status 
      FROM businesses 
      LIMIT 1
    `);

    if (businesses.length === 0) {
      console.error('❌ No businesses found in database');
      await dataSource.destroy();
      process.exit(1);
    }

    const testBusiness = businesses[0];
    console.log(`📊 Using test business: ${testBusiness.name} (${testBusiness.id})\n`);

    // Test INSERT using raw SQL
    console.log('🧪 Testing raw SQL INSERT...');
    const insertResult = await dataSource.query(
      `INSERT INTO requests (
        "businessId",
        "requestType",
        status,
        reason,
        "requestedAt",
        metadata,
        "createdAt",
        "updatedAt"
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING id, "requestType", status, "createdAt"`,
      [
        testBusiness.id,
        'unsuspension',
        'pending',
        'Test request from verification script',
        new Date(),
        JSON.stringify({
          businessName: testBusiness.name,
          test: true,
        }),
        new Date(),
        new Date(),
      ]
    );

    const insertedId = insertResult[0].id;
    console.log(`✅ Successfully inserted request with ID: ${insertedId}`);

    // Verify the request was saved
    console.log('\n🔍 Verifying request was saved...');
    const verifyResult = await dataSource.query(
      `SELECT id, "requestType", status, reason, "createdAt" 
       FROM requests 
       WHERE id = $1`,
      [insertedId]
    );

    if (verifyResult.length === 0) {
      console.error('❌ CRITICAL: Request not found after insert!');
      await dataSource.destroy();
      process.exit(1);
    }

    console.log('✅ Request verified in database:');
    console.log(`   ID: ${verifyResult[0].id}`);
    console.log(`   Type: ${verifyResult[0].requestType}`);
    console.log(`   Status: ${verifyResult[0].status}`);
    console.log(`   Created: ${verifyResult[0].createdAt}`);

    // Clean up test request
    console.log('\n🧹 Cleaning up test request...');
    await dataSource.query(`DELETE FROM requests WHERE id = $1`, [insertedId]);
    console.log('✅ Test request deleted\n');

    // Count total requests
    const countResult = await dataSource.query(`SELECT COUNT(*) as count FROM requests`);
    console.log(`📊 Total requests in database: ${countResult[0].count}`);

    console.log('\n✅ All tests passed! Requests can be saved to the database.\n');
    await dataSource.destroy();
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    console.error('   Details:', error);
    await dataSource.destroy();
    process.exit(1);
  }
}

testRequestSave();

