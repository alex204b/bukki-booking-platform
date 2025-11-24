# How to Check Logcat for Errors

## Step-by-Step Guide

### Step 1: Open Logcat in Android Studio

1. **Run the app** (or try to run it)
2. **Open Logcat tab** (usually at the bottom of Android Studio)
3. If you don't see it: **View → Tool Windows → Logcat**

### Step 2: Filter Logcat

**Option A: Filter by App Name**
- In the search box, type: `BUKKi` or `com.bukki.app`

**Option B: Filter by Error Level**
- Click the dropdown (usually says "Verbose")
- Select **"Error"** to see only errors

**Option C: Filter by Tag**
- Type: `AndroidRuntime` or `FATAL EXCEPTION`

### Step 3: Look for Red Errors

**What to look for:**
- **Red text** = Errors
- **"FATAL EXCEPTION"** = App crash
- **"AndroidRuntime"** = Runtime errors
- **"BUKKiMainActivity"** = Our app's errors

### Step 4: Copy the Error

**Right-click on the error** → **Copy** or **Copy Stack Trace**

**Share the error message** - This will help identify the issue!

## Common Error Patterns

### Pattern 1: JavaScript Error
```
E/chromium: [ERROR:CONSOLE] Uncaught TypeError: ...
```
**Meaning:** Error in React/JavaScript code

### Pattern 2: Native Crash
```
FATAL EXCEPTION: main
java.lang.RuntimeException: ...
```
**Meaning:** Native Android error

### Pattern 3: Network Error
```
E/NetworkSecurityConfig: Cleartext HTTP traffic not permitted
```
**Meaning:** HTTP connection issue (should be fixed)

### Pattern 4: Permission Error
```
java.lang.SecurityException: Permission denied
```
**Meaning:** Missing permission

## Quick Commands

### View Logcat via ADB
```bash
adb logcat | grep -i "bukki\|androidruntime\|fatal"
```

### Clear Logcat
```bash
adb logcat -c
```

### Save Logcat to File
```bash
adb logcat > logcat.txt
```

## What to Share

If the app crashes, please share:

1. **The red error message** from Logcat
2. **The stack trace** (the lines below the error)
3. **When it happens** (on startup? after login?)

This will help identify the exact problem!

## Example Error Format

```
FATAL EXCEPTION: main
Process: com.bukki.app, PID: 12345
java.lang.RuntimeException: Unable to start activity...
    at android.app.ActivityThread.performLaunchActivity(ActivityThread.java:...)
    ...
```

Copy everything from "FATAL EXCEPTION" to the end of the stack trace.

