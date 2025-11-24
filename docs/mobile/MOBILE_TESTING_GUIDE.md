# Mobile Testing Guide for BUKKi App

## Method 1: USB Cable (Similar to Android Development)

### Prerequisites
1. **Enable USB Debugging on your phone:**
   - Android: Settings → About Phone → Tap "Build Number" 7 times → Go back → Developer Options → Enable "USB Debugging"
   - iPhone: Not needed (use Method 2 instead)

2. **Install ADB (Android Debug Bridge):**
   - Windows: Download from [Android Platform Tools](https://developer.android.com/tools/releases/platform-tools)
   - Or install via: `choco install adb` (if you have Chocolatey)
   - Mac: `brew install android-platform-tools`
   - Linux: `sudo apt-get install adb`

### Steps:

1. **Connect your phone via USB** and allow USB debugging when prompted

2. **Verify connection:**
   ```bash
   adb devices
   ```
   You should see your device listed

3. **Forward ports:**
   ```bash
   # Forward frontend port (React default: 3000)
   adb reverse tcp:3000 tcp:3000
   
   # Forward backend port (if different, check your backend config)
   adb reverse tcp:3000 tcp:3000
   ```

4. **Start your backend:**
   ```bash
   cd backend
   npm start
   ```

5. **Start your frontend with network access:**
   ```bash
   cd frontend
   # Set environment variable to allow network access
   set HOST=0.0.0.0  # Windows
   # or
   export HOST=0.0.0.0  # Mac/Linux
   
   npm start
   ```

6. **On your phone browser, go to:**
   ```
   http://localhost:3000
   ```

---

## Method 2: WiFi/Local Network (Easier - Recommended)

### Steps:

1. **Find your computer's IP address:**
   - **Windows:** Open Command Prompt and run:
     ```bash
     ipconfig
     ```
     Look for "IPv4 Address" under your active network adapter (usually starts with 192.168.x.x)
   
   - **Mac/Linux:** Open Terminal and run:
     ```bash
     ifconfig | grep "inet "
     ```
     or
     ```bash
     ip addr show
     ```
     Look for your local IP (usually 192.168.x.x or 10.0.x.x)

2. **Make sure your phone and computer are on the same WiFi network**

3. **Start your backend:**
   ```bash
   cd backend
   npm start
   ```
   Make sure it's listening on `0.0.0.0` or your local IP (not just localhost)

4. **Start your frontend with network access:**
   ```bash
   cd frontend
   
   # Windows PowerShell:
   $env:HOST="0.0.0.0"
   npm start
   
   # Windows CMD:
   set HOST=0.0.0.0
   npm start
   
   # Mac/Linux:
   HOST=0.0.0.0 npm start
   ```

5. **Configure CORS in backend** - Create or update `.env` file in `backend` folder:
   ```
   FRONTEND_URL=http://YOUR_COMPUTER_IP:3000
   ```
   Or allow all origins for testing (not recommended for production):
   ```
   CORS_ALLOWED_ORIGINS=http://localhost:3000,http://YOUR_COMPUTER_IP:3000
   ```
   Replace `YOUR_COMPUTER_IP` with the IP you found in step 1

6. **Create a `.env` file in the frontend folder** (if it doesn't exist):
   ```
   REACT_APP_API_URL=http://YOUR_COMPUTER_IP:3000
   ```
   Replace `YOUR_COMPUTER_IP` with the IP you found in step 1 (e.g., `192.168.1.100`)

7. **Restart both backend and frontend** after changing `.env` files

8. **On your phone browser, go to:**
   ```
   http://YOUR_COMPUTER_IP:3000
   ```
   Replace `YOUR_COMPUTER_IP` with your actual IP address

   **Note:** If you see CORS errors, make sure you've updated the backend `.env` file with your IP address in step 5

---

## Quick Setup Script (Windows)

Create a file `start-mobile-test.bat` in your project root:

```batch
@echo off
echo Finding your IP address...
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /c:"IPv4"') do (
    set IP=%%a
    goto :found
)
:found
set IP=%IP:~1%
echo Your IP address is: %IP%
echo.

echo Starting backend...
start cmd /k "cd backend && npm start"

timeout /t 3

echo Starting frontend...
cd frontend
set HOST=0.0.0.0
set REACT_APP_API_URL=http://%IP%:3000
npm start

echo.
echo ========================================
echo Open on your phone: http://%IP%:3000
echo ========================================
pause
```

---

## Troubleshooting

### Can't connect from phone:
1. **Check firewall:** Make sure Windows Firewall allows Node.js/port 3000
2. **Check IP address:** Make sure you're using the correct IP (not 127.0.0.1)
3. **Check network:** Make sure phone and computer are on same WiFi
4. **Check ports:** Make sure nothing else is using port 3000

### API calls failing:
- Make sure `REACT_APP_API_URL` in `.env` file points to your computer's IP, not localhost
- Restart the frontend after changing `.env` file

### Backend not accessible:
- Check backend is listening on `0.0.0.0` not just `127.0.0.1`
- Check backend `main.ts` or startup file

---

## Notes:
- The frontend dev server (React) runs on port 3000 by default
- The backend (NestJS) also runs on port 3000 by default
- If they conflict, change one of them in their respective config files
- For production builds, you can also build the app and serve it with a simple HTTP server

