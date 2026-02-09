const { Client } = require('pg');
require('dotenv').config();

async function copyMissingBusiness() {
  // Connect to LOCAL database
  const localClient = new Client({
    host: 'localhost',
    port: 5432,
    database: 'booking_platform',
    user: 'postgres',
    password: 'portport1234'
  });

  // Connect to NEON database
  const neonClient = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await localClient.connect();
    await neonClient.connect();
    console.log('✅ Connected to both databases\n');

    // Find "IDk" business in local database
    const localBusiness = await localClient.query(`
      SELECT * FROM businesses WHERE name = 'IDk'
    `);

    if (localBusiness.rows.length === 0) {
      console.log('❌ Business "IDk" not found in local database');
      return;
    }

    const business = localBusiness.rows[0];
    console.log('📋 Found business in LOCAL database:');
    console.log(`   Name: ${business.name}`);
    console.log(`   Owner ID: ${business.ownerId}`);
    console.log(`   Status: ${business.status}`);
    console.log(`   Location: ${business.city}, ${business.state}`);
    console.log(`   Coordinates: ${business.latitude}, ${business.longitude}\n`);

    // Check if owner exists in Neon
    const owner = await neonClient.query('SELECT * FROM users WHERE id = $1', [business.ownerId]);

    if (owner.rows.length === 0) {
      console.log('⚠️  Owner not found in Neon database. Need to copy owner first...');

      // Get owner from local database
      const localOwner = await localClient.query('SELECT * FROM users WHERE id = $1', [business.ownerId]);

      if (localOwner.rows.length > 0) {
        const ownerData = localOwner.rows[0];
        console.log(`   Copying owner: ${ownerData.email}...`);

        // Insert owner into Neon
        const columns = Object.keys(ownerData).filter(k => k !== 'createdAt' && k !== 'updatedAt');
        const values = columns.map(k => ownerData[k]);
        const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');

        await neonClient.query(
          `INSERT INTO users (${columns.map(c => `"${c}"`).join(', ')}, "createdAt", "updatedAt")
           VALUES (${placeholders}, NOW(), NOW())
           ON CONFLICT (id) DO NOTHING`,
          values
        );

        console.log('   ✅ Owner copied to Neon\n');
      }
    } else {
      console.log('✅ Owner already exists in Neon\n');
    }

    // Copy business to Neon
    console.log('📤 Copying business to Neon...');

    // Handle JSON fields properly
    const jsonFields = ['workingHours', 'customBookingFields', 'amenities', 'images'];
    const processedBusiness = { ...business };

    // Convert JSON fields to strings if they're objects
    jsonFields.forEach(field => {
      if (processedBusiness[field] && typeof processedBusiness[field] === 'object') {
        processedBusiness[field] = JSON.stringify(processedBusiness[field]);
      }
    });

    const bColumns = Object.keys(processedBusiness).filter(k => k !== 'createdAt' && k !== 'updatedAt');
    const bValues = bColumns.map(k => processedBusiness[k]);
    const bPlaceholders = bColumns.map((_, i) => `$${i + 1}`).join(', ');

    await neonClient.query(
      `INSERT INTO businesses (${bColumns.map(c => `"${c}"`).join(', ')}, "createdAt", "updatedAt")
       VALUES (${bPlaceholders}, NOW(), NOW())
       ON CONFLICT (id) DO UPDATE SET
       name = EXCLUDED.name,
       status = EXCLUDED.status,
       latitude = EXCLUDED.latitude,
       longitude = EXCLUDED.longitude`,
      bValues
    );

    console.log('✅ Business "IDk" successfully copied to Neon!\n');
    console.log('🎉 Your business should now appear in the app and on the map!');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  } finally {
    await localClient.end();
    await neonClient.end();
  }
}

copyMissingBusiness();
