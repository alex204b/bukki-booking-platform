# Android App Network Setup Guide

## Problem: Network Error in Android App

When running the app from Android Studio (on emulator or physical device), you may get network errors because the app can't reach your backend server.

## Two Scenarios

### Scenario 1: USB Debugging (Emulator or Physical Device via USB)

**Use this when:**
- Testing on Android Emulator
- Testing on physical device connected via USB cable

**Solution: Use ADB Port Forwarding**

1. **Open Android Studio Terminal** (bottom tab) or any terminal
2. **Run this command:**
   ```bash
   adb reverse tcp:3000 tcp:3000
   ```
3. **Verify it worked:**
   ```bash
   adb reverse --list
   ```
   Should show: `tcp:3000 tcp:3000`

4. **Make sure backend is running:**
   ```bash
   cd backend
   npm start
   ```

5. **Rebuild and run the app in Android Studio**

**The app will use:** `http://localhost:3000` (forwarded to your computer via USB)

### Scenario 2: WiFi (Physical Device on Same Network)

**Use this when:**
- Testing on physical device over WiFi (not USB)
- USB debugging is not available or not working

**Solution: Use Your Computer's IP Address**

1. **Find your computer's IP address:**
   
   **Windows:**
   ```bash
   ipconfig
   ```
   Look for "IPv4 Address" under your WiFi adapter (e.g., `192.168.1.100`)
   
   **Mac/Linux:**
   ```bash
   ifconfig
   # or
   ip addr show
   ```

2. **Create/Update `.env` file in `frontend` folder:**
   ```env
   REACT_APP_API_URL=http://192.168.1.100:3000
   ```
   Replace `192.168.1.100` with your actual IP address

3. **Rebuild the app:**
   ```bash
   cd frontend
   npm run build
   npx cap sync
   ```

4. **Make sure backend is running:**
   ```bash
   cd backend
   npm start
   ```

5. **Ensure both devices are on the same WiFi network**

6. **Rebuild and run the app in Android Studio**

**The app will use:** `http://YOUR_COMPUTER_IP:3000`

## Quick Troubleshooting

### Check if ADB is working (for USB):
```bash
adb devices
```
Should show your device/emulator listed

### Check if backend is accessible:
- From computer browser: `http://localhost:3000/api` should show Swagger docs
- From phone browser (if on WiFi): `http://YOUR_IP:3000/api` should show Swagger docs

### Check Android Studio Logcat:
- Look for `[API]` log messages
- Check what URL the app is trying to use
- Look for network error messages

### Common Issues:

1. **"Connection refused" error:**
   - Backend not running? → Start it: `cd backend && npm start`
   - Wrong IP address? → Check with `ipconfig` / `ifconfig`
   - Firewall blocking? → Temporarily disable Windows Firewall for testing

2. **"Network error" in app:**
   - For USB: Did you run `adb reverse tcp:3000 tcp:3000`?
   - For WiFi: Did you set `REACT_APP_API_URL` in `.env` and rebuild?
   - Are both devices on same network? (for WiFi)

3. **ADB command not found:**
   - ADB not in PATH? → See `SETUP_ADB_PORT_FORWARDING.md`
   - Or use full path: `C:\Users\YOUR_USERNAME\AppData\Local\Android\Sdk\platform-tools\adb.exe reverse tcp:3000 tcp:3000`

## Step-by-Step: USB Debugging Setup

1. **Connect device via USB** or start emulator
2. **Enable USB Debugging** on device (Settings → Developer Options)
3. **Verify connection:**
   ```bash
   adb devices
   ```
4. **Forward port:**
   ```bash
   adb reverse tcp:3000 tcp:3000
   ```
5. **Start backend:**
   ```bash
   cd backend
   npm start
   ```
6. **Run app from Android Studio**

## Step-by-Step: WiFi Setup

1. **Find your computer's IP:**
   ```bash
   ipconfig  # Windows
   ifconfig  # Mac/Linux
   ```

2. **Create `.env` file in `frontend` folder:**
   ```env
   REACT_APP_API_URL=http://192.168.1.100:3000
   ```
   (Replace with your actual IP)

3. **Rebuild frontend:**
   ```bash
   cd frontend
   npm run build
   npx cap sync
   ```

4. **Start backend:**
   ```bash
   cd backend
   npm start
   ```

5. **Ensure same WiFi network** (computer and phone)

6. **Check firewall** (temporarily disable for testing)

7. **Run app from Android Studio**

## Which Method to Use?

- **Emulator?** → Use USB method (ADB reverse)
- **Physical device via USB?** → Use USB method (ADB reverse)
- **Physical device via WiFi only?** → Use WiFi method (IP address)
- **Not sure?** → Try USB method first (easier)

## Important Notes

- **ADB reverse** only works while USB is connected
- **IP address method** requires rebuilding the app after changing `.env`
- **Backend must be running** for either method to work
- **Both devices must be on same network** for WiFi method
- **Firewall may block connections** - temporarily disable for testing

## Testing

After setup, test by:
1. Opening the app
2. Trying to login
3. Check Android Studio Logcat for `[API]` messages
4. Should see: `[API] Using base URL: http://...`

If you see network errors, check:
- Is backend running?
- Is the URL correct? (check Logcat)
- Is ADB reverse active? (for USB method)
- Is IP address correct? (for WiFi method)

