# Building Mobile App (APK) for BUKKi

This guide will help you convert your React app into a native Android app (APK) using Capacitor.

## Prerequisites

1. **Node.js** (you already have this)
2. **Java JDK 11 or higher**
   - Download from: https://adoptium.net/
   - Or install via: `choco install openjdk11` (Windows with Chocolatey)
3. **Android Studio** (for building APK)
   - Download from: https://developer.android.com/studio
   - Install Android SDK (comes with Android Studio)

## Step 1: Install Capacitor

```bash
cd frontend
npm install @capacitor/core @capacitor/cli
npm install @capacitor/android
```

## Step 2: Initialize Capacitor

```bash
cd frontend
npx cap init
```

When prompted:
- **App name:** BUKKi
- **App ID:** com.bukki.app (or your own domain like com.yourname.bukki)
- **Web dir:** build (this is where React builds to)

## Step 3: Build Your React App

```bash
cd frontend
npm run build
```

This creates the `build` folder with your production-ready app.

## Step 4: Add Android Platform

```bash
cd frontend
npx cap add android
```

This creates an `android` folder in your frontend directory.

## Step 5: Sync Your App

```bash
cd frontend
npx cap sync
```

This copies your built app into the Android project.

## Step 6: Configure API URL for Production

You'll need to update the API URL to point to your backend server (not localhost).

1. Create `frontend/.env.production`:
   ```
   REACT_APP_API_URL=https://your-backend-url.com
   ```
   Or for testing with your local network:
   ```
   REACT_APP_API_URL=http://YOUR_COMPUTER_IP:3000
   ```

2. Rebuild:
   ```bash
   npm run build
   npx cap sync
   ```

## Step 7: Open in Android Studio

```bash
cd frontend
npx cap open android
```

This opens Android Studio with your project.

## Step 8: Build APK in Android Studio

1. **Wait for Gradle sync** to complete (bottom bar will show progress)

2. **Build → Build Bundle(s) / APK(s) → Build APK(s)**

3. **Wait for build to complete** (check Build output at bottom)

4. **Locate APK:**
   - Click "locate" in the notification
   - Or navigate to: `frontend/android/app/build/outputs/apk/debug/app-debug.apk`

5. **Transfer APK to your phone:**
   - Via USB: Copy APK to phone, then install
   - Via email/cloud: Send APK to yourself, download on phone
   - Via ADB: `adb install app-debug.apk`

## Step 9: Install on Phone

1. **Enable "Install from Unknown Sources"** on your Android phone:
   - Settings → Security → Enable "Unknown Sources" or "Install Unknown Apps"
   - Or when you try to install, Android will prompt you

2. **Open the APK file** on your phone and install

## Alternative: Build APK from Command Line (No Android Studio GUI)

If you prefer command line:

```bash
cd frontend/android
./gradlew assembleDebug
```

APK will be at: `frontend/android/app/build/outputs/apk/debug/app-debug.apk`

## Configuration Files

After running `npx cap init`, you'll have a `capacitor.config.ts` file. Update it:

```typescript
import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.bukki.app',
  appName: 'BUKKi',
  webDir: 'build',
  server: {
    // For development, you can point to your dev server
    // url: 'http://YOUR_IP:3000',
    // cleartext: true
  },
  android: {
    allowMixedContent: true, // Allow HTTP connections (for local testing)
  }
};

export default config;
```

## Troubleshooting

### "Command not found: npx"
- Make sure Node.js is installed and in PATH
- Try: `npm install -g @capacitor/cli` then use `cap` instead of `npx cap`

### "Gradle sync failed"
- Open Android Studio
- File → Sync Project with Gradle Files
- Check for error messages

### "SDK location not found"
- Open Android Studio
- File → Project Structure → SDK Location
- Set Android SDK location (usually `C:\Users\YourName\AppData\Local\Android\Sdk`)

### App shows blank screen
- Check API URL is correct (not localhost)
- Check browser console for errors (use Chrome DevTools remote debugging)
- Make sure backend CORS allows your app's origin

### Network requests fail
- Update `capacitor.config.ts` to allow cleartext (HTTP) if testing locally
- Make sure backend is accessible from phone's network

## Building Release APK (For Distribution)

1. **Generate signing key:**
   ```bash
   keytool -genkey -v -keystore bukki-release-key.jks -keyalg RSA -keysize 2048 -validity 10000 -alias bukki
   ```

2. **Create `android/key.properties`:**
   ```
   storePassword=your-password
   keyPassword=your-password
   keyAlias=bukki
   storeFile=../bukki-release-key.jks
   ```

3. **Update `android/app/build.gradle`** to use signing config

4. **Build release APK:**
   ```bash
   cd frontend/android
   ./gradlew assembleRelease
   ```

## Quick Commands Reference

```bash
# Build React app
cd frontend
npm run build

# Sync to Android
npx cap sync

# Open in Android Studio
npx cap open android

# Copy changes (after editing native code)
npx cap copy android

# Update Capacitor
npx cap update android
```

## Next Steps

- Add app icons: Place icons in `android/app/src/main/res/` folders
- Configure app name, version in `android/app/build.gradle`
- Add permissions in `AndroidManifest.xml` if needed (camera, location, etc.)
- Test on real device via USB debugging

