# How to Update IP Address When It Changes

## Your IP Address Changed?

University WiFi networks (and many other networks) assign dynamic IP addresses that can change when you:
- Reconnect to WiFi
- Move to a different location
- Restart your computer
- After a certain time period

## Quick Fix

### Step 1: Find Your New IP Address

**Windows:**
```bash
ipconfig
```
Look for "IPv4 Address" under your WiFi adapter

**Mac/Linux:**
```bash
ifconfig
# or
ip addr show
```

### Step 2: Update `.env` File

Edit `frontend/.env` and update the IP address:

```env
REACT_APP_API_URL=http://YOUR_NEW_IP:3000
```

For example, if your new IP is `10.18.106.106`:
```env
REACT_APP_API_URL=http://10.18.106.106:3000
```

### Step 3: Rebuild the App

**For Android App:**
```bash
cd frontend
npm run build
npx cap sync
```

Then rebuild in Android Studio:
- Build → Rebuild Project
- Run the app

**For Web Browser:**
```bash
cd frontend
npm start
```
(No rebuild needed for web - it picks up .env changes automatically)

## Alternative: Use USB Debugging (No IP Needed)

If you're testing on Android via USB, you don't need to update the IP address!

Just use ADB reverse:
```bash
adb reverse tcp:3000 tcp:3000
```

The app will use `localhost:3000` which works through USB forwarding.

## Current IP Address

Your current IP: **10.18.106.106**

This is set in `frontend/.env` as:
```
REACT_APP_API_URL=http://10.18.106.106:3000
```

## Tips

1. **Check IP before testing** - Run `ipconfig` to verify your current IP
2. **Use USB when possible** - Avoids IP address issues
3. **Keep `.env` updated** - Update it whenever your IP changes
4. **Note:** University networks often change IPs, so check regularly

## Quick Check

To verify your backend is accessible:
- From computer: `http://localhost:3000/api` should work
- From phone browser: `http://10.18.106.106:3000/api` should work (if on same network)

