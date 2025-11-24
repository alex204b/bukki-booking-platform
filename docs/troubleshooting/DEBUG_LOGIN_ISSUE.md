# Debug Login Loading Issue

## Problem
After entering credentials, the app shows loading but doesn't navigate to the account.

## What I Fixed

1. **Added timeouts** - API calls now have 10 second timeouts to prevent hanging
2. **Added business check timeout** - The business check after login has a 5 second timeout
3. **Better error handling** - Loading state is now properly reset even if errors occur
4. **Added logging** - Console logs will help identify where the issue occurs

## How to Debug

### Step 1: Check Android Studio Logcat

Open **Logcat** in Android Studio and filter for:
- `[LOGIN]` - Login process logs
- `[FRONTEND LOGIN]` - Auth context logs
- `[API]` - API request logs

### Step 2: Look for These Messages

**Successful flow should show:**
```
[LOGIN] Starting login process...
[FRONTEND LOGIN] Attempting login: { email: ..., passwordLength: ... }
[API] Using base URL: http://10.18.106.106:3000
[LOGIN] Login successful, result: { user: ..., token: ... }
[LOGIN] Navigating to: /
```

**If you see errors:**
- Network errors → Check backend connection
- Timeout errors → Backend might be slow or unreachable
- 401 errors → Token issue

### Step 3: Common Issues

#### Issue 1: Network Timeout
**Symptoms:** Logs show `[API] Network error` or timeout
**Solution:**
- Check if backend is running: `cd backend && npm start`
- Check if IP is correct: `ipconfig` (should be `10.18.106.106`)
- Try USB method: `adb reverse tcp:3000 tcp:3000`

#### Issue 2: Business Check Hanging
**Symptoms:** Logs show `[LOGIN] User is business owner, checking business status...` but nothing after
**Solution:**
- The timeout should now catch this (5 seconds)
- Check backend `/businesses/my-business` endpoint
- Check if user has a business record

#### Issue 3: Navigation Not Working
**Symptoms:** Login succeeds but doesn't navigate
**Solution:**
- Check if `navigate()` is being called in logs
- Check ProtectedRoute component
- Check if user state is set correctly

### Step 4: Quick Test

1. **Clear app data** (if needed):
   - Settings → Apps → BUKKi → Clear Data

2. **Check backend is running:**
   ```bash
   cd backend
   npm start
   ```

3. **Try login again** and watch Logcat

4. **Check what URL is being used:**
   - Look for `[API] Using base URL:` in logs
   - Should be `http://10.18.106.106:3000` or `http://localhost:3000`

## Expected Behavior

1. User enters credentials
2. Login API call is made
3. If successful, user and token are stored
4. If business owner, check business status (with timeout)
5. Navigate to home page or onboarding

## If Still Not Working

1. **Check Logcat** - Share the `[LOGIN]` and `[API]` logs
2. **Check backend logs** - See if login request is received
3. **Test API directly:**
   - From phone browser: `http://10.18.106.106:3000/api`
   - Should show Swagger docs

## Quick Fixes to Try

### Fix 1: Skip Business Check (Temporary)
If business check is the issue, you can temporarily skip it by commenting out the business owner check in `Login.tsx`

### Fix 2: Use USB Method
```bash
adb reverse tcp:3000 tcp:3000
```
Then rebuild app (will use localhost instead of IP)

### Fix 3: Check Backend Response
Make sure backend `/auth/login` endpoint returns:
```json
{
  "user": { ... },
  "token": "...",
  "requiresVerification": false
}
```

