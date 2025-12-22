const { Client } = require('pg');
require('dotenv').config();

async function checkBusinessStatus() {
  const neonClient = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await neonClient.connect();
    console.log('✅ Connected to Neon\n');

    // Get the latest business for user alexandrubrd657@gmail.com
    const result = await neonClient.query(`
      SELECT b.*, u.email as owner_email
      FROM businesses b
      JOIN users u ON b."ownerId" = u.id
      WHERE u.email = 'alexandrubrd657@gmail.com'
      ORDER BY b."createdAt" DESC
      LIMIT 1
    `);

    if (result.rows.length === 0) {
      console.log('❌ No business found for alexandrubrd657@gmail.com');
      return;
    }

    const business = result.rows[0];
    console.log('📊 Latest Business Status:\n');
    console.log(`Name: ${business.name}`);
    console.log(`Status: ${business.status}`);
    console.log(`Active: ${business.isActive}`);
    console.log(`Onboarding Completed: ${business.onboardingCompleted}`);
    console.log(`Created: ${business.createdAt}`);
    console.log(`\n${business.status === 'pending' ? '⏳ PENDING' : business.status === 'approved' ? '✅ APPROVED' : '❌ REJECTED'}`);

    if (business.status === 'pending') {
      console.log('\n💡 Your business is pending approval. Auto-approving now...\n');

      await neonClient.query(
        `UPDATE businesses SET status = 'approved', "updatedAt" = NOW() WHERE id = $1`,
        [business.id]
      );

      console.log('✅ Business approved! You can now access the business dashboard.');
    } else if (business.status === 'approved') {
      console.log('\n✅ Business is already approved. You should be able to access the dashboard.');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await neonClient.end();
  }
}

checkBusinessStatus();
