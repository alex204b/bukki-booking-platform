# Fix: App Crashes Immediately

## What I Fixed

1. **Added ErrorBoundary** - Catches React errors and shows a user-friendly error screen instead of crashing
2. **Added global error handlers** - Catches JavaScript errors and unhandled promise rejections
3. **Improved AuthContext error handling** - Prevents crashes from corrupted localStorage data
4. **Added fallback rendering** - If the app fails to load, shows a recovery screen

## Next Steps

### Step 1: Rebuild in Android Studio

1. **Build → Rebuild Project**
2. **Run the app**

### Step 2: Check Logcat for Errors

Open **Android Studio Logcat** and filter for:
- `[ErrorBoundary]` - React errors
- `[Global Error Handler]` - JavaScript errors
- `[Unhandled Promise Rejection]` - Promise errors
- `[AuthContext]` - Authentication errors

### Step 3: If App Still Crashes

The ErrorBoundary will now show an error screen instead of crashing. Look for:

1. **Error message** - What went wrong
2. **Stack trace** (in development mode) - Where it failed
3. **"Clear Cache & Reload" button** - Try this first

### Step 4: Clear App Data

If the error screen appears:

1. **Click "Clear Cache & Reload"** button
2. Or manually:
   - Settings → Apps → BUKKi → Storage → Clear Data
   - Then restart the app

## Common Causes

### 1. Corrupted localStorage Data
**Symptom:** App crashes on startup
**Fix:** ErrorBoundary now handles this automatically

### 2. Missing Dependencies
**Symptom:** "Cannot read property of undefined"
**Fix:** Check Logcat for the exact error

### 3. Network Errors During Initialization
**Symptom:** App crashes when trying to connect
**Fix:** Make sure backend is running

### 4. Capacitor Plugin Issues
**Symptom:** Crashes related to native plugins
**Fix:** Check Logcat for plugin-specific errors

## Debugging Tips

### Check Logcat Output

Look for these patterns:

```
[ErrorBoundary] Caught error: ...
[Global Error Handler] ...
[AuthContext] Error initializing auth: ...
```

### Enable Developer Mode

In Android Studio:
1. Run → Edit Configurations
2. Add environment variable: `NODE_ENV=development`
3. This will show detailed error messages

### Test in Browser First

Before testing on Android:
```bash
cd frontend
npm start
```

Open `http://localhost:3001` in browser to see if errors appear there too.

## What the ErrorBoundary Does

- **Catches React errors** - Prevents app from crashing
- **Shows error screen** - User-friendly message
- **Provides recovery options** - Clear cache button
- **Logs errors** - For debugging in Logcat

## If Error Screen Appears

1. **Read the error message** - It tells you what went wrong
2. **Check Logcat** - For detailed stack trace
3. **Click "Clear Cache & Reload"** - Clears localStorage and reloads
4. **If still fails** - Check the error details in Logcat

## Expected Behavior

- **Before:** App crashes → Android shows "App has stopped"
- **After:** App shows error screen → User can recover

The app should no longer crash silently. Instead, it will show an error screen with recovery options.

