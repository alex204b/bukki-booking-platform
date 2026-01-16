import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';

dotenv.config();

async function checkMigration() {
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
          host: process.env.DATABASE_HOST || 'localhost',
          port: parseInt(process.env.DATABASE_PORT || '5432'),
          username: process.env.DATABASE_USERNAME || 'postgres',
          password: process.env.DATABASE_PASSWORD || 'password',
          database: process.env.DATABASE_NAME || 'booking_platform',
        }
  );

  try {
    await dataSource.initialize();
    console.log('✓ Database connected');
    console.log('Database:', dbUrl ? 'Neon.tech (Cloud)' : 'Local');

    // Check if columns exist
    const result = await dataSource.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'businesses' 
      AND column_name IN ('unsuspensionRequestedAt', 'unsuspensionRequestReason')
    `);

    if (result.length === 2) {
      console.log('✓ Migration 012 is APPLIED');
      console.log('Columns found:', result.map((r: any) => r.column_name).join(', '));
    } else if (result.length === 0) {
      console.log('✗ Migration 012 is NOT applied');
      console.log('Columns missing: unsuspensionRequestedAt, unsuspensionRequestReason');
    } else {
      console.log('⚠ Partial migration:', result.length, 'columns found');
    }

    await dataSource.destroy();
  } catch (error: any) {
    console.error('✗ Error:', error.message);
    process.exit(1);
  }
}

checkMigration();

