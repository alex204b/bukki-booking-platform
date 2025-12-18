import { DataSource } from 'typeorm';
import * as fs from 'fs';
import * as path from 'path';

async function applyMigration() {
  const dataSource = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    username: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'portport1234',
    database: process.env.DB_NAME || 'booking_platform',
  });

  try {
    await dataSource.initialize();
    console.log('✓ Database connected');

    const migrationPath = path.join(__dirname, '../migrations/011-add-business-amenities.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');

    console.log('Applying migration 011-add-business-amenities...');
    await dataSource.query(sql);
    console.log('✓ Migration applied successfully');

    await dataSource.destroy();
  } catch (error) {
    console.error('✗ Migration failed:', error);
    process.exit(1);
  }
}

applyMigration();
