const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const connectionString = "postgresql://neondb_owner:npg_wQlykg1LG8mA@ep-hidden-queen-ahngj48u-pooler.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require";

const migrations = [
  '001-initial-schema.sql',
  '002-add-missing-business-fields.sql',
  '003-create-reviews-table.sql',
  '004-create-business-members-table.sql',
  '005-create-messages-table.sql',
  '006-add-chat-fields-to-messages.sql',
  '007-add-recurring-booking-fields.sql',
  '008-create-waitlist-table.sql',
  '009-create-offers-table.sql',
  '010-add-performance-indexes.sql',
  '011-add-business-amenities.sql',
];

async function setup() {
  console.log('🚀 Setting up Neon database...\n');

  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('✅ Connected to Neon!\n');

    for (const migration of migrations) {
      const migrationPath = path.join(__dirname, 'backend', 'src', 'database', 'migrations', migration);

      if (!fs.existsSync(migrationPath)) {
        console.log(`⚠️  ${migration} not found, skipping`);
        continue;
      }

      console.log(`📄 Running ${migration}...`);
      const sql = fs.readFileSync(migrationPath, 'utf8');

      try {
        await client.query(sql);
        console.log(`✅ ${migration} completed\n`);
      } catch (error) {
        if (error.message.includes('already exists')) {
          console.log(`⚠️  ${migration} - already exists, skipping\n`);
        } else {
          console.log(`❌ ${migration} error: ${error.message}\n`);
        }
      }
    }

    // Create device_tokens table
    console.log('📄 Creating device_tokens table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS device_tokens (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        token VARCHAR(500) NOT NULL,
        platform VARCHAR(20) DEFAULT 'web' CHECK (platform IN ('web', 'android', 'ios')),
        "deviceId" VARCHAR(255),
        "deviceName" VARCHAR(255),
        "isActive" BOOLEAN DEFAULT true,
        "notificationPreferences" JSONB,
        "userId" UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        "deletedAt" TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_device_tokens_user ON device_tokens("userId");
      CREATE INDEX IF NOT EXISTS idx_device_tokens_token ON device_tokens(token);
    `);
    console.log('✅ device_tokens created\n');

    const result = await client.query(`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public' ORDER BY table_name;
    `);

    console.log('📊 Database tables:');
    result.rows.forEach(row => console.log(`   ✓ ${row.table_name}`));

    console.log('\n✨ Setup complete!\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.end();
  }
}

setup();
