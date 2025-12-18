# Firebase Android Setup Guide

## Important: Two Different Firebase Configurations

You have **two different Firebase configurations** for different purposes:

1. **Service Account JSON** (Backend) - ✅ You already have this
   - Used for: Backend server (NestJS) to send push notifications
   - File: Stored in backend environment variables
   - Purpose: Server-side Firebase Admin SDK

2. **google-services.json** (Mobile App) - ❌ You need this
   - Used for: Android/iOS mobile apps to receive push notifications
   - File: Must be placed in `frontend/android/app/`
   - Purpose: Client-side Firebase SDK

## How to Get google-services.json

### Step 1: Go to Firebase Console
1. Visit: https://console.firebase.google.com/
2. Select your project: **bukki-app**

### Step 2: Add Android App
1. Click the **⚙️ Settings** icon (gear) next to "Project Overview"
2. Scroll down to **"Your apps"** section
3. Click **"Add app"** → Select **Android** icon
4. Fill in:
   - **Android package name**: `com.bukki.app` (must match exactly!)
   - **App nickname** (optional): BUKKi Android
   - **Debug signing certificate SHA-1** (optional for now)
5. Click **"Register app"**

### Step 3: Download google-services.json
1. After registering, you'll see a **"Download google-services.json"** button
2. Click it to download the file
3. **IMPORTANT**: Place the file here:
   ```
   frontend/android/app/google-services.json
   ```

### Step 4: Verify Build Configuration
The `build.gradle` file already has the setup to use `google-services.json`:
- It checks if the file exists
- If it exists, it applies the Google Services plugin
- If it doesn't exist, it skips it (app works without push notifications)

## After Adding google-services.json

1. **Sync Gradle** in Android Studio:
   - Click "Sync Now" when prompted
   - Or: File → Sync Project with Gradle Files

2. **Rebuild the app**:
   ```bash
   cd frontend
   npm run build
   npx cap sync
   ```

3. **Build in Android Studio**:
   - Build → Clean Project
   - Build → Rebuild Project

## Current Status

- ✅ **Backend Firebase**: Configured (service account)
- ❌ **Android Firebase**: Not configured (need google-services.json)
- ✅ **App**: Works without push notifications (they're optional)

## After Setup

Once you add `google-services.json`:
- Push notifications will work automatically
- The app will register for push notifications on startup
- Users will receive notifications for bookings, messages, etc.

## Troubleshooting

### If you get "package name mismatch" error:
- Make sure the package name in Firebase Console matches exactly: `com.bukki.app`
- Check `frontend/android/app/build.gradle` → `applicationId "com.bukki.app"`

### If push notifications still don't work:
- Check Logcat for Firebase initialization messages
- Verify `google-services.json` is in the correct location
- Make sure you synced Gradle after adding the file

## Quick Reference

**File locations:**
- Service Account (Backend): `backend/.env` → `FIREBASE_SERVICE_ACCOUNT`
- google-services.json (Android): `frontend/android/app/google-services.json`

**Both are needed for:**
- Backend: Send push notifications
- Mobile App: Receive push notifications






