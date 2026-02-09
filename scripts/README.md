# Scripts Directory

Organized utility scripts for development, deployment, and maintenance tasks.

---

## 📁 Directory Structure

```
scripts/
├── README.md                # This file
├── quick-start.bat          # Quick start for Windows
├── quick-start.sh           # Quick start for Unix/Mac
├── setup-usb.bat            # USB connection setup for mobile dev
│
├── database/                # 🗄️ Database management scripts
│   ├── README.md           # Detailed database scripts documentation
│   ├── setup/              # Database setup & migration
│   ├── admin/              # Admin user management
│   ├── maintenance/        # Business & data management
│   └── utils/              # Database utilities
│
├── network/                 # 🌐 Network configuration
│   ├── setup-ip.bat        # Windows IP setup
│   └── setup-ip.js         # Cross-platform IP setup
│
└── dev/                     # 🛠️ Development utilities
    └── test-time-slots.js  # Time slot testing
```

---

## 🚀 Quick Start Scripts

### Windows Quick Start
```bash
scripts\quick-start.bat
```

### Unix/Mac Quick Start
```bash
./scripts/quick-start.sh
```

These scripts will:
- Start the backend server
- Start the frontend development server
- Open the application in your browser

---

## 📂 Main Directories

### 🗄️ Database (`/database`)
Complete database management - setup, migration, admin users, maintenance.

**See detailed documentation**: [database/README.md](database/README.md)

**Quick commands**:
```bash
# Test database connection
node scripts/database/utils/test-db-connection.js

# Create admin user
node scripts/database/admin/create-admin.js

# Check businesses
node scripts/database/maintenance/check-businesses.js
```

### 🌐 Network (`/network`)
Network configuration for mobile development and local testing.

**Configure IP Address**:
```bash
# On Windows
scripts\network\setup-ip.bat

# On Unix/Mac
node scripts/network/setup-ip.js
```

This automatically:
- Detects your local IP address
- Updates `backend/.env` with correct `FRONTEND_URL`
- Updates `frontend/.env` with correct `REACT_APP_API_URL`
- Saves IP to `.current-ip.txt` for reference

**When to run**:
- After changing networks (home, work, travel)
- Before mobile app testing
- When backend/frontend can't connect

### 🛠️ Development (`/dev`)
Development and testing utilities.

**Available scripts**:
- `test-time-slots.js` - Test time slot functionality

```bash
node scripts/dev/test-time-slots.js
```

---

## 📝 Usage Examples

### Complete Setup (First Time)

```bash
# 1. Setup database
node scripts/database/setup/setup-neon-direct.js

# 2. Create admin user
node scripts/database/admin/create-admin.js

# 3. Configure network for mobile dev
scripts\network\setup-ip.bat   # Windows
# OR
./scripts/network/setup-ip.js  # Unix/Mac

# 4. Start the application
scripts\quick-start.bat        # Windows
# OR
./scripts/quick-start.sh       # Unix/Mac
```

### Daily Development

```bash
# Start servers
scripts\quick-start.bat        # Windows
./scripts/quick-start.sh       # Unix/Mac

# Test database connection
node scripts/database/utils/test-db-connection.js

# Check recent changes
node scripts/database/utils/check-latest-user.js
```

---

## ⚠️ Important Notes

### Database Scripts
- Require `DATABASE_URL` environment variable
- Always backup before running migrations
- Test connection first with `test-db-connection.js`
- See [database/README.md](database/README.md) for details

### Network Scripts
- Run after changing networks
- Updates `.env` files automatically
- Required for mobile app development
- Safe to run multiple times

### Security
- Never commit modified `.env` files with real credentials
- Change default admin passwords immediately
- Keep database backups before major operations

---

## 🔍 Troubleshooting

### Scripts Won't Run
```bash
# Ensure Node.js is installed
node --version

# Install dependencies if needed
cd backend && npm install
cd ../frontend && npm install
```

### Database Connection Issues
```bash
# Test connection
node scripts/database/utils/test-db-connection.js

# Check environment variables
# Make sure backend/.env has DATABASE_URL or individual params
```

### Network Configuration Issues
```bash
# Re-run network setup
scripts\network\setup-ip.bat

# Check generated .current-ip.txt file
cat .current-ip.txt

# Manually verify .env files were updated
cat backend/.env | grep FRONTEND_URL
cat frontend/.env | grep REACT_APP_API_URL
```

---

## 📚 Additional Resources

- **Main Documentation**: [../docs/README.md](../docs/README.md)
- **Database Documentation**: [database/README.md](database/README.md)
- **Deployment Guide**: [../docs/deployment/DEPLOY_NOW.md](../docs/deployment/DEPLOY_NOW.md)
- **Project Structure**: [../docs/development/PROJECT_STRUCTURE.md](../docs/development/PROJECT_STRUCTURE.md)

---

## 🗑️ Removed Scripts

The following scripts were removed during cleanup:
- `create-admin-script.js` - Replaced by database/admin/create-admin.js
- `setup-firebase.js` - Security risk (hardcoded credentials)
- `test-deployment.js` - Outdated and broken

For admin user creation, use:
```bash
node scripts/database/admin/create-admin.js
```

---

**Last Updated**: February 9, 2026
