# Scripts Directory

This directory contains utility scripts for various development and maintenance tasks.

## Directory Structure

### `/database`
Database-related scripts for setup, migration, and data management:

- **Schema & Migration**
  - `apply-schema-to-neon.js` - Apply database schema to Neon cloud database
  - `migrate-local-to-neon.js` - Migrate data from local PostgreSQL to Neon
  - `export-local-to-neon.js` - Export and sync local data to Neon
  - `export-full-local-db.js` - Export complete local database
  - `setup-neon-direct.js` - Direct setup for Neon database

- **SQL Files**
  - `neon_schema.sql` - Complete database schema for Neon
  - `neon_data.sql` - Sample data for Neon database
  - `create-admin-user.sql` - SQL script to create admin user
  - `create-admin-simple.sql` - Simplified admin user creation

- **Admin & User Management**
  - `create-admin.js` - Create admin user via script
  - `check-latest-user.js` - Check the most recently created user

- **Business Management**
  - `check-businesses.js` - List and check all businesses
  - `check-business-status.js` - Check specific business status
  - `copy-missing-business.js` - Copy missing business data

- **Testing & Debugging**
  - `test-db-connection.js` - Test database connectivity

### `/network`
Network configuration scripts:

- `setup-ip.js` - Automatically configure IP address for development
- `setup-ip.bat` - Windows batch file for IP configuration

## Usage

### Database Scripts

#### Setting up Neon Database
```bash
# Apply schema to Neon
node scripts/database/apply-schema-to-neon.js

# Migrate local data to Neon
node scripts/database/migrate-local-to-neon.js
```

#### Creating Admin User
```bash
# Using JavaScript
node scripts/database/create-admin.js

# Using SQL (with psql)
psql -f scripts/database/create-admin-user.sql
```

#### Testing Database Connection
```bash
node scripts/database/test-db-connection.js
```

### Network Scripts

#### Configure IP Address
```bash
# On Windows
scripts\network\setup-ip.bat

# On Unix/Mac
node scripts/network/setup-ip.js
```

This will automatically:
- Detect your local IP address
- Update backend `.env` with correct FRONTEND_URL
- Update frontend `.env` and `.env.local` with correct REACT_APP_API_URL
- Save the IP to `.current-ip.txt` for reference

## Notes

- Most database scripts require proper DATABASE_URL environment variable
- Network scripts should be run whenever you change networks (home, work, travel)
- Always backup data before running migration scripts
- Check the `.env` files after running network configuration scripts
