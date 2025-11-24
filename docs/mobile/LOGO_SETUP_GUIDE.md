# Logo Setup Guide for BUKKi App

## Step 1: Add Your Logo File

1. **Save your logo image** as `logo.png` in the `frontend/public/` folder
   - Recommended size: 512x512 pixels (square)
   - Format: PNG with transparent background (or white background if your logo has orange background)
   - The logo should match the design: orange rounded square with calendar icon and "BUKKI" text

2. **File location:**
   ```
   frontend/public/logo.png
   ```

## Step 2: Update Android App Icon

To use your logo as the Android app icon:

1. **Create icon sizes:**
   - You'll need multiple sizes for Android:
     - `ic_launcher.png` - 192x192 (mdpi)
     - `ic_launcher.png` - 256x256 (hdpi)
     - `ic_launcher.png` - 384x384 (xhdpi)
     - `ic_launcher.png` - 512x512 (xxhdpi)
     - `ic_launcher.png` - 768x768 (xxxhdpi)

2. **Replace Android launcher icons:**
   - Go to: `frontend/android/app/src/main/res/`
   - Replace the `ic_launcher.png` files in each mipmap folder:
     - `mipmap-mdpi/ic_launcher.png` (48x48)
     - `mipmap-hdpi/ic_launcher.png` (72x72)
     - `mipmap-xhdpi/ic_launcher.png` (96x96)
     - `mipmap-xxhdpi/ic_launcher.png` (144x144)
     - `mipmap-xxxhdpi/ic_launcher.png` (192x192)
   - Also replace `ic_launcher_round.png` in the same folders if you want a round icon

3. **Quick way (using Android Studio):**
   - Right-click on `frontend/android/app/src/main/res/`
   - Select **New → Image Asset**
   - Choose **Launcher Icons (Adaptive and Legacy)**
   - Select your `logo.png` file
   - Android Studio will generate all the required sizes automatically

## Step 3: Update Favicon (Browser Tab Icon)

1. **Replace favicon files:**
   - `frontend/public/favicon.svg` - SVG version (optional, but recommended)
   - `frontend/public/favicon.ico` - ICO version (16x16, 32x32, 48x48)

2. **You can use online tools to convert:**
   - PNG to ICO: https://convertio.co/png-ico/
   - PNG to SVG: Keep as PNG or convert if you have SVG version

## Step 4: Rebuild the App

After adding your logo:

1. **For web:**
   ```bash
   cd frontend
   npm run build
   ```

2. **For Android:**
   - In Android Studio: **Build → Rebuild Project**
   - Then: **Build → Build Bundle(s) / APK(s) → Build APK(s)**
   - Install the new APK on your device

## Where the Logo Appears

The logo will now appear in:
- ✅ Login page (centered, large)
- ✅ Register page (centered, large)
- ✅ Sidebar (mobile and desktop, small)
- ✅ All pages using the Layout component

## Logo Component Usage

The `Logo` component is available throughout the app:

```tsx
import { Logo } from '../components/Logo';

// Small logo (for sidebars)
<Logo size="sm" />

// Medium logo (default)
<Logo size="md" />

// Large logo (for login/register pages)
<Logo size="lg" />

// Extra large logo
<Logo size="xl" />

// Logo without text
<Logo showText={false} />
```

## Troubleshooting

If the logo doesn't appear:
1. Make sure `logo.png` is in `frontend/public/` folder
2. Check the browser console for 404 errors
3. Clear browser cache and rebuild
4. For Android: Make sure you rebuilt the app after adding the logo

