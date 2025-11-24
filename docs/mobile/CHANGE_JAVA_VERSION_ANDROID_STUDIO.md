# How to Change Java Version in Android Studio

The error "invalid source release: 21" means Android Studio is trying to use Java 21, but we need Java 17.

## Method 1: Change JDK in Project Settings (Recommended)

1. **In Android Studio:**
   - Go to **File → Project Structure** (or press `Ctrl+Alt+Shift+S`)
   
2. **SDK Location tab:**
   - Click on **"SDK Location"** tab (left side)
   - Look for **"JDK location"** field
   - Click the folder icon or **"..."** button
   
3. **Select Java 17:**
   - Navigate to your Java 17 installation
   - Common locations:
     - `C:\Program Files\Java\jdk-17`
     - `C:\Program Files\Eclipse Adoptium\jdk-17`
     - `C:\Users\YourName\AppData\Local\Programs\Eclipse Adoptium\jdk-17`
   - If you don't have Java 17, see "Install Java 17" below
   
4. **Click OK** and sync Gradle

## Method 2: Change JDK in Settings

1. **File → Settings** (or `Ctrl+Alt+S`)
2. **Build, Execution, Deployment → Build Tools → Gradle**
3. Look for **"Gradle JDK"** dropdown
4. Select **Java 17** (or "jbr-17" if available)
5. If Java 17 isn't listed, click **"Download JDK"** and select version 17
6. Click **OK**
7. **Sync Gradle** (click "Sync Now" or File → Sync Project with Gradle Files)

## Method 3: Install Java 17 (If You Don't Have It)

1. **Download Java 17:**
   - Go to: https://adoptium.net/
   - Select **Java 17 (LTS)**
   - Choose your OS (Windows)
   - Download the installer

2. **Install Java 17:**
   - Run the installer
   - Install to default location (usually `C:\Program Files\Eclipse Adoptium\jdk-17`)

3. **Set in Android Studio:**
   - Follow Method 1 or Method 2 above
   - Point to the Java 17 installation folder

## Method 4: Use Android Studio's Bundled JDK

Android Studio comes with a bundled JDK (JBR - JetBrains Runtime):

1. **File → Project Structure → SDK Location**
2. For **JDK location**, try selecting:
   - `jbr-17` (if available in dropdown)
   - Or browse to: `C:\Users\YourName\AppData\Local\Android\Sdk\jbr` (if it exists)

## Verify Java Version

After changing, verify it worked:

1. **File → Project Structure → SDK Location**
2. Check the JDK location path
3. It should NOT point to Java 21

## Then Sync Gradle

After changing the JDK:

1. **File → Sync Project with Gradle Files**
2. Wait for sync to complete
3. Check Build Output for errors
4. If still errors, try: **File → Invalidate Caches → Invalidate and Restart**

## Quick Check: What Java Versions Do You Have?

Open Command Prompt and run:
```bash
where java
```

Or check common locations:
- `C:\Program Files\Java\`
- `C:\Program Files\Eclipse Adoptium\`
- `C:\Program Files\Microsoft\`

Look for folders like `jdk-17`, `jdk-11`, `jdk-19` (avoid `jdk-21`)

## After Fixing

Once Java 17 is set:
- The build should work
- You can build APK: **Build → Build Bundle(s) / APK(s) → Build APK(s)**

