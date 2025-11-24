# Mobile Network Setup Guide

## Problem: Network Error When Connecting from Phone

When testing the app from your phone's browser, you may encounter network errors because the phone can't access `localhost` on your computer.

## Solution: Use Your Computer's IP Address

### Step 1: Find Your Computer's IP Address

**Windows:**
```bash
ipconfig
```
Look for "IPv4 Address" under your WiFi adapter (usually something like `192.168.1.100`)

**Mac/Linux:**
```bash
ifconfig
# or
ip addr show
```
Look for your WiFi adapter's IP address (usually `192.168.x.x` or `10.x.x.x`)

### Step 2: Access the App via IP Address

Instead of accessing `http://localhost:3001` from your phone, use:
```
http://YOUR_COMPUTER_IP:3001
```

For example, if your IP is `192.168.1.100`:
```
http://192.168.1.100:3001
```

### Step 3: Ensure Backend is Accessible

1. **Make sure backend is running:**
   ```bash
   cd backend
   npm start
   ```

2. **Verify backend is listening on all interfaces:**
   The backend should already be configured to listen on `0.0.0.0:3000` (check `backend/src/main.ts`)

3. **Test backend from phone:**
   Open in phone browser: `http://YOUR_COMPUTER_IP:3000/api`
   You should see the Swagger documentation page

### Step 4: Check Firewall

**Windows:**
1. Open Windows Defender Firewall
2. Click "Allow an app or feature through Windows Defender Firewall"
3. Make sure Node.js is allowed for both Private and Public networks
4. Or temporarily disable firewall for testing

**Mac:**
1. System Preferences → Security & Privacy → Firewall
2. Make sure firewall allows Node.js or temporarily disable for testing

### Step 5: Ensure Both Devices Are on Same Network

- Your computer and phone must be on the same WiFi network
- If using mobile hotspot, make sure both devices are connected to it

## Alternative: Using Environment Variable

If you want to hardcode the IP address, create a `.env` file in the `frontend` folder:

```env
REACT_APP_API_URL=http://192.168.1.100:3000
```

Replace `192.168.1.100` with your actual IP address.

Then restart the frontend:
```bash
cd frontend
npm start
```

## For Capacitor Mobile Apps (Android/iOS)

If you're testing a built mobile app (not browser):

1. **For Android (USB debugging):**
   ```bash
   adb reverse tcp:3000 tcp:3000
   ```
   This forwards port 3000 from your phone to your computer

2. **For Android (WiFi):**
   - Connect phone to same WiFi
   - Use IP address method above
   - Update `capacitor.config.ts` if needed

## Troubleshooting

### Still Getting Network Errors?

1. **Check backend is running:**
   ```bash
   # In backend folder
   npm start
   ```

2. **Verify backend is accessible:**
   - From computer: `http://localhost:3000/api` should work
   - From phone: `http://YOUR_IP:3000/api` should work

3. **Check CORS settings:**
   - Backend should allow all origins in development (already configured)
   - Check `backend/src/main.ts` line 68

4. **Check browser console:**
   - Open browser dev tools on phone (if possible)
   - Look for the actual error message
   - Check what URL it's trying to connect to

5. **Verify IP address:**
   - Make sure you're using the correct IP
   - IP might change if you reconnect to WiFi
   - Run `ipconfig` again to verify

6. **Try different port:**
   - If port 3000 is blocked, change backend port in `.env`:
     ```
     PORT=3001
     ```
   - Update frontend API URL accordingly

## Quick Test

1. Find your IP: `ipconfig` (Windows) or `ifconfig` (Mac/Linux)
2. Start backend: `cd backend && npm start`
3. Start frontend: `cd frontend && npm start`
4. On phone, open: `http://YOUR_IP:3001`
5. Check browser console for any errors

## Notes

- The app automatically detects if you're accessing via IP address and uses that IP for API calls
- If accessing via `localhost` on phone, it will try to use `localhost:3000` which won't work
- Always access the app via IP address when testing from phone browser

