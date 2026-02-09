const { Client } = require('pg');
require('dotenv').config();

async function exportLocalDatabase() {
  // Connect to LOCAL database
  const localClient = new Client({
    host: 'localhost',
    port: 5432,
    database: 'booking_platform', // Your local database name
    user: 'postgres',
    password: 'portport1234' // Update if different
  });

  try {
    await localClient.connect();
    console.log('✅ Connected to LOCAL database\n');

    // Count all tables
    const tables = [
      'users',
      'businesses',
      'services',
      'bookings',
      'reviews',
      'business_members',
      'business_contacts',
      'messages',
      'notifications',
      'favorites',
      'offers',
      'waitlist'
    ];

    console.log('📊 Data Summary in LOCAL database:\n');

    for (const table of tables) {
      try {
        const result = await localClient.query(`SELECT COUNT(*) as count FROM ${table}`);
        console.log(`  ${table}: ${result.rows[0].count} records`);
      } catch (err) {
        console.log(`  ${table}: Table doesn't exist or error`);
      }
    }

    // Get businesses from local database
    console.log('\n📋 Businesses in LOCAL database:\n');
    const businesses = await localClient.query(`
      SELECT
        b.id,
        b.name,
        b.status,
        b."isActive",
        b.latitude,
        b.longitude,
        b.city,
        b.state,
        u.email as owner_email
      FROM businesses b
      LEFT JOIN users u ON b."ownerId" = u.id
      ORDER BY b."createdAt" DESC
    `);

    businesses.rows.forEach((b, i) => {
      console.log(`${i + 1}. ${b.name} (${b.status}) - Owner: ${b.owner_email}`);
    });

    console.log(`\n📊 Total: ${businesses.rows.length} businesses in local database`);

  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.message.includes('does not exist')) {
      console.log('\n⚠️  Could not connect to local database.');
      console.log('Your local database might not be running or credentials are incorrect.');
    }
  } finally {
    await localClient.end();
  }
}

exportLocalDatabase();
