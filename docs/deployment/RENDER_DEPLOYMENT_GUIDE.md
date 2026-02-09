# 🚀 Render.com Deployment Guide - Complete Step-by-Step

## 📋 Overview
This guide will help you deploy your Bukki booking platform to Render.com (FREE tier).

**What you'll deploy:**
- ✅ Backend API (Node.js + NestJS)
- ✅ Frontend Web App (React + Nginx)
- ✅ Using your existing Neon PostgreSQL database

**Estimated time:** 20-30 minutes

---

## 🎯 **Step 1: Prepare Your Repository**

### 1.1. Commit All Changes
```bash
cd c:\Users\37369\bukki

# Check status
git status

# Add all changes
git add .

# Commit
git commit -m "Prepare for Render deployment"

# Push to GitHub (make sure you have a GitHub repo)
git push origin main
```

### 1.2. Ensure .env is Not Committed
```bash
# Verify .env is NOT in git
git ls-files | grep .env

# If it shows .env files, remove them:
git rm --cached backend/.env frontend/.env
git commit -m "Remove .env files from git"
git push
```

---

## 🌐 **Step 2: Create Render Account**

1. Go to **https://render.com**
2. Click **"Get Started"**
3. Sign up with **GitHub** (easiest for deployment)
4. Authorize Render to access your GitHub account
5. Select your `bukki` repository (or grant access to all repos)

---

## 🖥️ **Step 3: Deploy Backend API**

### 3.1. Create Backend Service

1. **Dashboard**: Click **"New +"** → **"Web Service"**

2. **Connect Repository**:
   - Select your `bukki` repository
   - Click **"Connect"**

3. **Configure Service**:
   ```
   Name:              bukki-backend
   Region:            Oregon (US West) - or closest to you
   Branch:            main
   Root Directory:    backend
   Runtime:           Docker
   Instance Type:     Free
   ```

4. **Advanced Settings**:
   - Dockerfile Path: `Dockerfile`
   - Docker Context: `.`
   - Health Check Path: `/health` (⚠️ We need to add this endpoint!)

### 3.2. Add Environment Variables

Click **"Add Environment Variable"** and add these ONE BY ONE:

**⚠️ IMPORTANT: Get values from your local `backend/.env` file**

**Required:**
```env
NODE_ENV=production
PORT=3000
DATABASE_URL=[copy from backend/.env]
JWT_SECRET=[generate new secure random string]
JWT_EXPIRES_IN=7d
FRONTEND_URL=https://bukki-frontend.onrender.com  (⚠️ Update after frontend is deployed)
```

**Email (Gmail):**
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=[copy from backend/.env]
SMTP_PASS=[copy from backend/.env]
```

**Cloudflare R2 (Image Storage):**
```env
R2_ENDPOINT=[copy from backend/.env]
R2_PUBLIC_URL=[copy from backend/.env]
AWS_ACCESS_KEY_ID=[copy from backend/.env]
AWS_SECRET_ACCESS_KEY=[copy from backend/.env]
AWS_REGION=auto
AWS_S3_BUCKET=bukki-images
```

**Firebase (Push Notifications):**
```env
FIREBASE_SERVICE_ACCOUNT=[copy ENTIRE JSON from backend/.env]
```

**AI Features:**
```env
GEMINI_API_KEY=[copy from backend/.env]
HUGGINGFACE_API_KEY=[copy from backend/.env]
AI_PROVIDER=huggingface
```

**Optional (for now):**
```env
REDIS_HOST=
REDIS_PORT=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
```

### 3.3. Deploy Backend

1. Click **"Create Web Service"**
2. Wait 5-10 minutes for build to complete
3. You'll get a URL like: `https://bukki-backend.onrender.com`
4. **Test it**: Go to `https://bukki-backend.onrender.com/api` (Swagger docs)

---

## 🎨 **Step 4: Deploy Frontend**

### 4.1. Update Frontend Environment

**FIRST**, update your frontend to use the backend URL:

```bash
# Edit frontend/.env (DO NOT COMMIT THIS)
REACT_APP_API_URL=https://bukki-backend.onrender.com
```

**BETTER**: Use build-time environment variable:

1. We'll set this in Render dashboard
2. Frontend Dockerfile needs to support build args (we'll fix this)

### 4.2. Fix Frontend Dockerfile

The frontend Dockerfile needs to accept REACT_APP_API_URL at build time.

**Current issue**: It doesn't use the environment variable during build.

**We need to update it** (I'll do this next).

### 4.3. Create Frontend Service

1. **Dashboard**: Click **"New +"** → **"Web Service"**

2. **Connect Repository**:
   - Select your `bukki` repository
   - Click **"Connect"**

3. **Configure Service**:
   ```
   Name:              bukki-frontend
   Region:            Oregon (US West) - same as backend
   Branch:            main
   Root Directory:    frontend
   Runtime:           Docker
   Instance Type:     Free
   ```

4. **Add Environment Variables**:
   ```env
   REACT_APP_API_URL=https://bukki-backend.onrender.com
   ```

5. Click **"Create Web Service"**

6. You'll get a URL like: `https://bukki-frontend.onrender.com`

---

## 🔄 **Step 5: Update CORS & Frontend URL**

### 5.1. Update Backend FRONTEND_URL

1. Go to backend service on Render
2. Navigate to **Environment** tab
3. Update `FRONTEND_URL` to: `https://bukki-frontend.onrender.com`
4. Save (this will trigger a redeploy)

### 5.2. Verify CORS Works

The backend already has CORS configured in `main.ts` to allow your frontend URL.

---

## ⚠️ **Step 6: Add Health Check Endpoint (IMPORTANT!)**

Render needs a `/health` endpoint to verify your backend is running.

**This needs to be added to your backend code before deployment.**

Would you like me to add this now? It's a simple 2-minute fix.

---

## 🎉 **Step 7: Test Your Deployment**

### 7.1. Backend Tests
```bash
# Test API is running
curl https://bukki-backend.onrender.com/api

# Test health endpoint
curl https://bukki-backend.onrender.com/health
```

### 7.2. Frontend Tests
1. Open `https://bukki-frontend.onrender.com`
2. Try logging in
3. Test booking creation
4. Test QR scanner (requires HTTPS - which Render provides!)

---

## 🐛 **Common Issues & Fixes**

### Issue 1: "Application failed to respond"
**Cause**: Health check endpoint missing
**Fix**: Add `/health` endpoint to backend

### Issue 2: "CORS error" in browser
**Cause**: Frontend URL not in backend FRONTEND_URL
**Fix**: Update FRONTEND_URL env var in backend service

### Issue 3: "Can't connect to database"
**Cause**: DATABASE_URL wrong or database not accessible
**Fix**: Verify Neon database URL is correct and allows connections from Render IPs

### Issue 4: Frontend shows "Network Error"
**Cause**: REACT_APP_API_URL not set correctly
**Fix**: Rebuild frontend with correct API URL

---

## 📊 **Monitoring & Logs**

### View Logs
1. Go to service dashboard
2. Click **"Logs"** tab
3. Watch real-time logs

### Check Metrics
1. Click **"Metrics"** tab
2. See CPU, Memory, Request counts

---

## 💰 **Free Tier Limits**

Render Free tier includes:
- ✅ 750 hours/month (enough for 1 service running 24/7)
- ✅ Automatic SSL/HTTPS
- ✅ Custom domains
- ⚠️ **Services spin down after 15 minutes of inactivity**
- ⚠️ **Cold start takes ~30 seconds** (first request after sleep)

**For production**: Upgrade to $7/month for always-on service.

---

## 🔐 **Security Recommendations**

After deployment:

1. **Rotate API Keys**:
   - Gmail App Password
   - Gemini API Key
   - Hugging Face API Key
   - Firebase credentials

2. **Generate Strong JWT_SECRET**:
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```

3. **Enable Rate Limiting**: ✅ Already done in backend!

4. **Set up Monitoring**: Consider Sentry for error tracking

---

## 🚀 **Next Steps**

1. **Custom Domain**: Point your domain to Render
2. **Monitoring**: Set up error tracking (Sentry)
3. **Analytics**: Add Google Analytics
4. **Mobile App**: Update API_URL in Capacitor config

---

## 📝 **Quick Reference**

**Backend URL**: `https://bukki-backend.onrender.com`
**Frontend URL**: `https://bukki-frontend.onrender.com`
**API Docs**: `https://bukki-backend.onrender.com/api`

**Need help?**
- Render Docs: https://render.com/docs
- Render Status: https://status.render.com
