# Database Scripts

Organized database management scripts for the Bukki platform.

---

## 📁 Directory Structure

```
database/
├── README.md                # This file
├── setup/                   # Database setup & migration
├── admin/                   # Admin user management
├── maintenance/             # Business & data management
└── utils/                   # Database utilities
```

---

## 🚀 Quick Start

### First-Time Setup

1. **Setup Neon Cloud Database**:
   ```bash
   node database/setup/setup-neon-direct.js
   ```

2. **Apply Schema**:
   ```bash
   node database/setup/apply-schema-to-neon.js
   ```

3. **Create Admin User**:
   ```bash
   node database/admin/create-admin.js
   ```

### Test Connection

```bash
node database/utils/test-db-connection.js
```

---

## 📂 Setup & Migration (`/setup`)

Scripts for database initialization and data migration.

| Script | Description | Usage |
|--------|-------------|-------|
| `apply-schema-to-neon.js` | Apply database schema to Neon cloud | `node database/setup/apply-schema-to-neon.js` |
| `setup-neon-direct.js` | Direct Neon database setup | `node database/setup/setup-neon-direct.js` |
| `migrate-local-to-neon.js` | Migrate data from local PostgreSQL to Neon | `node database/setup/migrate-local-to-neon.js` |
| `export-local-to-neon.js` | Export and sync local data to Neon | `node database/setup/export-local-to-neon.js` |
| `export-full-local-db.js` | Export complete local database | `node database/setup/export-full-local-db.js` |
| `neon_schema.sql` | Complete database schema (SQL) | Reference file |
| `neon_data.sql` | Sample data for Neon database | Reference file |

### Example: Migrate Local to Cloud

```bash
# 1. Export local database
node database/setup/export-full-local-db.js

# 2. Migrate to Neon
node database/setup/migrate-local-to-neon.js

# 3. Verify migration
node database/utils/test-db-connection.js
```

---

## 👤 Admin Management (`/admin`)

Scripts for creating and managing admin users.

| Script | Description | Usage |
|--------|-------------|-------|
| `create-admin.js` | Create admin user via Node script | `node database/admin/create-admin.js` |
| `create-admin-user.sql` | SQL script to create admin user | `psql -f database/admin/create-admin-user.sql` |
| `create-admin-simple.sql` | Simplified admin user creation | `psql -f database/admin/create-admin-simple.sql` |

### Creating Admin User

**Method 1: Node Script (Recommended)**
```bash
node database/admin/create-admin.js
```

**Method 2: SQL Script**
```bash
# Using psql
psql $DATABASE_URL -f database/admin/create-admin-user.sql

# Or connect and paste SQL manually
psql $DATABASE_URL
\i database/admin/create-admin-simple.sql
```

---

## 🏢 Maintenance (`/maintenance`)

Scripts for managing businesses and data.

| Script | Description | Usage |
|--------|-------------|-------|
| `check-businesses.js` | List and verify all businesses | `node database/maintenance/check-businesses.js` |
| `check-business-status.js` | Check specific business status | `node database/maintenance/check-business-status.js` |
| `copy-missing-business.js` | Copy missing business data between databases | `node database/maintenance/copy-missing-business.js` |

### Example: Check Business Status

```bash
# List all businesses
node database/maintenance/check-businesses.js

# Check specific business
node database/maintenance/check-business-status.js
```

---

## 🛠️ Utilities (`/utils`)

General database utility scripts.

| Script | Description | Usage |
|--------|-------------|-------|
| `test-db-connection.js` | Test database connectivity | `node database/utils/test-db-connection.js` |
| `check-latest-user.js` | Check most recently created user | `node database/utils/check-latest-user.js` |

### Example: Test Database

```bash
# Test connection
node database/utils/test-db-connection.js

# Check latest user
node database/utils/check-latest-user.js
```

---

## 📋 Environment Variables

All scripts require proper database configuration via environment variables:

```env
# Option 1: Connection URL (Recommended for Neon)
DATABASE_URL=postgresql://user:password@host:5432/dbname

# Option 2: Individual parameters (Local PostgreSQL)
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_USERNAME=postgres
DATABASE_PASSWORD=your-password
DATABASE_NAME=booking_platform
```

Scripts automatically load from `backend/.env` if available.

---

## ⚠️ Important Notes

### Before Running Scripts

1. **Backup First**: Always backup your database before running migration scripts
2. **Test Connection**: Run `test-db-connection.js` to verify connectivity
3. **Check Environment**: Ensure `DATABASE_URL` or individual params are set correctly

### Migration Safety

- Migration scripts are **ONE-WAY** operations
- Review the script code before running on production
- Test on a staging database first
- Keep backups before major migrations

### Admin User Security

- Change default passwords immediately after creation
- Use strong passwords for production admin accounts
- Never commit admin credentials to git

---

## 🔍 Troubleshooting

### "Cannot connect to database"
- Check `DATABASE_URL` or individual connection params
- Verify database is running and accessible
- Check firewall/network settings

### "Permission denied"
- Ensure database user has sufficient privileges
- Admin scripts require CREATE/INSERT permissions
- Migration scripts may need SUPERUSER privileges

### "Table already exists"
- Schema may already be applied
- Use `test-db-connection.js` to verify existing schema
- Drop tables manually if needed (⚠️ data loss!)

---

## 📚 Additional Resources

- **Main Documentation**: [/docs](../../docs/)
- **Deployment Guide**: [/docs/deployment](../../docs/deployment/)
- **Database Setup**: [/docs/database](../../docs/database/)

---

**Last Updated**: February 9, 2026
