import { DataSource } from 'typeorm';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

/**
 * Script to apply migration 010-add-performance-indexes.sql
 *
 * Usage:
 *   ts-node src/database/scripts/apply-migration-010.ts
 *
 * Or add to package.json:
 *   "migration:010": "ts-node src/database/scripts/apply-migration-010.ts"
 */

async function applyMigration() {
  console.log('🚀 Starting migration 010: Add Performance Indexes');
  console.log('================================================\n');

  // Read database configuration from environment
  const dataSource = new DataSource({
    type: 'postgres',
    host: process.env.DATABASE_HOST || process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DATABASE_PORT || process.env.DB_PORT || '5432'),
    username: process.env.DATABASE_USERNAME || process.env.DB_USERNAME || 'postgres',
    password: process.env.DATABASE_PASSWORD || process.env.DB_PASSWORD || '',
    database: process.env.DATABASE_NAME || process.env.DB_NAME || 'booking_platform',
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
  });

  try {
    // Initialize connection
    console.log('📡 Connecting to database...');
    await dataSource.initialize();
    console.log('✅ Connected successfully\n');

    // Read migration file
    const migrationPath = path.join(__dirname, '../migrations/010-add-performance-indexes.sql');
    console.log(`📄 Reading migration file: ${migrationPath}`);

    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    console.log(`✅ Migration file loaded (${migrationSQL.length} characters)\n`);

    // Apply migration
    console.log('⚡ Applying migration...');
    const startTime = Date.now();

    await dataSource.query(migrationSQL);

    const duration = Date.now() - startTime;
    console.log(`✅ Migration applied successfully in ${duration}ms\n`);

    // Verify indexes
    console.log('🔍 Verifying indexes...');
    const indexes = await dataSource.query(`
      SELECT
        tablename,
        indexname,
        indexdef
      FROM pg_indexes
      WHERE schemaname = 'public'
        AND indexname LIKE 'idx_%'
      ORDER BY tablename, indexname;
    `);

    console.log(`✅ Found ${indexes.length} indexes\n`);

    // Count new indexes from migration 010
    const newIndexes = indexes.filter(idx =>
      idx.indexname.includes('business_status') ||
      idx.indexname.includes('business_date') ||
      idx.indexname.includes('customer_status') ||
      idx.indexname.includes('geolocation') ||
      idx.indexname.includes('business_active')
    );

    console.log(`📊 New indexes from migration 010: ${newIndexes.length}`);
    newIndexes.forEach(idx => {
      console.log(`   - ${idx.indexname} on ${idx.tablename}`);
    });

    console.log('\n================================================');
    console.log('🎉 Migration completed successfully!');
    console.log('================================================\n');

  } catch (error) {
    console.error('❌ Migration failed:');
    console.error(error);
    process.exit(1);
  } finally {
    // Close connection
    if (dataSource.isInitialized) {
      await dataSource.destroy();
      console.log('📡 Database connection closed');
    }
  }
}

// Run migration
applyMigration();
