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

    // Update all existing businesses to auto-accept bookings
    const result = await dataSource.query(
      `UPDATE businesses SET "autoAcceptBookings" = true WHERE "autoAcceptBookings" = false`
    );

    console.log(`✅ Updated businesses to auto-accept bookings:`, result);

    // Verify the update
    const businesses = await dataSource.query(
      `SELECT id, name, "autoAcceptBookings" FROM businesses`
    );
    console.log('Current business settings:');
    businesses.forEach((b: any) => {
      console.log(`  - ${b.name}: autoAcceptBookings = ${b.autoAcceptBookings}`);
    });

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await dataSource.destroy();
  }
}

run();
