# Generate Android App Icons from Logo

## Quick Method (Using Android Studio)

1. **Open Android Studio**
2. **Right-click** on `frontend/android/app/src/main/res/` folder
3. Select **New → Image Asset**
4. Choose **Launcher Icons (Adaptive and Legacy)**
5. Click the **Image** tab
6. Click the folder icon and select your `logo.png` file from `frontend/public/logo.png`
7. Adjust if needed (the logo should be centered)
8. Click **Next** → **Finish**
9. Android Studio will automatically generate all required icon sizes!

## Alternative: Manual Method

If you prefer to do it manually or use a script:

### Step 1: Ensure logo.png exists
Place your logo at: `frontend/public/logo.png`
- Size: 512x512 pixels recommended
- Format: PNG with transparent background

### Step 2: Use Online Tool
1. Go to: https://www.appicon.co/ or https://icon.kitchen/
2. Upload your `logo.png`
3. Download the generated Android icon set
4. Extract and copy the icons to the respective mipmap folders:
   - `mipmap-mdpi/ic_launcher.png` (48x48)
   - `mipmap-hdpi/ic_launcher.png` (72x72)
   - `mipmap-xhdpi/ic_launcher.png` (96x96)
   - `mipmap-xxhdpi/ic_launcher.png` (144x144)
   - `mipmap-xxxhdpi/ic_launcher.png` (192x192)

### Step 3: Update Adaptive Icons
The adaptive icon uses:
- **Foreground**: Your logo (transparent background)
- **Background**: Orange color (#f97316)

The foreground images should be placed in:
- `mipmap-mdpi/ic_launcher_foreground.png` (108x108)
- `mipmap-hdpi/ic_launcher_foreground.png` (162x162)
- `mipmap-xhdpi/ic_launcher_foreground.png` (216x216)
- `mipmap-xxhdpi/ic_launcher_foreground.png` (432x432)
- `mipmap-xxxhdpi/ic_launcher_foreground.png` (648x648)

## After Generating Icons

1. **Rebuild the app** in Android Studio:
   - Build → Rebuild Project
   - Build → Build Bundle(s) / APK(s) → Build APK(s)

2. **Install on your device** to see the new icon

