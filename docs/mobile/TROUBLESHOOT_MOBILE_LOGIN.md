# Troubleshooting Mobile Login Issues

## Problem: Network Error When Logging In from Phone

If you're getting a network error when trying to login from your phone, the phone can't reach your computer's backend server.

## Quick Fix: Access App via Your Computer's IP Address

**The easiest solution:** Access the frontend app from your phone using your computer's IP address, and the API will automatically use the same IP.

1. **Find your computer's IP address:**
   - **Windows:** Open Command Prompt and run `ipconfig`
   - Look for "IPv4 Address" under "Wireless LAN adapter WiFi" (e.g., `192.168.1.100`)

2. **Make sure backend is running:**
   ```bash
   cd backend
   npm start
   ```

3. **Start the frontend:**
   ```bash
   cd frontend
   npm start
   ```

4. **On your phone, open browser and go to:**
   ```
   http://YOUR_COMPUTER_IP:3001
   ```
   Example: `http://192.168.1.100:3001`

5. **The app will automatically detect the IP and use it for API calls!**

## Alternative: Set Environment Variable

If you want to hardcode the IP address:

## Step 1: Make Sure Backend is Running

1. **Open a terminal/command prompt**
2. **Navigate to backend folder:**
   ```bash
   cd backend
   ```
3. **Start the backend:**
   ```bash
   npm start
   ```
4. **You should see:**
   ```
   🚀 Application is running on: http://0.0.0.0:3000
   📚 API Documentation: http://0.0.0.0:3000/api
   ```

## Step 2: Check Your Computer's IP Address

Your IP might have changed! Check it again:

**Windows:**
```bash
ipconfig
```
Look for "IPv4 Address" under "Wireless LAN adapter WiFi" - it should be something like `192.168.1.xxx`

**If it changed**, update it in `frontend/src/services/api.ts` (line 17):
```typescript
return 'http://YOUR_NEW_IP:3000';
```

Then rebuild the app!

## Step 3: Test Connection from Phone

1. **On your phone**, open a web browser (Chrome, etc.)
2. **Go to:** `http://192.168.1.137:3000/api`
3. **You should see:** The Swagger API documentation page
4. **If you see a blank page or error:**
   - Backend is not running, OR
   - Firewall is blocking, OR
   - Wrong IP address

## Step 4: Check Windows Firewall

Windows Firewall might be blocking incoming connections:

1. **Open Windows Defender Firewall:**
   - Press `Win + R`
   - Type: `firewall.cpl`
   - Press Enter

2. **Allow Node.js through firewall:**
   - Click "Allow an app or feature through Windows Defender Firewall"
   - Click "Change settings"
   - Find "Node.js" and check both "Private" and "Public"
   - If Node.js is not listed, click "Allow another app" → Browse → Find `node.exe` (usually in `C:\Program Files\nodejs\`)

3. **Or temporarily disable firewall** (for testing only):
   - Turn off Windows Defender Firewall temporarily
   - Test if login works
   - If it works, re-enable firewall and add Node.js exception

## Step 5: Verify Backend is Listening on All Interfaces

The backend should be listening on `0.0.0.0` (all network interfaces), which it already is:
```typescript
await app.listen(port, '0.0.0.0');
```

This is correct - it allows connections from your network.

## Step 6: Test from Computer Browser

1. **On your computer**, open a browser
2. **Go to:** `http://192.168.1.137:3000/api`
3. **You should see:** The API documentation
4. **If this works but phone doesn't:** It's a network/firewall issue

## Step 7: Check Both Devices Are on Same Network

- **Your computer** and **your phone** must be on the **same WiFi network**
- If your phone is on mobile data, it won't work
- If your computer is on Ethernet and phone on WiFi, make sure they're on the same network

## Step 8: Alternative - Use USB Port Forwarding

If WiFi doesn't work, use USB:

1. **Connect phone via USB**
2. **Enable USB Debugging** (already done)
3. **In terminal, run:**
   ```bash
   adb reverse tcp:3000 tcp:3000
   ```
4. **Update API URL in code to:** `http://localhost:3000` (for mobile)
5. **Rebuild app**

## Quick Checklist

- [ ] Backend is running (`npm start` in backend folder)
- [ ] Backend shows "Application is running on: http://0.0.0.0:3000"
- [ ] IP address is correct (check with `ipconfig`)
- [ ] Phone and computer are on same WiFi network
- [ ] Windows Firewall allows Node.js
- [ ] Can access `http://YOUR_IP:3000/api` from computer browser
- [ ] Can access `http://YOUR_IP:3000/api` from phone browser

## Still Not Working?

Try these:
1. **Restart backend server**
2. **Restart your computer** (sometimes fixes network issues)
3. **Check router settings** - some routers block device-to-device communication
4. **Try a different port** (change backend to 3001, update frontend too)

