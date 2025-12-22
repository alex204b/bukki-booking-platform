const { Client } = require('pg');
require('dotenv').config();

async function checkBusinesses() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('✅ Connected to Neon database\n');

    // Get all businesses with their owner info
    const result = await client.query(`
      SELECT
        b.id,
        b.name,
        b.status,
        b."isActive",
        b.latitude,
        b.longitude,
        b.city,
        b.state,
        b.country,
        b.category,
        b."createdAt",
        u.email as owner_email
      FROM businesses b
      LEFT JOIN users u ON b."ownerId" = u.id
      ORDER BY b."createdAt" DESC
    `);

    console.log(`📊 Total businesses in Neon: ${result.rows.length}\n`);

    if (result.rows.length === 0) {
      console.log('❌ NO BUSINESSES FOUND IN NEON DATABASE!');
      console.log('This means your businesses are still in the local database.');
      return;
    }

    // Group by status
    const approved = result.rows.filter(b => b.status === 'approved' && b.isActive);
    const pending = result.rows.filter(b => b.status === 'pending');
    const rejected = result.rows.filter(b => b.status === 'rejected');
    const inactive = result.rows.filter(b => !b.isActive);

    console.log('📈 Business Status Summary:');
    console.log(`  ✅ Approved & Active: ${approved.length}`);
    console.log(`  ⏳ Pending: ${pending.length}`);
    console.log(`  ❌ Rejected: ${rejected.length}`);
    console.log(`  💤 Inactive: ${inactive.length}\n`);

    console.log('📋 All Businesses:\n');
    result.rows.forEach((b, i) => {
      console.log(`${i + 1}. ${b.name}`);
      console.log(`   Owner: ${b.owner_email}`);
      console.log(`   Status: ${b.status} | Active: ${b.isActive}`);
      console.log(`   Location: ${b.city}, ${b.state}, ${b.country}`);
      console.log(`   Coordinates: ${b.latitude ? `${b.latitude}, ${b.longitude}` : 'NO COORDINATES ❌'}`);
      console.log(`   Category: ${b.category}`);
      console.log(`   Created: ${b.createdAt}`);

      // Check if it would appear in search
      const willAppearInSearch = b.status === 'approved' && b.isActive;
      const willAppearOnMap = willAppearInSearch && b.latitude && b.longitude;

      console.log(`   🔍 Will appear in search: ${willAppearInSearch ? 'YES ✅' : 'NO ❌'}`);
      console.log(`   🗺️  Will appear on map: ${willAppearOnMap ? 'YES ✅' : 'NO ❌'}`);
      console.log('');
    });

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.end();
  }
}

checkBusinesses();
