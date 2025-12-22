# Team Setup Guide - Quick Start

Share this with your team members so they can start developing immediately!

## What You'll Get

✅ Clone the project code
✅ Run backend and frontend on your laptop
✅ Connect to shared cloud database (everyone sees same data)
✅ Make changes and test
✅ Push changes for team to see

**Time to setup: 10 minutes**

---

## Prerequisites

- Node.js 18 or 20 (check: `node --version`)
- Git
- A code editor (VS Code recommended)

---

## Step 1: Clone Repository

```bash
git clone https://github.com/YOUR_GITHUB_USERNAME/bukki.git
cd bukki
```

## Step 2: Install Dependencies

```bash
# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install

cd ..
```

## Step 3: Configure Backend

Create file: `backend/.env`

```env
# Shared Development Database (Neon Cloud)
DATABASE_URL=postgresql://neondb_owner:npg_wQlykg1LG8mA@ep-hidden-queen-ahngj48u-pooler.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require

# JWT Settings
JWT_SECRET=dev-secret-123
JWT_EXPIRES_IN=7d

# App Settings
PORT=3000
NODE_ENV=development
FRONTEND_URL=http://localhost:3001

# Email (already configured, works as-is)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=bukki.no.replay@gmail.com
SMTP_PASS=phkamcfpcnqxmkpd

# Firebase (ask project owner for credentials)
FIREBASE_SERVICE_ACCOUNT=

# Gemini AI (ask project owner for key)
GEMINI_API_KEY=

# Optional (leave empty for development)
REDIS_HOST=
REDIS_PORT=
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
STRIPE_SECRET_KEY=
TWILIO_ACCOUNT_SID=
```

## Step 4: Configure Frontend

Create file: `frontend/.env`

```env
REACT_APP_API_URL=http://localhost:3000
```

## Step 5: Start Development

Open **2 terminals**:

**Terminal 1 - Backend:**
```bash
cd backend
npm run start:dev
```

Wait for: `Application is running on: http://0.0.0.0:3000`

**Terminal 2 - Frontend:**
```bash
cd frontend
npm start
```

Wait for browser to open at: http://localhost:3001

---

## ✅ You're Ready!

- **Frontend**: http://localhost:3001
- **Backend API**: http://localhost:3000
- **Database**: Shared Neon cloud (everyone connected)

---

## Daily Workflow

### Start Your Day
```bash
# Get latest code
git pull origin main

# Install any new dependencies
cd backend && npm install
cd ../frontend && npm install
```

### During Development
```bash
# Make your changes to code
# Backend and frontend auto-reload

# Test your changes in browser
```

### End Your Day
```bash
# Stage changes
git add .

# Commit with descriptive message
git commit -m "Add feature: description of what you did"

# Push to share with team
git push origin main
```

---

## Tips & Tricks

### Backend Changes
- Code changes auto-reload (watch mode)
- Check terminal for errors
- API runs on http://localhost:3000

### Frontend Changes
- Changes appear instantly in browser
- Check browser console (F12) for errors
- React app runs on http://localhost:3001

### Database
- Everyone shares same database
- Changes one person makes are visible to all
- Don't delete important test data without warning team

### Git Best Practices
- Pull before starting work
- Commit frequently with clear messages
- Push when done working
- Don't commit `.env` files (already in .gitignore)

---

## Troubleshooting

### "Port 3000 already in use"

**Windows:**
```bash
netstat -ano | findstr :3000
taskkill /PID <PID_NUMBER> /F
```

**Mac/Linux:**
```bash
lsof -ti:3000 | xargs kill
```

### "Cannot connect to database"

1. Check internet connection
2. Verify DATABASE_URL in backend/.env is correct
3. Database might be sleeping (free tier) - just wait 30 seconds

### "Module not found" errors

```bash
# Re-install dependencies
cd backend
rm -rf node_modules package-lock.json
npm install

cd ../frontend
rm -rf node_modules package-lock.json
npm install
```

### Git Push Rejected

```bash
# Someone else pushed first
git pull origin main

# Resolve any conflicts
# Then push again
git push origin main
```

---

## Need Help?

- Check logs in terminal
- Check browser console (F12)
- Ask your team
- Check main README.md for more details

---

## What's Next?

Once comfortable with development:
- Learn about the codebase structure (see README.md)
- Check KUBERNETES_DEPLOYMENT.md for production deployment
- See SETUP_DEV_DATABASE.md for more database details

**Happy Coding! 🚀**
