const { Client } = require('pg');
require('dotenv').config();

async function checkLatestUser() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();

    // Get the very latest user
    const result = await client.query(`
      SELECT *
      FROM users
      ORDER BY "createdAt" DESC
      LIMIT 1
    `);

    if (result.rows.length > 0) {
      const user = result.rows[0];
      console.log('🆕 Latest User in NEON CLOUD Database:');
      console.log('  Email:', user.email);
      console.log('  Name:', `${user.firstName || 'N/A'} ${user.lastName || 'N/A'}`);
      console.log('  Role:', user.role);
      console.log('  Created:', user.createdAt);
      console.log('\n✅ This user is stored in the Neon cloud database!');
      console.log('\nFull user object:');
      console.log(user);
    }

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await client.end();
  }
}

checkLatestUser();
