import { DataSource } from 'typeorm';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../../.env') });

async function applyMigration() {
  // Use DATABASE_URL if available (for Neon.tech), otherwise construct from individual env vars
  const dbUrl = process.env.DATABASE_URL;
  const useSSL = dbUrl ? { rejectUnauthorized: false } : false;

  const dataSource = new DataSource(
    dbUrl
      ? {
          type: 'postgres',
          url: dbUrl,
          ssl: useSSL,
        }
      : {
          type: 'postgres',
          host: process.env.DATABASE_HOST || process.env.DB_HOST || 'localhost',
          port: parseInt(process.env.DATABASE_PORT || process.env.DB_PORT || '5432'),
          username: process.env.DATABASE_USERNAME || process.env.DB_USERNAME || 'postgres',
          password: process.env.DATABASE_PASSWORD || process.env.DB_PASSWORD || 'password',
          database: process.env.DATABASE_NAME || process.env.DB_NAME || 'booking_platform',
        }
  );

  try {
    await dataSource.initialize();
    console.log('Database connected');

    const migrationPath = path.join(__dirname, '../migrations/016-create-conversations-table.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    console.log('Applying migration 016: Create Conversations Table...');
    await dataSource.query(migrationSQL);
    console.log('Migration 016 applied successfully');

    await dataSource.destroy();
  } catch (error) {
    console.error('Error applying migration:', error);
    process.exit(1);
  }
}

applyMigration();
