# Quick Fix: Android App Network Error

## You're running the app from Android Studio and getting network errors?

### Solution: Choose Your Method

---

## Method 1: USB Debugging (Easiest - Recommended)

**For:** Emulator or Physical Device via USB

### Steps:

1. **Open Android Studio Terminal** (bottom tab)

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

5. **Rebuild and run app in Android Studio**

✅ **Done!** The app will now connect to `http://localhost:3000`

---

## Method 2: WiFi (If USB doesn't work)

**For:** Physical Device on WiFi (not USB)

### Steps:

1. **Find your computer's IP:**
   ```bash
   ipconfig
   ```
   Look for "IPv4 Address" (e.g., `192.168.1.100`)

2. **Create `.env` file in `frontend` folder:**
   ```env
   REACT_APP_API_URL=http://192.168.1.100:3000
   ```
   (Replace with your actual IP)

3. **Rebuild the app:**
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

5. **Run app from Android Studio**

✅ **Done!** The app will now connect via WiFi

---

## Troubleshooting

### "adb: command not found"
- Use full path: `C:\Users\YOUR_USERNAME\AppData\Local\Android\Sdk\platform-tools\adb.exe reverse tcp:3000 tcp:3000`
- Or add ADB to PATH (see `SETUP_ADB_PORT_FORWARDING.md`)

### "Connection refused"
- Is backend running? → `cd backend && npm start`
- Check Android Studio Logcat for `[API]` messages

### Still not working?
- Check `ANDROID_APP_NETWORK_SETUP.md` for detailed troubleshooting

---

## Quick Test

1. Run `adb reverse tcp:3000 tcp:3000`
2. Start backend: `cd backend && npm start`
3. Run app from Android Studio
4. Check Logcat - should see: `[API] Using base URL: http://localhost:3000`

If you see that message, it's working! 🎉

