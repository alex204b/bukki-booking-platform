const { Client } = require('pg');
require('dotenv').config();

async function testConnection() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log('Attempting to connect to:', process.env.DATABASE_URL.substring(0, 20) + '...');
    await client.connect();
    console.log('✅ Connected successfully!');

    // Get database name and server info
    const result = await client.query(`
      SELECT current_database() as db_name,
             inet_server_addr() as server_ip,
             version() as version
    `);

    console.log('\n📊 Connection Details:');
    console.log('  Database:', result.rows[0].db_name);
    console.log('  Server IP:', result.rows[0].server_ip || 'Cloud/External');
    console.log('  Version:', result.rows[0].version.substring(0, 50) + '...');

    // Count users
    const userCount = await client.query('SELECT COUNT(*) as count FROM users');
    console.log('\n👥 Users in database:', userCount.rows[0].count);

    // Show recent users
    const recentUsers = await client.query('SELECT id, email, role, "createdAt" FROM users ORDER BY "createdAt" DESC LIMIT 3');
    console.log('\n📝 Recent users:');
    recentUsers.rows.forEach(user => {
      console.log(`  - ${user.email} (${user.role}) - Created: ${user.createdAt}`);
    });

  } catch (error) {
    console.error('❌ Connection failed:', error.message);
  } finally {
    await client.end();
  }
}

testConnection();
