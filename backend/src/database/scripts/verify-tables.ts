import { DataSource } from 'typeorm';
import * as path from 'path';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../../.env') });

async function verifyTables() {
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
          password: process.env.DATABASE_PASSWORD || 'postgres',
          database: process.env.DATABASE_NAME || 'booking_platform',
        }
  );

  try {
    await dataSource.initialize();
    console.log('✅ Database connected');

    // Check for conversations table
    const conversationsTable = await dataSource.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = 'conversations'
      );
    `);
    console.log('✅ Conversations table exists:', conversationsTable[0].exists);

    // Check for chat_messages table
    const chatMessagesTable = await dataSource.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = 'chat_messages'
      );
    `);
    console.log('✅ Chat messages table exists:', chatMessagesTable[0].exists);

    // Check for notifications table
    const notificationsTable = await dataSource.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = 'notifications'
      );
    `);
    console.log('✅ Notifications table exists:', notificationsTable[0].exists);

    // Count records in each table
    const convCount = await dataSource.query('SELECT COUNT(*) FROM conversations');
    console.log('📊 Conversations count:', convCount[0].count);

    const msgCount = await dataSource.query('SELECT COUNT(*) FROM chat_messages');
    console.log('📊 Chat messages count:', msgCount[0].count);

    const notifCount = await dataSource.query('SELECT COUNT(*) FROM notifications');
    console.log('📊 Notifications count:', notifCount[0].count);

    await dataSource.destroy();
    console.log('\n✅ All tables verified successfully!');
  } catch (error) {
    console.error('❌ Error verifying tables:', error);
    process.exit(1);
  }
}

verifyTables();
