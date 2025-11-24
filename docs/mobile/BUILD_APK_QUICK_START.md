# Quick Start: Build APK for BUKKi

## ✅ Step 1: Install Prerequisites

1. **Java JDK 11+**
   - Download: https://adoptium.net/
   - Or: `choco install openjdk11` (if you have Chocolatey)

2. **Android Studio**
   - Download: https://developer.android.com/studio
   - Install it and open once to set up Android SDK

## ✅ Step 2: Build Your App

```bash
cd frontend
npm run build
```

## ✅ Step 3: Add Android Platform (First Time Only)

```bash
cd frontend
npm run cap:add
```

## ✅ Step 4: Sync App to Android

```bash
cd frontend
npm run cap:sync
```

## ✅ Step 5: Open in Android Studio

```bash
cd frontend
npm run cap:open
```

## ✅ Step 6: Build APK in Android Studio

1. Wait for Gradle sync (bottom bar)
2. **Build → Build Bundle(s) / APK(s) → Build APK(s)**
3. Wait for build
4. Click "locate" in notification
5. APK is at: `frontend/android/app/build/outputs/apk/debug/app-debug.apk`

## ✅ Step 7: Install on Phone

1. Transfer APK to phone (USB, email, cloud)
2. Enable "Install Unknown Apps" in phone settings
3. Open APK file and install

## 🔧 Configure API URL

Before building, update API URL in `frontend/.env.production`:

```
REACT_APP_API_URL=http://YOUR_COMPUTER_IP:3000
```

Or for production:
```
REACT_APP_API_URL=https://your-backend-domain.com
```

Then rebuild:
```bash
npm run build
npm run cap:sync
```

## 📱 Testing on Phone via USB

You can also test directly on phone without building APK:

1. Connect phone via USB
2. Enable USB debugging
3. In Android Studio: **Run → Run 'app'**
4. Select your phone from device list

## 🚀 That's It!

Your APK is ready to install. For detailed instructions, see `MOBILE_APP_BUILD_GUIDE.md`

