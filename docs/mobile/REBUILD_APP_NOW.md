# Rebuild App with New IP Address

## ✅ Your IP Address is Updated!

Your `.env` file now has:
```
REACT_APP_API_URL=http://10.18.106.106:3000
```

## Next Steps: Rebuild the App

Since you're using the Android app, you need to rebuild it so it picks up the new IP address.

### Step 1: Rebuild Frontend

```bash
cd frontend
npm run build
```

### Step 2: Sync with Capacitor

```bash
npx cap sync
```

This updates the Android project with the new build.

### Step 3: Rebuild in Android Studio

1. **Open Android Studio**
2. **Build → Rebuild Project** (or press `Ctrl+F9`)
3. **Run the app** (or press `Shift+F10`)

## Alternative: Quick Test

If you want to test quickly without rebuilding, you can also:

### Option A: Use USB Debugging (No IP Needed)

```bash
adb reverse tcp:3000 tcp:3000
```

Then the app will use `localhost:3000` through USB forwarding (no rebuild needed).

### Option B: Test in Browser First

```bash
cd frontend
npm start
```

Then open `http://10.18.106.106:3001` in your phone's browser to test if the IP works.

## Verify It's Working

After rebuilding, check Android Studio Logcat for:
```
[API] Capacitor app detected. Using API URL from environment: http://10.18.106.106:3000
```

If you see this message, the new IP is being used! 🎉

## Important Notes

- **University WiFi IPs change frequently** - You may need to update this again
- **Check your IP regularly** - Run `ipconfig` to see current IP
- **Keep `.env` updated** - Update it whenever your IP changes
- **USB method is easier** - If possible, use `adb reverse` to avoid IP issues

## Quick Commands

```bash
# Rebuild everything
cd frontend
npm run build
npx cap sync

# Then rebuild in Android Studio
```

Or use USB method (no rebuild needed):
```bash
adb reverse tcp:3000 tcp:3000
```

