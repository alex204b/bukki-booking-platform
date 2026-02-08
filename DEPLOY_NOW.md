# 🚀 Deploy to Render.com - Quick Start

## ✅ What I Just Fixed for You

1. ✅ **Created `/health` endpoint** - Render needs this to check if your backend is alive
   - File: `backend/src/health/health.controller.ts`
   - Endpoint: `GET /health` returns `{ status: 'ok', timestamp: '...', uptime: 123 }`

2. ✅ **Fixed Frontend Dockerfile** - Now accepts `REACT_APP_API_URL` at build time
   - Updated: `frontend/Dockerfile`

3. ✅ **Created `render.yaml`** - Blueprint for both backend + frontend deployment
   - Location: `render.yaml` (root)

4. ✅ **Created Deployment Guide** - Full step-by-step instructions
   - File: `RENDER_DEPLOYMENT_GUIDE.md`

---

## 🎯 Deploy NOW (5 Steps)

### **Step 1: Commit & Push to GitHub** (2 minutes)

```bash
# Navigate to project
cd c:\Users\37369\bukki

# Check what changed
git status

# Add all changes
git add .

# Commit
git commit -m "Add health endpoint and Render deployment config

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"

# Push to GitHub (make sure you have a repo set up)
git push origin main
```

**⚠️ Don't have a GitHub repo yet?**
```bash
# Create new repo on GitHub.com first, then:
git remote add origin https://github.com/YOUR_USERNAME/bukki.git
git branch -M main
git push -u origin main
```

---

### **Step 2: Sign Up on Render** (2 minutes)

1. Go to **https://render.com**
2. Click **"Get Started"**
3. Sign up with **GitHub**
4. Authorize Render to access your repos
5. Select the `bukki` repository

---

### **Step 3: Deploy Backend** (5 minutes)

1. **Click "New +" → "Web Service"**

2. **Connect your `bukki` repo**

3. **Fill in details:**
   ```
   Name:              bukki-backend
   Region:            Oregon (US West)
   Branch:            main
   Root Directory:    backend
   Runtime:           Docker
   Dockerfile Path:   Dockerfile
   Instance Type:     Free
   ```

4. **Scroll down to "Environment Variables"** and add:

   **⚠️ IMPORTANT: Copy values from your `backend/.env` file**

   ```env
   NODE_ENV=production
   PORT=3000
   DATABASE_URL=[copy from backend/.env]
   JWT_SECRET=[generate new one - see security section below]
   JWT_EXPIRES_IN=7d
   FRONTEND_URL=https://bukki-frontend.onrender.com
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USER=[copy from backend/.env]
   SMTP_PASS=[copy from backend/.env]
   R2_ENDPOINT=[copy from backend/.env]
   R2_PUBLIC_URL=[copy from backend/.env]
   AWS_ACCESS_KEY_ID=[copy from backend/.env]
   AWS_SECRET_ACCESS_KEY=[copy from backend/.env]
   AWS_REGION=auto
   AWS_S3_BUCKET=bukki-images
   GEMINI_API_KEY=[copy from backend/.env]
   HUGGINGFACE_API_KEY=[copy from backend/.env]
   AI_PROVIDER=huggingface
   ```

   **For FIREBASE_SERVICE_ACCOUNT:**
   ```
   [Copy the ENTIRE JSON string from backend/.env file - it's ONE LONG LINE]
   ```

5. **Click "Create Web Service"**

6. **Wait 5-10 minutes** for build to complete

7. **You'll get a URL like**: `https://bukki-backend.onrender.com`

8. **Test it**: Open `https://bukki-backend.onrender.com/api` (should show Swagger docs)

---

### **Step 4: Deploy Frontend** (5 minutes)

1. **Click "New +" → "Web Service"** again

2. **Connect your `bukki` repo** again

3. **Fill in details:**
   ```
   Name:              bukki-frontend
   Region:            Oregon (US West)
   Branch:            main
   Root Directory:    frontend
   Runtime:           Docker
   Dockerfile Path:   Dockerfile
   Instance Type:     Free
   ```

4. **Add Environment Variable:**
   ```env
   REACT_APP_API_URL=https://bukki-backend.onrender.com
   ```
   ⚠️ Replace with YOUR actual backend URL from Step 3!

5. **Advanced Settings**:
   - Docker Build Args: `REACT_APP_API_URL=https://bukki-backend.onrender.com`

6. **Click "Create Web Service"**

7. **Wait 5-10 minutes**

8. **You'll get a URL like**: `https://bukki-frontend.onrender.com`

---

### **Step 5: Update Backend FRONTEND_URL** (1 minute)

1. Go back to **backend service** on Render

2. Click **"Environment"** tab

3. Find `FRONTEND_URL` and change it to: `https://bukki-frontend.onrender.com`
   (Use YOUR actual frontend URL)

4. Click **"Save Changes"** (this will redeploy backend)

---

## 🎉 **You're Live!**

**Your URLs:**
- 🎨 Frontend: `https://bukki-frontend.onrender.com`
- ⚙️ Backend API: `https://bukki-backend.onrender.com`
- 📚 API Docs: `https://bukki-backend.onrender.com/api`
- ❤️ Health Check: `https://bukki-backend.onrender.com/health`

---

## 🧪 **Test Your Deployment**

1. Open your frontend URL
2. Try logging in
3. Create a booking
4. Test QR scanner (works on HTTPS!)
5. Test mobile app (update API_URL in Capacitor config)

---

## ⚠️ **Important Notes**

**Free Tier Limitations:**
- Services **sleep after 15 minutes** of inactivity
- **First request after sleep takes ~30 seconds** (cold start)
- 750 hours/month total (enough for 1 service 24/7)

**Upgrade to $7/month for:**
- ✅ Always-on (no cold starts)
- ✅ More build minutes
- ✅ Custom domains

---

## 🐛 **Troubleshooting**

**Backend fails to start?**
- Check Render logs
- Verify DATABASE_URL is correct
- Make sure all required env vars are set

**Frontend shows blank page?**
- Check browser console for errors
- Verify REACT_APP_API_URL is set correctly
- Make sure backend is running

**CORS errors?**
- Update FRONTEND_URL in backend environment
- Wait for backend to redeploy

**Can't connect to backend from frontend?**
- Make sure you're using HTTPS URLs (not HTTP)
- Check if backend is awake (visit `/health` endpoint)

---

## 📞 **Need Help?**

- Read full guide: `RENDER_DEPLOYMENT_GUIDE.md`
- Render Docs: https://render.com/docs
- Check Render Status: https://status.render.com

---

## 🔐 **Security - DO THIS AFTER DEPLOYMENT**

1. **Generate new JWT_SECRET**:
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```
   Update it in Render dashboard

2. **Rotate API Keys** (these are now public in this file!):
   - Gmail App Password
   - Gemini API Key
   - Hugging Face Key
   - Firebase credentials

3. **Never commit `.env` files** (already in .gitignore ✅)

---

**Good luck! 🚀**
