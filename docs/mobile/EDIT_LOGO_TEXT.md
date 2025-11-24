# How to Make Logo Text White

## Quick Fix: Edit the Logo File

The best solution is to edit your `logo.png` file to have white text instead of transparent text.

### Option 1: Using Photopea (Free Online Editor)

1. Go to: https://www.photopea.com/
2. **File → Open** → Select `frontend/public/logo.png`
3. Use the **Magic Wand Tool** (W key) to select the text area ("BUKKI")
4. If needed, use **Select → Similar** to select all text
5. **Edit → Fill** → Choose **White** → Click OK
6. **File → Export As → PNG**
7. Save and replace `frontend/public/logo.png`

### Option 2: Using Paint.NET (Windows - Free)

1. Download Paint.NET: https://www.getpaint.net/
2. Open `frontend/public/logo.png`
3. Use **Magic Wand** tool to select the text
4. **Edit → Fill Selection** → Choose white
5. **File → Save**

### Option 3: Using GIMP (Free)

1. Download GIMP: https://www.gimp.org/
2. Open `logo.png`
3. Use **Fuzzy Select Tool** to select text
4. **Edit → Fill with FG Color** (set foreground to white first)
5. **File → Export As → PNG**

## What I've Done

I've updated the Logo component to add an orange background behind the logo image. This will make the text appear white when it's transparent, but the **best solution is still to edit the image file itself** to have actual white text.

## For Android Studio

When generating the Android icon:
- The orange background (#f97316) is already set
- If your logo text is transparent, it will show the orange background through it
- For best results, edit the logo to have white text before generating icons

