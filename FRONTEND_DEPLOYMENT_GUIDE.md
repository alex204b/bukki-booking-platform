# 🚀 Frontend Deployment Guide for Render

## Prerequisites
- ✅ Backend is deployed and working
- ✅ You have the backend URL from Render

## Step-by-Step Deployment

### Step 1: Get Your Backend URL
1. Go to your Render dashboard
2. Find your backend service
3. Copy the URL (e.g., `https://your-backend-name.onrender.com`)

### Step 2: Create New Frontend Service on Render

1. **Go to Render Dashboard**
   - Log into your Render account
   - Click "New +" → "Static Site"

2. **Connect Repository**
   - Connect your GitHub repository
   - Select the same repository as your backend

3. **Configure Build Settings**
   - **Name**: `booking-platform-frontend`
   - **Build Command**: `cd frontend && npm ci && npm run build`
   - **Publish Directory**: `frontend/build`
   - **Environment**: Static Site

### Step 3: Set Environment Variables

In the Render dashboard, add these environment variables:

```
REACT_APP_API_URL=https://your-backend-url.onrender.com
REACT_APP_ENVIRONMENT=production
```

**Important**: Replace `your-backend-url` with your actual backend URL!

### Step 4: Deploy

1. Click "Create Static Site"
2. Render will automatically build and deploy your frontend
3. Wait for the build to complete (usually 2-3 minutes)

### Step 5: Test Your Application

1. **Get your frontend URL** from Render dashboard
2. **Open the URL** in your browser
3. **Test the connection**:
   - Try to register/login
   - Check if API calls work
   - Verify the backend connection

## Expected Result

✅ **Frontend deployed successfully**
✅ **Connected to backend**
✅ **Full application working**

## Troubleshooting

### If Build Fails:
- Check the build logs in Render
- Ensure all dependencies are in package.json
- Verify the build command is correct

### If API Calls Fail:
- Check the REACT_APP_API_URL environment variable
- Ensure backend is running and accessible
- Check browser console for CORS errors

### If Frontend Doesn't Load:
- Check the publish directory is set to `frontend/build`
- Verify the build completed successfully

## Next Steps After Deployment

1. **Update CORS settings** in backend if needed
2. **Test all features** end-to-end
3. **Set up custom domain** (optional)
4. **Configure monitoring** (optional)

Your full-stack application will be live! 🎉
