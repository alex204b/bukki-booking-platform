import { DataSource } from 'typeorm';
import { config } from 'dotenv';

config();

// Parse DATABASE_URL if it exists
let connectionConfig: any = {
  type: 'postgres',
  synchronize: false,
  logging: false,
};

if (process.env.DATABASE_URL) {
  connectionConfig.url = process.env.DATABASE_URL;
  connectionConfig.ssl = { rejectUnauthorized: false };
} else {
  connectionConfig.host = process.env.DB_HOST || 'localhost';
  connectionConfig.port = parseInt(process.env.DB_PORT || '5432', 10);
  connectionConfig.username = process.env.DB_USERNAME || 'postgres';
  connectionConfig.password = process.env.DB_PASSWORD || 'your_password_here';
  connectionConfig.database = process.env.DB_NAME || 'booking_platform';
}

const dataSource = new DataSource(connectionConfig);

async function checkMessages() {
  try {
    await dataSource.initialize();
    console.log('Database connected');

    const messages = await dataSource.query(`
      SELECT
        m.id,
        m.content,
        m.type,
        m."conversationId",
        m."createdAt",
        s.id as "senderId",
        s."firstName" || ' ' || s."lastName" as "senderName",
        r.id as "recipientId",
        r."firstName" || ' ' || r."lastName" as "recipientName",
        b.id as "businessId",
        b.name as "businessName"
      FROM messages m
      LEFT JOIN users s ON m."senderId" = s.id
      LEFT JOIN users r ON m."recipientId" = r.id
      LEFT JOIN businesses b ON m."businessId" = b.id
      WHERE m.type = 'chat'
      ORDER BY m."createdAt" DESC
      LIMIT 20
    `);

    console.log('\n=== CHAT MESSAGES IN DATABASE ===');
    console.log(`Total messages found: ${messages.length}\n`);

    messages.forEach((msg: any, index: number) => {
      console.log(`Message ${index + 1}:`);
      console.log(`  ID: ${msg.id}`);
      console.log(`  Content: ${msg.content}`);
      console.log(`  Sender: ${msg.senderName} (${msg.senderId})`);
      console.log(`  Recipient: ${msg.recipientName} (${msg.recipientId})`);
      console.log(`  Business: ${msg.businessName} (${msg.businessId})`);
      console.log(`  ConversationID: ${msg.conversationId}`);
      console.log(`  Created: ${msg.createdAt}`);
      console.log('');
    });

    await dataSource.destroy();
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkMessages();
