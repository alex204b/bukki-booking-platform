# How to Set Logo as Android App Icon

## Method 1: Using Android Studio (Easiest - Recommended)

### Step 1: Open Android Studio
1. Open Android Studio
2. Open your project: `frontend/android` folder

### Step 2: Generate App Icons
1. In the **Project** view (left sidebar), navigate to:
   ```
   app → src → main → res
   ```

2. **Right-click** on the `res` folder

3. Select **New → Image Asset**

4. In the **Asset Studio** window:
   - **Icon Type**: Select "Launcher Icons (Adaptive and Legacy)"
   - Click the **Image** tab (not Clip Art)
   - Click the folder icon next to "Path"
   - Navigate to and select: `frontend/public/logo.png`
   - The logo should appear in the preview
   - **Foreground Layer**:
     - **Scaling**: Adjust if needed (usually 100% works)
     - **Shape**: None (to keep your rounded square)
   - **Background Layer**:
     - **Color**: Should be orange (#f97316) - already set
   - Click **Next**

5. Review the generated icons and click **Finish**

6. Android Studio will automatically:
   - Generate all required icon sizes
   - Replace existing icons in all mipmap folders
   - Update the adaptive icon configuration

### Step 3: Rebuild and Install
1. **Build → Rebuild Project** (wait for it to finish)

2. **Build → Build Bundle(s) / APK(s) → Build APK(s)**

3. Wait for build to complete

4. **Run the app**:
   - Click the green **Run** button (or press `Shift + F10`)
   - Select your connected phone
   - The app will install with the new icon!

## Method 2: Manual (If Android Studio doesn't work)

### Step 1: Generate Icons Online
1. Go to: https://www.appicon.co/ or https://icon.kitchen/
2. Upload your `frontend/public/logo.png`
3. Download the generated Android icon set

### Step 2: Replace Icons Manually
Copy the generated icons to these folders:
- `frontend/android/app/src/main/res/mipmap-mdpi/ic_launcher.png` (48x48)
- `frontend/android/app/src/main/res/mipmap-hdpi/ic_launcher.png` (72x72)
- `frontend/android/app/src/main/res/mipmap-xhdpi/ic_launcher.png` (96x96)
- `frontend/android/app/src/main/res/mipmap-xxhdpi/ic_launcher.png` (144x144)
- `frontend/android/app/src/main/res/mipmap-xxxhdpi/ic_launcher.png` (192x192)

Also replace `ic_launcher_round.png` in the same folders if you want round icons.

### Step 3: Rebuild
- Build → Rebuild Project
- Build → Build APK(s)
- Install on device

## Verify Logo in App

After installing, you should see:
1. **App Icon** on your phone's home screen - your logo!
2. **Logo in the app**:
   - Login page (top center)
   - Register page (top center)
   - Sidebar (top left)
   - Footer (on home page)

## Troubleshooting

- **Icon not updating?** Uninstall the old app first, then reinstall
- **Logo not showing in app?** Make sure `logo.png` is in `frontend/public/`
- **Build errors?** Clean project: Build → Clean Project, then rebuild

