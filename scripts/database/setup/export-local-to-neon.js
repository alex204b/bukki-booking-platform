/**
 * Export data from Windows PostgreSQL and import to Neon
 */

const { Client } = require('pg');

// Source: Local Windows PostgreSQL
const localConfig = {
  host: 'localhost',
  port: 5432,
  user: 'postgres',
  password: 'portport1234',
  database: 'booking_platform'
};

// Destination: Neon Cloud
const neonConfig = {
  connectionString: 'postgresql://neondb_owner:npg_wQlykg1LG8mA@ep-hidden-queen-ahngj48u-pooler.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require',
  ssl: { rejectUnauthorized: false }
};

const tables = ['users', 'businesses', 'services', 'bookings', 'reviews', 'business_members', 'messages', 'waitlist', 'offers', 'device_tokens'];

async function copyData() {
  const localClient = new Client(localConfig);
  const neonClient = new Client(neonConfig);

  try {
    console.log('🔌 Connecting to local PostgreSQL...');
    await localClient.connect();
    console.log('✅ Connected to local database\n');

    console.log('🔌 Connecting to Neon...');
    await neonClient.connect();
    console.log('✅ Connected to Neon\n');

    for (const table of tables) {
      console.log(`📊 Processing table: ${table}`);

      // Count rows in source
      const countResult = await localClient.query(`SELECT COUNT(*) FROM ${table}`);
      const rowCount = parseInt(countResult.rows[0].count);

      if (rowCount === 0) {
        console.log(`   ⚠️  Table ${table} is empty, skipping\n`);
        continue;
      }

      console.log(`   📥 Found ${rowCount} rows`);

      // Get all data
      const dataResult = await localClient.query(`SELECT * FROM ${table}`);

      if (dataResult.rows.length === 0) {
        console.log(`   ⚠️  No data to copy\n`);
        continue;
      }

      // Get column names
      const columns = Object.keys(dataResult.rows[0]);
      const columnList = columns.map(c => `"${c}"`).join(', ');

      // Insert each row
      let inserted = 0;
      for (const row of dataResult.rows) {
        const values = columns.map(col => row[col]);
        const placeholders = values.map((_, i) => `$${i + 1}`).join(', ');

        try {
          await neonClient.query(
            `INSERT INTO ${table} (${columnList}) VALUES (${placeholders})`,
            values
          );
          inserted++;
        } catch (error) {
          if (error.message.includes('duplicate key')) {
            console.log(`   ⚠️  Row already exists, skipping`);
          } else {
            console.log(`   ❌ Error inserting row: ${error.message}`);
          }
        }
      }

      console.log(`   ✅ Inserted ${inserted}/${rowCount} rows\n`);
    }

    console.log('✨ Data copy complete!\n');

    // Summary
    console.log('📊 Summary:');
    for (const table of tables) {
      const result = await neonClient.query(`SELECT COUNT(*) FROM ${table}`);
      console.log(`   ${table}: ${result.rows[0].count} rows`);
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await localClient.end();
    await neonClient.end();
  }
}

copyData();
