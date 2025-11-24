# Test Backend Connection

## Quick Test Steps

### 1. Test from Your Computer Browser
Open your computer's browser and go to:
```
http://192.168.1.137:3000/api
```

**Expected:** You should see the Swagger API documentation page (with endpoints listed)

**If you see blank page:**
- Backend might not be running properly
- Check backend terminal for errors

### 2. Test from Your Phone Browser
On your phone, open Chrome or any browser and go to:
```
http://192.168.1.137:3000/api
```

**Expected:** Same Swagger API documentation page

**If you see blank page or error:**
- Phone and computer are not on the same WiFi network, OR
- Router is blocking device-to-device communication, OR
- Windows Firewall is still blocking (even though rule exists)

### 3. Test Login Endpoint Directly
On your phone browser, try:
```
http://192.168.1.137:3000/auth/login
```

**Expected:** Should show an error about missing credentials (this is good - means server is reachable!)

**If blank page:** Server is not reachable from phone

## Common Issues & Fixes

### Issue 1: Phone and Computer on Different Networks
- **Check:** Make sure both are connected to the same WiFi network
- **Fix:** Connect both to the same WiFi

### Issue 2: Router Blocking Device Communication
Some routers have "AP Isolation" or "Client Isolation" enabled, which prevents devices from talking to each other.

**Check router settings:**
- Look for "AP Isolation", "Client Isolation", or "Wireless Isolation"
- **Disable it** if enabled
- Save and restart router

### Issue 3: Windows Firewall Still Blocking
Even though the rule exists, it might not be working.

**Try this:**
1. Open Windows Defender Firewall
2. Click "Advanced settings"
3. Click "Inbound Rules"
4. Find "Node.js JavaScript Runtime"
5. Make sure it's **Enabled** and allows connections on **Port 3000**

### Issue 4: Backend Not Actually Running
Check the backend terminal - you should see:
```
🚀 Application is running on: http://0.0.0.0:3000
```

If you don't see this, the backend isn't running!

## Alternative: Use USB Port Forwarding

If WiFi doesn't work, use USB:

1. **Connect phone via USB**
2. **In terminal, run:**
   ```bash
   adb reverse tcp:3000 tcp:3000
   ```
3. **Update `frontend/src/services/api.ts` line 17 to:**
   ```typescript
   return 'http://localhost:3000';
   ```
4. **Rebuild the app** in Android Studio
5. **Install on phone**

This makes your phone's localhost point to your computer's port 3000!

