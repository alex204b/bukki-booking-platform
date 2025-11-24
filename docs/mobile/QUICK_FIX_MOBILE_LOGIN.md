# Quick Fix for Mobile Login

## Method 1: USB Port Forwarding (Easiest - Recommended)

This makes your phone's `localhost` point to your computer's backend.

### Steps:

1. **Connect phone via USB** (already done)

2. **Open terminal** (in Android Studio or any terminal)

3. **Run this command:**
   ```bash
   adb reverse tcp:3000 tcp:3000
   ```
   
   You should see no error (means it worked!)

4. **I've updated the code** to use `localhost:3000` for mobile

5. **Rebuild the app:**
   - In Android Studio: **Build → Rebuild Project**
   - Then: **Build → Build APK(s)** or click **Run**

6. **Install and test** - login should work now!

### To verify port forwarding worked:
```bash
adb reverse --list
```
Should show: `tcp:3000 tcp:3000`

## Method 2: Fix WiFi Connection

If USB doesn't work or you prefer WiFi:

### Check:
1. **Both devices on same WiFi?**
   - Computer: Check WiFi name
   - Phone: Check WiFi name
   - Must be the same!

2. **Test from phone browser:**
   - Go to: `http://192.168.1.137:3000/api`
   - Should see API documentation
   - If blank, router might be blocking

3. **Check router settings:**
   - Look for "AP Isolation" or "Client Isolation"
   - **Disable it** if enabled
   - This prevents devices from talking to each other

4. **If WiFi works:**
   - Change API URL back to: `http://192.168.1.137:3000`
   - Rebuild app

## After Fixing:

1. **Make sure backend is running:**
   ```bash
   cd backend
   npm start
   ```

2. **Rebuild app** in Android Studio

3. **Test login** on your phone

## Still Not Working?

Check backend terminal for errors when you try to login. The error message will tell us what's wrong!

