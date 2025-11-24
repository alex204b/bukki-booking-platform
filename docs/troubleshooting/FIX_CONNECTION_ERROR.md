# Fix: Cannot Connect to Server Error

## Error Message
```
Cannot connect to server at 10.18.106.106:3000
Make sure backend is running on port 3000, ADB reverse is set
```

## Quick Solutions

### Solution 1: Use USB Debugging (Easiest - Recommended)

This avoids IP address issues completely!

**Steps:**

1. **Connect your phone via USB** (or use emulator)

2. **Open Android Studio Terminal** (bottom tab)

3. **Run ADB reverse:**
   ```bash
   adb reverse tcp:3000 tcp:3000
   ```

4. **Verify it worked:**
   ```bash
   adb reverse --list
   ```
   Should show: `tcp:3000 tcp:3000`

5. **Update `.env` file to use localhost:**
   Edit `frontend/.env`:
   ```env
   REACT_APP_API_URL=http://localhost:3000
   ```

6. **Rebuild the app:**
   ```bash
   cd frontend
   npm run build
   npx cap sync
   ```

7. **Make sure backend is running:**
   ```bash
   cd backend
   npm start
   ```

8. **Rebuild and run in Android Studio**

✅ **Done!** The app will use `localhost:3000` through USB forwarding.

---

### Solution 2: Fix WiFi Connection

If you want to use WiFi instead of USB:

**Step 1: Check if backend is running**

```bash
cd backend
npm start
```

You should see:
```
🚀 Application is running on: http://0.0.0.0:3000
```

**Step 2: Verify your current IP address**

```bash
ipconfig
```

Look for "IPv4 Address" - it might have changed!

**Step 3: Update `.env` file**

Edit `frontend/.env` with your current IP:
```env
REACT_APP_API_URL=http://YOUR_CURRENT_IP:3000
```

For example, if your IP is `10.18.106.106`:
```env
REACT_APP_API_URL=http://10.18.106.106:3000
```

**Step 4: Check firewall**

Windows Firewall might be blocking connections:

1. Open **Windows Defender Firewall**
2. Click **Allow an app or feature through Windows Defender Firewall**
3. Find **Node.js** and make sure both **Private** and **Public** are checked
4. Or temporarily disable firewall for testing

**Step 5: Test backend from phone browser**

On your phone, open browser and go to:
```
http://YOUR_IP:3000/api
```

Should show Swagger documentation page. If not, backend isn't accessible.

**Step 6: Rebuild app**

```bash
cd frontend
npm run build
npx cap sync
```

**Step 7: Rebuild in Android Studio**

---

## Troubleshooting

### "adb: command not found"

**Option A: Use full path**
```bash
C:\Users\YOUR_USERNAME\AppData\Local\Android\Sdk\platform-tools\adb.exe reverse tcp:3000 tcp:3000
```

**Option B: Add to PATH**
See `SETUP_ADB_PORT_FORWARDING.md`

### "Backend not accessible"

1. **Check backend is running:**
   ```bash
   cd backend
   npm start
   ```

2. **Check if port 3000 is in use:**
   ```bash
   netstat -ano | findstr :3000
   ```

3. **Check firewall:**
   - Temporarily disable Windows Firewall
   - Or allow Node.js through firewall

4. **Check network:**
   - Both devices must be on same WiFi network
   - University networks might block device-to-device communication

### "IP address keeps changing"

University WiFi assigns dynamic IPs. Solutions:

1. **Use USB method** (recommended) - no IP needed
2. **Check IP before each test:**
   ```bash
   ipconfig
   ```
   Then update `.env` file

---

## Recommended Approach

**For Android Studio testing, use USB method:**

1. `adb reverse tcp:3000 tcp:3000`
2. Set `.env` to `http://localhost:3000`
3. Rebuild app
4. Test

This is more reliable than WiFi, especially on university networks.

---

## Quick Test

After setup, check Android Studio Logcat for:
```
[API] Using base URL: http://localhost:3000
```

Or:
```
[API] Using base URL: http://10.18.106.106:3000
```

If you see the correct URL, the connection should work!

