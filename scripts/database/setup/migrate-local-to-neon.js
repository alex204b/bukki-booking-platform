const { Client } = require('pg');
const { execSync } = require('child_process');
const fs = require('fs');
require('dotenv').config();

async function migrateDatabase() {
  console.log('🚀 Starting full database migration from LOCAL to NEON...\n');

  try {
    // Step 1: Export local database using pg_dump
    console.log('📤 Step 1: Exporting local database...');
    const dumpFile = 'local_database_backup.sql';

    const dumpCommand = `pg_dump -h localhost -p 5432 -U postgres -d booking_platform -F p -f ${dumpFile}`;

    console.log('   Running pg_dump...');
    execSync(dumpCommand, {
      env: { ...process.env, PGPASSWORD: 'portport1234' },
      stdio: 'inherit'
    });

    console.log(`   ✅ Database exported to ${dumpFile}\n`);

    // Step 2: Restore to Neon
    console.log('📥 Step 2: Importing to Neon database...');
    console.log('   ⚠️  This will DROP existing data in Neon and replace it with local data.\n');

    // Parse Neon connection string
    const neonUrl = process.env.DATABASE_URL;
    const url = new URL(neonUrl);

    const restoreCommand = `psql "${neonUrl}" < ${dumpFile}`;

    console.log('   Running restore...');
    execSync(restoreCommand, {
      stdio: 'inherit'
    });

    console.log('\n✅ Migration complete!');
    console.log('\n📊 Your Neon database now contains all data from localhost.');
    console.log('   Including your "IDk" business!');

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.log('\n💡 Alternative: Manual migration using pgAdmin or DBeaver');
    console.log('   1. Connect to local database');
    console.log('   2. Export all data');
    console.log('   3. Connect to Neon database');
    console.log('   4. Import data');
  }
}

migrateDatabase();
