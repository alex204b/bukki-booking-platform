/**
 * Script to create a new admin user in the database
 * Usage: node create-admin.js
 */

const bcrypt = require('bcryptjs');
const { Client } = require('pg');
const path = require('path');
const fs = require('fs');

// Try to load .env from backend directory (works from root or backend dir)
let envPath = path.join(__dirname, 'backend', '.env');
if (!fs.existsSync(envPath)) {
  // If we're already in backend directory, try current directory
  envPath = path.join(__dirname, '.env');
}

if (fs.existsSync(envPath)) {
  require('dotenv').config({ path: envPath });
} else {
  console.log('⚠️  .env file not found. Using environment variables from system.');
}

async function createAdmin() {
  // Get database connection from environment
  const databaseUrl = process.env.DATABASE_URL || 
    `postgresql://${process.env.DATABASE_USERNAME || 'postgres'}:${process.env.DATABASE_PASSWORD || 'password'}@${process.env.DATABASE_HOST || 'localhost'}:${process.env.DATABASE_PORT || 5432}/${process.env.DATABASE_NAME || 'booking_platform'}`;

  const client = new Client({
    connectionString: databaseUrl,
    ssl: databaseUrl.includes('neon.tech') ? { rejectUnauthorized: false } : false,
  });

  try {
    await client.connect();
    console.log('✅ Connected to database');

    // Get admin details from command line or use defaults
    const args = process.argv.slice(2);
    const email = args[0] || 'admin2@bukki.com';
    const password = args[1] || 'admin123';
    const firstName = args[2] || 'Admin';
    const lastName = args[3] || 'Two';

    console.log('\n📝 Creating admin user with:');
    console.log(`   Email: ${email}`);
    console.log(`   Password: ${password}`);
    console.log(`   Name: ${firstName} ${lastName}`);

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 12);
    console.log('✅ Password hashed');

    // Check if user already exists
    const checkUser = await client.query(
      'SELECT id, email, role FROM users WHERE email = $1',
      [email]
    );

    if (checkUser.rows.length > 0) {
      console.log(`\n⚠️  User with email ${email} already exists!`);
      console.log('   Existing user details:');
      console.log(`   - ID: ${checkUser.rows[0].id}`);
      console.log(`   - Email: ${checkUser.rows[0].email}`);
      console.log(`   - Role: ${checkUser.rows[0].role}`);
      
      // Ask if they want to update to admin
      if (checkUser.rows[0].role !== 'super_admin') {
        console.log('\n💡 User exists but is not an admin. Would you like to update them to admin?');
        console.log('   Run this SQL to update:');
        console.log(`   UPDATE users SET role = 'super_admin', password = '${hashedPassword}' WHERE email = '${email}';`);
      }
      await client.end();
      return;
    }

    // Create the admin user
    const result = await client.query(
      `INSERT INTO users (
        id,
        email,
        password,
        "firstName",
        "lastName",
        role,
        "isActive",
        "emailVerified",
        "createdAt",
        "updatedAt"
      ) VALUES (
        gen_random_uuid(),
        $1,
        $2,
        $3,
        $4,
        'super_admin',
        true,
        true,
        NOW(),
        NOW()
      ) RETURNING id, email, "firstName", "lastName", role, "isActive"`,
      [email, hashedPassword, firstName, lastName]
    );

    console.log('\n✅ Admin user created successfully!');
    console.log('\n📋 User Details:');
    console.log(`   ID: ${result.rows[0].id}`);
    console.log(`   Email: ${result.rows[0].email}`);
    console.log(`   Name: ${result.rows[0].firstName} ${result.rows[0].lastName}`);
    console.log(`   Role: ${result.rows[0].role}`);
    console.log(`   Active: ${result.rows[0].isActive}`);

    console.log('\n🔑 Login Credentials:');
    console.log(`   Email: ${email}`);
    console.log(`   Password: ${password}`);

    // List all admins
    const allAdmins = await client.query(
      'SELECT email, "firstName", "lastName", "createdAt" FROM users WHERE role = $1 ORDER BY "createdAt" DESC',
      ['super_admin']
    );

    console.log('\n👥 All Admin Users:');
    allAdmins.rows.forEach((admin, index) => {
      console.log(`   ${index + 1}. ${admin.email} (${admin.firstName} ${admin.lastName}) - Created: ${admin.createdAt}`);
    });

    await client.end();
    console.log('\n✅ Done!');
  } catch (error) {
    console.error('\n❌ Error creating admin user:');
    console.error(error.message);
    if (error.code === '23505') {
      console.error('\n💡 This email is already registered. Use a different email or update the existing user.');
    }
    await client.end();
    process.exit(1);
  }
}

// Run the script
createAdmin();

