# Switch to USB Method (Recommended)

## Why USB Method?

University WiFi networks often block device-to-device communication, which is why your phone can't reach `10.18.106.106:3000`.

**USB method bypasses this** by forwarding `localhost:3000` from your phone to your computer through the USB cable.

## Quick Setup (3 Steps)

### Step 1: Set ADB Reverse

**Open Android Studio Terminal** (bottom tab) and run:

```bash
adb reverse tcp:3000 tcp:3000
```

**Verify it worked:**
```bash
adb reverse --list
```
Should show: `tcp:3000 tcp:3000`

### Step 2: Rebuild App

The `.env` file is already updated to use `localhost:3000`. Now rebuild:

```bash
cd frontend
npm run build
npx cap sync
```

### Step 3: Rebuild in Android Studio

1. **Build → Rebuild Project**
2. **Run the app**

✅ **Done!** The app will now connect through USB.

---

## If ADB Command Not Found

**Find ADB location:**
- Usually: `C:\Users\YOUR_USERNAME\AppData\Local\Android\Sdk\platform-tools\adb.exe`

**Use full path:**
```bash
C:\Users\YOUR_USERNAME\AppData\Local\Android\Sdk\platform-tools\adb.exe reverse tcp:3000 tcp:3000
```

Replace `YOUR_USERNAME` with your actual username.

---

## Verify It's Working

After running the app, check **Android Studio Logcat** for:

```
[API] Using base URL: http://localhost:3000
```

If you see this, it's working! 🎉

---

## Important Notes

- **ADB reverse only works while USB is connected**
- **If you disconnect USB**, you'll need to run `adb reverse` again
- **Backend must be running** on your computer
- **No IP address needed** - uses localhost through USB

---

## Troubleshooting

### "adb: command not found"
- Use full path to adb.exe (see above)
- Or add ADB to PATH (see `SETUP_ADB_PORT_FORWARDING.md`)

### "device not found"
- Make sure phone is connected via USB
- Enable USB debugging on phone
- Check: `adb devices` (should list your device)

### Still can't connect
- Make sure backend is running: `cd backend && npm start`
- Check ADB reverse is active: `adb reverse --list`
- Restart the app in Android Studio

