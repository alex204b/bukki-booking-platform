# Logo Placement Instructions

## Step 1: Place Your Logo File

**Save your logo image as:**
```
frontend/public/logo.png
```

**Requirements:**
- Format: PNG
- Size: 512x512 pixels (square, recommended)
- Background: Transparent (since you removed it)
- The logo should show: Orange rounded square with calendar icon, refresh arrow, and "BUKKI" text

## Step 2: Verify Logo is Accessible

After placing `logo.png` in `frontend/public/`, it will be automatically available at:
- Web: `http://localhost:3000/logo.png` (or your domain)
- In code: `/logo.png` (React will serve it from public folder)

## Step 3: Test the Logo

1. **Start your development server:**
   ```bash
   cd frontend
   npm start
   ```

2. **Check if logo appears:**
   - Go to: http://localhost:3000/logo.png
   - You should see your logo image

3. **Check in the app:**
   - Login page should show the logo at the top
   - Sidebar should show the logo
   - Footer should show the logo

## Step 4: Set Up Android App Icon

See `generate-android-icons.md` for detailed instructions on generating Android app icons from your logo.

**Quick method:**
1. Open Android Studio
2. Right-click `frontend/android/app/src/main/res/`
3. New → Image Asset
4. Select your `logo.png`
5. Android Studio generates all sizes automatically!

## Current Status

✅ Logo component created and integrated
✅ Logo added to Login page
✅ Logo added to Register page  
✅ Logo added to Sidebar (mobile & desktop)
✅ Logo added to Footer
⏳ Waiting for `logo.png` file in `frontend/public/`
⏳ Android icons need to be generated

Once you place the logo file, everything will work automatically!

