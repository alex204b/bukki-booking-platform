import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';

dotenv.config();

async function verifyConnection() {
  const dbUrl = process.env.DATABASE_URL;
  
  if (!dbUrl) {
    console.error('❌ DATABASE_URL not set!');
    process.exit(1);
  }

  if (!dbUrl.includes('neon.tech')) {
    console.error('❌ DATABASE_URL does not point to Neon.tech!');
    console.error('   Current URL:', dbUrl.substring(0, 50) + '...');
    process.exit(1);
  }

  const dataSource = new DataSource({
    type: 'postgres',
    url: dbUrl,
    ssl: { rejectUnauthorized: false },
  });

  try {
    await dataSource.initialize();
    console.log('✅ Connected to Neon.tech cloud database');

    // Check if requests table exists
    const tableExists = await dataSource.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'requests'
      );
    `);

    if (tableExists[0].exists) {
      console.log('✅ Requests table exists');
      
      // Count requests
      const count = await dataSource.query(`SELECT COUNT(*) as count FROM requests`);
      console.log(`📊 Total requests in cloud: ${count[0].count}`);
      
      // Show recent requests
      const recent = await dataSource.query(`
        SELECT id, "requestType", status, "requestedAt" 
        FROM requests 
        ORDER BY "requestedAt" DESC 
        LIMIT 5
      `);
      console.log('\n📋 Recent requests:');
      recent.forEach((r: any, i: number) => {
        console.log(`   ${i + 1}. ${r.requestType} - ${r.status} - ${new Date(r.requestedAt).toLocaleString()}`);
      });
    } else {
      console.log('❌ Requests table does NOT exist!');
      console.log('   Run migration 013 to create it.');
    }

    await dataSource.destroy();
  } catch (error: any) {
    console.error('❌ Connection failed:', error.message);
    process.exit(1);
  }
}

verifyConnection();

