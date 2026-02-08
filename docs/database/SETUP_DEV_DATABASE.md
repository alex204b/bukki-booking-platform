# Development Database Setup Guide

Guide for setting up the shared development database that all team members will use.

## What You'll Get

✅ Cloud PostgreSQL database (free, 10GB)
✅ All team members connect to same database
✅ Everyone can see test data
✅ Can create separate production database later on same service
✅ No Kubernetes needed for development

## Step 1: Create Neon Database (Project Owner Only)

1. Go to https://console.neon.tech/
2. Sign in with GitHub
3. Click "Create Project"
   - **Name**: `booking-platform-dev`
   - **Region**: Choose closest to your team
   - **PostgreSQL version**: 16
4. Click "Create Project"

**You'll see a connection string:**
```
postgresql://user:pass@ep-xyz-123.region.aws.neon.tech/neondb?sslmode=require
```

**IMPORTANT:** Save this connection string - you'll share it with your team!

## Step 2: Apply Database Schema

We've already exported the complete schema from your working Kubernetes database.

### Option A: Using PowerShell (Windows)

```powershell
# Set your Neon connection string (replace with yours)
$env:PGPASSWORD="your_password"
$DATABASE_URL="your_neon_connection_string"

# Apply schema
Get-Content neon_schema.sql | psql "$DATABASE_URL"
```

### Option B: Using Neon Web SQL Editor

1. In Neon dashboard, click "SQL Editor"
2. Copy content of `neon_schema.sql`
3. Paste and click "Run"

### Option C: Using Node.js (Cross-platform)

We can create a simple Node.js script to set it up automatically.

## Step 3: Verify Database

Check that all tables were created:

```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;
```

**Expected tables:**
- bookings
- business_members
- businesses
- device_tokens
- messages
- offers
- reviews
- services
- users
- waitlist

## Step 4: Configure Backend (All Team Members)

Each team member needs to do this:

### 1. Clone the Repository

```bash
git clone https://github.com/YOUR_USERNAME/bukki.git
cd bukki
```

### 2. Install Dependencies

```bash
# Install all dependencies
cd backend
npm install
cd ../frontend
npm install
cd ..
```

### 3. Configure Backend Environment

Create `backend/.env`:

```env
# Database (shared development database)
DATABASE_URL=postgresql://user:pass@ep-xyz.region.aws.neon.tech/neondb?sslmode=require

# JWT
JWT_SECRET=dev-jwt-secret-change-in-production
JWT_EXPIRATION=7d

# Frontend URL
FRONTEND_URL=http://localhost:3001

# Email (optional for development)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
SMTP_FROM=noreply@yourdomain.com

# API Keys (optional - use placeholder for dev)
STRIPE_SECRET_KEY=sk_test_...
GOOGLE_MAPS_API_KEY=your_key
GEMINI_API_KEY=your_key
# Or for Moldova: HUGGINGFACE_API_KEY=your_key, AI_PROVIDER=huggingface
FIREBASE_PROJECT_ID=your_project
FIREBASE_PRIVATE_KEY=your_key
FIREBASE_CLIENT_EMAIL=your_email
```

**IMPORTANT:** The `DATABASE_URL` should be the same for all team members!

### 4. Configure Frontend Environment

Create `frontend/.env`:

```env
REACT_APP_API_URL=http://localhost:3000
```

### 5. Start Development Servers

Terminal 1 (Backend):
```bash
cd backend
npm run start:dev
```

Terminal 2 (Frontend):
```bash
cd frontend
npm start
```

**Access:**
- Frontend: http://localhost:3001
- Backend: http://localhost:3000

## Team Collaboration Workflow

### Daily Development

1. **Pull latest changes:**
   ```bash
   git pull origin main
   ```

2. **Run locally:**
   ```bash
   # Terminal 1
   cd backend && npm run start:dev

   # Terminal 2
   cd frontend && npm start
   ```

3. **Make changes** to code

4. **Test** your changes (everyone uses same database)

5. **Commit and push:**
   ```bash
   git add .
   git commit -m "Description of changes"
   git push origin main
   ```

### Database Changes

**If you add new migrations:**

1. Create migration file in `backend/src/database/migrations/`
2. Apply to dev database (one person does this):
   ```bash
   # Connect to Neon and run migration
   psql $DATABASE_URL < backend/src/database/migrations/012-your-new-migration.sql
   ```
3. Commit migration file to git
4. Notify team to pull latest code

### Best Practices

✅ **DO:**
- Pull before starting work each day
- Test your changes before pushing
- Use descriptive commit messages
- Communicate with team about database changes
- Use feature branches for large changes

❌ **DON'T:**
- Push broken code
- Delete production-like data without warning team
- Change database schema without coordinating
- Commit secrets or API keys

## Troubleshooting

### Connection Error to Database

**Error:** `connection refused` or `timeout`

**Solution:**
1. Check your internet connection
2. Verify DATABASE_URL is correct
3. Check Neon dashboard - database might be sleeping (free tier sleeps after inactivity)
4. Visit Neon dashboard to wake it up

### Database Schema Out of Date

**Error:** `relation does not exist`

**Solution:**
```bash
# Pull latest code
git pull

# Check for new migrations in backend/src/database/migrations/
# Apply any new ones to Neon database
```

### Port Already in Use

**Error:** `Port 3000 is already in use`

**Solution:**
```bash
# Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# Or change port in backend/src/main.ts
```

### Environment Variables Not Loading

**Solution:**
1. Make sure `.env` files exist in `backend/` and `frontend/`
2. Restart dev servers after changing .env
3. Check for typos in variable names

## Moving to Production Later

When ready for production:

### 1. Create Production Database

In Neon dashboard:
- Create new project: `booking-platform-prod`
- Apply same schema
- **Keep separate from dev database!**

### 2. Deploy Application

Choose deployment method:
- **Option A:** Traditional (Render + Vercel)
- **Option B:** Kubernetes (GKE/EKS/AKS)
- **Option C:** Docker Compose on VPS

### 3. Update Environment

Production backend uses:
```env
DATABASE_URL=postgresql://...neon-prod-url.../neondb
JWT_SECRET=strong-random-secret
# Real API keys for Stripe, etc.
```

## Cost Breakdown

### Development (Current Setup)
- **Neon Database**: FREE (10GB, sleeps after 5 min inactivity)
- **Local Development**: FREE (runs on your laptops)
- **GitHub**: FREE (unlimited private repos)
- **Total**: $0/month

### Future Production Options

**Option 1: Minimal**
- Neon Pro: $19/month (always-on, 200GB)
- Render: $7/month (backend)
- Vercel: FREE
- **Total**: ~$26/month

**Option 2: Kubernetes**
- GKE: ~$74/month (1 small cluster)
- Cloud SQL: ~$7/month (small database)
- **Total**: ~$81/month
- (Covered by Google's $300 free credit for 4 months)

## Support

- **Neon Docs**: https://neon.tech/docs
- **Backend Issues**: Check logs in terminal
- **Frontend Issues**: Check browser console (F12)
- **Team Questions**: Use your team communication channel

## Quick Reference

**Start Development:**
```bash
# Backend
cd backend && npm run start:dev

# Frontend
cd frontend && npm start
```

**Update From Git:**
```bash
git pull origin main
cd backend && npm install
cd ../frontend && npm install
```

**View Database:**
- Neon SQL Editor: https://console.neon.tech/
- Or use any PostgreSQL client with the connection string

**Useful Commands:**
```bash
# Check Node version
node --version  # Should be 18 or 20

# Check npm version
npm --version

# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```
