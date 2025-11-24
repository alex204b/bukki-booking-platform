# How to Open BUKKi Project in Android Studio

## When Android Studio Opens with Another Project

### Option 1: Open the BUKKi Project Directly

1. **Close the current project:**
   - Go to **File → Close Project** (or **File → Close** if it's just a file)

2. **Open the BUKKi Android project:**
   - Click **"Open"** on the welcome screen
   - Navigate to: `C:\Users\37369\Bukki\frontend\android`
   - Select the `android` folder
   - Click **"OK"**

3. **Wait for Gradle sync:**
   - Android Studio will automatically start syncing Gradle
   - Wait for it to finish (check bottom status bar)
   - If it asks to sync, click **"Sync Now"**

### Option 2: Use "Open Recent" (After First Time)

1. **File → Open Recent**
2. Select **"Bukki"** or the path ending in `frontend\android`

### Option 3: From Command Line (Easiest)

Instead of opening Android Studio manually, use this command from your project:

```bash
cd frontend
npm run cap:open
```

This will automatically:
- Open Android Studio
- Load the correct project (`frontend/android`)
- Skip the project selection screen

## First Time Setup in Android Studio

When you open the project for the first time:

1. **Gradle Sync:**
   - Android Studio will detect the project and start syncing
   - Wait for "Gradle sync finished" message
   - This may take 2-5 minutes the first time

2. **If you see "SDK not found" error:**
   - Go to **File → Project Structure → SDK Location**
   - Set Android SDK location (usually `C:\Users\YourName\AppData\Local\Android\Sdk`)
   - Click **"OK"** and sync again

3. **If you see "JDK not found" error:**
   - Go to **File → Project Structure → SDK Location**
   - Set JDK location (usually `C:\Program Files\Java\jdk-11` or similar)
   - Or download JDK from https://adoptium.net/

## Project Structure in Android Studio

Once opened, you'll see:
```
android/
├── app/
│   ├── src/
│   │   └── main/
│   │       ├── java/          (Native Android code)
│   │       ├── res/           (Icons, resources)
│   │       └── AndroidManifest.xml
│   └── build.gradle           (App configuration)
├── build.gradle               (Project configuration)
└── settings.gradle
```

## Building APK - Step by Step

1. **Wait for Gradle sync to complete** (bottom bar shows "Gradle sync finished")

2. **Build APK:**
   - Click **Build** in the top menu
   - Select **Build Bundle(s) / APK(s)**
   - Select **Build APK(s)**

3. **Wait for build** (1-2 minutes usually)

4. **Find your APK:**
   - When build completes, you'll see a notification
   - Click **"locate"** in the notification
   - Or navigate to: `frontend\android\app\build\outputs\apk\debug\app-debug.apk`

5. **Transfer to phone:**
   - Copy APK to your phone
   - Install it

## Troubleshooting

### "Project structure not found"
- Make sure you opened the `frontend\android` folder, not `frontend` folder
- The `android` folder should contain `app`, `build.gradle`, `settings.gradle`

### "Gradle sync failed"
- Check internet connection (Gradle downloads dependencies)
- Go to **File → Invalidate Caches → Invalidate and Restart**
- Try syncing again

### "SDK tools missing"
- Go to **Tools → SDK Manager**
- Install missing SDK components
- Usually need: Android SDK Platform, Build Tools, Android SDK Command-line Tools

### Multiple Projects Open
- You can have multiple projects open in Android Studio
- Use **Window** menu to switch between them
- Or close the other project: **File → Close Project**

## Quick Reference

```bash
# Always use this to open the project (recommended)
cd frontend
npm run cap:open

# Or manually:
# 1. File → Close Project
# 2. Open → Navigate to frontend/android
# 3. Wait for Gradle sync
```

## After Opening

Once Android Studio is open with your project:

1. ✅ Wait for Gradle sync (bottom right corner)
2. ✅ Check for any error messages
3. ✅ Build → Build Bundle(s) / APK(s) → Build APK(s)
4. ✅ Get your APK from the output folder

