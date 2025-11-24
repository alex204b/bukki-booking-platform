# Fix Logo Text Color - Make Letters White

## The Problem
The logo has transparent text that shows the background through it. You want the text to be white.

## Solution Options

### Option 1: Edit the Logo File (Best Solution)
Edit your `logo.png` file in an image editor (Photoshop, GIMP, Paint.NET, etc.):
1. Open `frontend/public/logo.png`
2. Select the text area ("BUKKI")
3. Fill it with white color
4. Save the file
5. The logo will now have white text everywhere

### Option 2: Use CSS Filter (Quick Fix for Web)
I've updated the Logo component to try to make the text white using CSS filters. However, this might not work perfectly for all cases.

### Option 3: Create Two Logo Versions
1. **For web/app**: Keep current logo (works with orange background)
2. **For Android icon**: Create a version with white text

## For Android Studio Image Asset

When generating the Android icon in Android Studio:

1. **In the Image Asset Studio:**
   - Select your logo
   - **Foreground Layer**:
     - The logo should show your orange square with calendar icon
     - If the text is transparent, you might need to edit the logo first
   - **Background Layer**:
     - Set to solid color: `#f97316` (orange)
     - This will show through transparent areas

2. **If text is still showing as transparent:**
   - Edit `logo.png` to have white text before generating icons
   - Or use a logo editor to add a white text layer

## Quick Fix: Edit Logo in Online Editor

1. Go to: https://www.photopea.com/ (free online Photoshop)
2. Upload `frontend/public/logo.png`
3. Use the Magic Wand tool to select the text area
4. Fill with white color
5. Export as PNG
6. Replace `frontend/public/logo.png`

The CSS filter approach I added should help, but editing the actual image file is the most reliable solution.

