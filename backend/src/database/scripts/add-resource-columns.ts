import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';

dotenv.config();

const dataSource = new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function run() {
  try {
    await dataSource.initialize();
    console.log('✅ Database connected');

    // Check existing columns
    const cols = await dataSource.query(
      "SELECT column_name FROM information_schema.columns WHERE table_name = 'services' ORDER BY column_name"
    );
    console.log('Existing columns:', cols.map((c: any) => c.column_name).join(', '));

    // Add missing resource columns
    console.log('Adding resourceType column...');
    await dataSource.query('ALTER TABLE services ADD COLUMN IF NOT EXISTS "resourceType" VARCHAR(50)');

    console.log('Adding allowAnyResource column...');
    await dataSource.query('ALTER TABLE services ADD COLUMN IF NOT EXISTS "allowAnyResource" BOOLEAN DEFAULT true');

    console.log('Adding requireResourceSelection column...');
    await dataSource.query('ALTER TABLE services ADD COLUMN IF NOT EXISTS "requireResourceSelection" BOOLEAN DEFAULT false');

    console.log('✅ Resource columns added successfully!');
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await dataSource.destroy();
  }
}

run();
