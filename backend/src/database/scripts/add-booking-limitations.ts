import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';

dotenv.config();

// Use DATABASE_URL if available (cloud), otherwise use individual env vars (local)
const dbConfig = process.env.DATABASE_URL
  ? {
      type: 'postgres' as const,
      url: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
    }
  : {
      type: 'postgres' as const,
      host: process.env.DATABASE_HOST || 'localhost',
      port: parseInt(process.env.DATABASE_PORT || '5432'),
      username: process.env.DATABASE_USERNAME || 'postgres',
      password: process.env.DATABASE_PASSWORD || 'postgres',
      database: process.env.DATABASE_NAME || 'booking_platform',
      ssl: false,
    };

const dataSource = new DataSource(dbConfig);

async function run() {
  try {
    await dataSource.initialize();
    console.log('✅ Database connected');

    const queryRunner = dataSource.createQueryRunner();

    // Check if columns exist before adding them
    const checkColumn = async (tableName: string, columnName: string) => {
      const result = await queryRunner.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = '${tableName}' AND column_name = '${columnName}'
      `);
      return result.length > 0;
    };

    // Add maxBookingsPerCustomerPerDay
    if (!(await checkColumn('services', 'maxBookingsPerCustomerPerDay'))) {
      console.log('Adding maxBookingsPerCustomerPerDay column...');
      await queryRunner.query(`
        ALTER TABLE services 
        ADD COLUMN "maxBookingsPerCustomerPerDay" INTEGER DEFAULT 1
      `);
      console.log('✅ Added maxBookingsPerCustomerPerDay column');
    } else {
      console.log('ℹ️  maxBookingsPerCustomerPerDay column already exists');
    }

    // Add maxBookingsPerCustomerPerWeek
    if (!(await checkColumn('services', 'maxBookingsPerCustomerPerWeek'))) {
      console.log('Adding maxBookingsPerCustomerPerWeek column...');
      await queryRunner.query(`
        ALTER TABLE services 
        ADD COLUMN "maxBookingsPerCustomerPerWeek" INTEGER
      `);
      console.log('✅ Added maxBookingsPerCustomerPerWeek column');
    } else {
      console.log('ℹ️  maxBookingsPerCustomerPerWeek column already exists');
    }

    // Add bookingCooldownHours
    if (!(await checkColumn('services', 'bookingCooldownHours'))) {
      console.log('Adding bookingCooldownHours column...');
      await queryRunner.query(`
        ALTER TABLE services 
        ADD COLUMN "bookingCooldownHours" INTEGER DEFAULT 0
      `);
      console.log('✅ Added bookingCooldownHours column');
    } else {
      console.log('ℹ️  bookingCooldownHours column already exists');
    }

    // Add allowMultipleActiveBookings
    if (!(await checkColumn('services', 'allowMultipleActiveBookings'))) {
      console.log('Adding allowMultipleActiveBookings column...');
      await queryRunner.query(`
        ALTER TABLE services 
        ADD COLUMN "allowMultipleActiveBookings" BOOLEAN DEFAULT true
      `);
      console.log('✅ Added allowMultipleActiveBookings column');
    } else {
      console.log('ℹ️  allowMultipleActiveBookings column already exists');
    }

    await queryRunner.release();
    console.log('✅ Migration completed successfully!');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await dataSource.destroy();
  }
}

run();

