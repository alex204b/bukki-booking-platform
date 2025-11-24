# URGENT: Check Logcat to Find Crash Reason

## The app is crashing - we need to see the error!

I've added extensive logging, but we need to see what's in **Logcat** to fix this.

## Step-by-Step: Get the Error Message

### Step 1: Connect Your Phone

- Connect phone via USB to your computer
- Or use Android Studio emulator

### Step 2: Open Android Studio

1. Open your project in Android Studio
2. Make sure your phone/emulator is selected in the device dropdown

### Step 3: Open Logcat

1. **Click "Logcat" tab** at the bottom of Android Studio
2. If you don't see it: **View → Tool Windows → Logcat**

### Step 4: Clear and Filter Logcat

1. **Click the trash icon** (Clear Logcat) to clear old logs
2. **In the search box**, type: `BUKKi` or `com.bukki.app`
3. **Or filter by level**: Select **"Error"** from the dropdown

### Step 5: Run the App

1. **Click Run** (or press Shift+F10)
2. **Watch Logcat immediately** as the app starts

### Step 6: Find the Error

**Look for:**
- **Red text** = Errors
- **"FATAL EXCEPTION"** = App crash
- **"AndroidRuntime"** = Runtime errors
- **"[APP]"** = Our app's logs
- **"[AuthContext]"** = Authentication logs
- **"[Global Error Handler]"** = JavaScript errors

### Step 7: Copy the Error

1. **Right-click on the red error message**
2. **Select "Copy"** or **"Copy Stack Trace"**
3. **Share it with me** - This will tell us exactly what's wrong!

## What to Look For

### Pattern 1: JavaScript Error
```
E/chromium: [ERROR:CONSOLE] [APP] ...
E/chromium: [ERROR:CONSOLE] [Global Error Handler] ...
```
**This means:** Error in React/JavaScript code

### Pattern 2: Native Crash
```
FATAL EXCEPTION: main
Process: com.bukki.app, PID: 12345
java.lang.RuntimeException: ...
```
**This means:** Native Android error

### Pattern 3: Initialization Error
```
[APP] Starting initialization...
[APP] Root element found...
[APP] Rendering app...
[ERROR] ...
```
**This means:** Error during app startup

## Quick ADB Command

If Android Studio Logcat isn't working, use command line:

```bash
adb logcat -c  # Clear logs
adb logcat | grep -i "bukki\|app\|androidruntime\|fatal"
```

Then run the app and watch the output.

## What I Added

I've added logging at every step:
- `[APP]` - App initialization
- `[AuthContext]` - Authentication
- `[Global Error Handler]` - JavaScript errors
- `[BUKKiMainActivity]` - Native Android logs

## Most Important

**Please share the Logcat error message!** 

Without seeing the actual error, I can only guess. The Logcat will show exactly what's failing.

## Expected Logs (If Working)

If the app works, you should see:
```
[APP] Starting initialization...
[APP] Root element found, creating React root...
[APP] Rendering app...
[APP] App rendered successfully
[AuthContext] Initializing...
[AuthContext] Initialization complete
[APP] App component mounted
```

If it crashes, the logs will stop at the error point.

