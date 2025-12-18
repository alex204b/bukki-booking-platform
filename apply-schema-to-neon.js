/**
 * Automated script to set up Neon database with complete schema
 * Run: node apply-schema-to-neon.js "your_neon_connection_string"
 */

const { exec } = require('child_process');
const { promisify } = require('util');
const fs = require('fs');

const execAsync = promisify(exec);

const connectionString = process.argv[2] || process.env.DATABASE_URL;

if (!connectionString || connectionString.includes('username:password')) {
  console.error('❌ Please provide Neon database connection string\n');
  console.error('Usage:');
  console.error('  node apply-schema-to-neon.js "postgresql://user:pass@host/db"');
  console.error('\nOr set environment variable:');
  console.error('  set DATABASE_URL=postgresql://user:pass@host/db');
  console.error('  node apply-schema-to-neon.js\n');
  process.exit(1);
}

async function setupDatabase() {
  console.log('🚀 Setting up Neon database...\n');

  // Check if schema file exists
  if (!fs.existsSync('neon_schema.sql')) {
    console.error('❌ neon_schema.sql file not found!');
    console.error('This file should have been created during the Kubernetes setup.\n');
    process.exit(1);
  }

  console.log('📄 Found schema file: neon_schema.sql');
  console.log('📡 Connecting to Neon database...\n');

  try {
    // For Windows, we'll use PowerShell to pipe the SQL
    if (process.platform === 'win32') {
      console.log('💻 Using PowerShell to apply schema...\n');

      // We need to use pg npm package instead
      const { Client } = require('pg');

      const client = new Client({
        connectionString: connectionString,
        ssl: { rejectUnauthorized: false }
      });

      await client.connect();
      console.log('✅ Connected to database!\n');

      const schema = fs.readFileSync('neon_schema.sql', 'utf8');

      console.log('📝 Applying schema (this may take a minute)...\n');

      await client.query(schema);

      console.log('✅ Schema applied successfully!\n');

      // Verify tables
      const result = await client.query(`
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'public'
        ORDER BY table_name;
      `);

      console.log('📊 Created tables:');
      result.rows.forEach(row => {
        console.log(`   ✓ ${row.table_name}`);
      });

      console.log('\n✨ Database setup complete!\n');
      console.log('📋 Next steps:');
      console.log('   1. Copy the connection string to backend/.env as DATABASE_URL');
      console.log('   2. Run: cd backend && npm run start:dev');
      console.log('   3. Share connection string with your team\n');

      await client.end();

    } else {
      // Linux/Mac - use psql command
      await execAsync(`psql "${connectionString}" < neon_schema.sql`);
      console.log('✅ Schema applied successfully!\n');
    }

  } catch (error) {
    console.error('❌ Error setting up database:');
    console.error(error.message);
    console.error('\nTroubleshooting:');
    console.error('1. Check that your connection string is correct');
    console.error('2. Verify you have internet connection');
    console.error('3. Make sure the Neon database is active (not sleeping)\n');
    process.exit(1);
  }
}

// Check if pg module is installed
try {
  require('pg');
  setupDatabase();
} catch (e) {
  console.log('📦 Installing required package (pg)...\n');
  exec('npm install pg', (error) => {
    if (error) {
      console.error('❌ Failed to install pg package');
      console.error('Please run: npm install pg');
      process.exit(1);
    }
    console.log('✅ Package installed!\n');
    setupDatabase();
  });
}
