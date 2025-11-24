# Fix: Android App Starts Then Stops Immediately

## Common Causes

1. **Java Version Mismatch** - Different Java versions in build files
2. **Missing Permissions** - App needs permissions that aren't granted
3. **JavaScript Error on Startup** - Error in React code during initialization
4. **Capacitor Configuration Issue** - Problem with Capacitor setup
5. **Build Configuration** - Gradle build issues

## Quick Fixes to Try

### Fix 1: Check Logcat for Errors

**In Android Studio:**
1. Open **Logcat** (bottom tab)
2. Filter by: `BUKKi` or `AndroidRuntime`
3. Look for red error messages
4. Share the error message

### Fix 2: Clean and Rebuild

**In Android Studio:**
1. **Build → Clean Project**
2. **Build → Rebuild Project**
3. **File → Invalidate Caches → Invalidate and Restart**
4. Try running again

### Fix 3: Check Java Version

There might be a Java version mismatch. Check:
- `app/build.gradle` - Should match your Java version
- `app/capacitor.build.gradle` - Should match

### Fix 4: Check Device/Emulator Logs

**In Android Studio:**
1. Open **Logcat**
2. Filter by: `FATAL EXCEPTION` or `AndroidRuntime`
3. Look for the crash reason

### Fix 5: Test on Different Device/Emulator

Sometimes specific devices have issues. Try:
- Different emulator
- Physical device
- Different Android version

## How to Get Error Details

### Method 1: Android Studio Logcat

1. **Run the app**
2. **Open Logcat** (bottom tab)
3. **Filter by:** `BUKKi` or `com.bukki.app`
4. **Look for red errors** - These show why it crashed

### Method 2: ADB Logcat

```bash
adb logcat | grep -i "bukki\|androidruntime\|fatal"
```

### Method 3: Check Run Tab

In Android Studio, check the **Run** tab for any error messages.

## Common Error Messages

### "java.lang.RuntimeException"
- Usually a JavaScript error
- Check Logcat for full stack trace

### "Unable to instantiate activity"
- MainActivity issue
- Check MainActivity.java

### "Network Security Config"
- HTTP connection issue
- Already fixed with `usesCleartextTraffic="true"`

### "ClassNotFoundException"
- Missing dependency
- Clean and rebuild

## Next Steps

1. **Check Logcat** - This is the most important step
2. **Share the error** - Copy the red error message from Logcat
3. **Try clean rebuild** - Often fixes build issues

## What to Share

If the app still crashes, please share:
1. **Logcat error message** (the red text)
2. **Android version** (emulator or device)
3. **When it crashes** (immediately on start? after login?)

This will help identify the exact issue.

