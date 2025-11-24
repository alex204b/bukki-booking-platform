# Setup ADB Port Forwarding for Mobile App

## Method 1: Use Android Studio Terminal (Easiest)

1. **In Android Studio**, open the **Terminal** tab at the bottom
2. **Run:**
   ```bash
   adb reverse tcp:3000 tcp:3000
   ```
3. **You should see:** No output (means it worked!)

## Method 2: Find ADB and Run Manually

### Step 1: Find ADB Location

ADB is usually in one of these locations:
- `C:\Users\YOUR_USERNAME\AppData\Local\Android\Sdk\platform-tools\adb.exe`
- Or wherever you installed Android SDK

### Step 2: Run Port Forwarding

Once you find `adb.exe`, run:
```powershell
C:\Users\YOUR_USERNAME\AppData\Local\Android\Sdk\platform-tools\adb.exe reverse tcp:3000 tcp:3000
```

Replace `YOUR_USERNAME` with your actual username.

### Step 3: Verify It Worked

```powershell
adb reverse --list
```

Should show: `tcp:3000 tcp:3000`

## Method 3: Add ADB to PATH (Permanent Solution)

1. **Find ADB location** (usually in Android SDK platform-tools)
2. **Add to Windows PATH:**
   - Press `Win + X` → **System** → **Advanced system settings**
   - Click **Environment Variables**
   - Under "System variables", find **Path** → Click **Edit**
   - Click **New** → Add: `C:\Users\YOUR_USERNAME\AppData\Local\Android\Sdk\platform-tools`
   - Click **OK** on all dialogs
   - **Restart terminal/PowerShell**
3. **Now you can use `adb` from anywhere!**

## After Port Forwarding

1. **Make sure backend is running:**
   ```bash
   cd backend
   npm start
   ```

2. **Rebuild app in Android Studio:**
   - Build → Rebuild Project
   - Click Run button

3. **Test login** - should work now!

## Important Notes

- **Port forwarding stays active** until you disconnect USB or restart phone
- **If you disconnect USB**, you'll need to run `adb reverse` again
- **Backend must be running** for the app to work

