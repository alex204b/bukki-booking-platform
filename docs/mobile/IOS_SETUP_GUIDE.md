# iOS Setup Guide for BUKKi App

This guide will help you set up and deploy the BUKKi app for iPhone/iPad.

## Prerequisites

1. **macOS Computer** - iOS development requires a Mac with macOS
2. **Xcode** - Download from Mac App Store (free, but large ~12GB)
3. **Apple Developer Account** (optional for local testing, required for App Store/TestFlight)
   - Free for local testing on your own device
   - $99/year for App Store distribution

## Step 1: Install iOS Platform

From the `frontend` directory, run:

```bash
npm install
npx cap add ios
```

This will:
- Install `@capacitor/ios` package
- Create the `ios` folder with Xcode project
- Set up iOS configuration

## Step 2: Configure iOS Permissions

The camera permission will be automatically added to `Info.plist` when you sync. However, you may need to verify it's there:

1. Open the iOS project: `npx cap open ios`
2. In Xcode, navigate to `App` → `Info.plist`
3. Verify `NSCameraUsageDescription` is present with description: "This app needs camera access to scan QR codes for booking check-in."

## Step 3: Build the Frontend

```bash
npm run build
npx cap sync
```

## Step 4: Open in Xcode

```bash
npx cap open ios
```

This will open the project in Xcode.

## Step 5: Configure Signing & Capabilities

In Xcode:

1. **Select the project** in the left sidebar (top item "App")
2. **Select the "App" target** (under TARGETS)
3. **Go to "Signing & Capabilities" tab**
4. **Select your Team**:
   - If you have an Apple Developer account, select your team
   - If not, select "Add an Account..." and sign in with your Apple ID (free for personal development)
5. **Xcode will automatically create a provisioning profile**

## Step 6: Connect Your iPhone

1. Connect your iPhone to your Mac via USB
2. Unlock your iPhone
3. Trust the computer if prompted
4. In Xcode, select your iPhone from the device dropdown (next to the play button)

## Step 7: Build and Run

1. Click the **Play button** (▶️) in Xcode, or press `Cmd + R`
2. Xcode will:
   - Build the app
   - Install it on your iPhone
   - Launch it automatically

**First time only**: On your iPhone, go to:
- Settings → General → VPN & Device Management
- Trust your developer certificate
- Return to the app

## Step 8: Camera Permissions

When you first use the QR scanner:
- iOS will automatically prompt for camera permission
- Tap "Allow" to enable camera access

## Building for Distribution

### For TestFlight (Beta Testing)

1. In Xcode: Product → Archive
2. Wait for archive to complete
3. Window → Organizer
4. Select your archive → "Distribute App"
5. Choose "App Store Connect"
6. Follow the wizard to upload to TestFlight

### For App Store

1. Follow TestFlight steps above
2. In App Store Connect, submit for review
3. Wait for Apple's review (usually 1-3 days)

## Troubleshooting

### "No devices found"
- Make sure iPhone is unlocked
- Trust the computer on your iPhone
- Check USB cable connection

### "Signing requires a development team"
- Add your Apple ID in Xcode → Preferences → Accounts
- Select your team in Signing & Capabilities

### "Camera permission not working"
- Check `Info.plist` has `NSCameraUsageDescription`
- Rebuild the app after adding permission
- Check iPhone Settings → BUKKi → Camera is enabled

### "Build failed"
- Make sure you're on macOS
- Update Xcode to latest version
- Clean build folder: Product → Clean Build Folder (Shift + Cmd + K)

## Development Workflow

After making changes to the React app:

1. Build the frontend: `npm run build`
2. Sync to iOS: `npx cap sync ios`
3. In Xcode, click Run (▶️) again

## Network Configuration (for local backend)

If testing with local backend:

1. Make sure iPhone and Mac are on same WiFi network
2. Find your Mac's IP: System Preferences → Network → WiFi → IP Address
3. Update `capacitor.config.ts`:
   ```typescript
   server: {
     url: 'http://YOUR_MAC_IP:3000',
     cleartext: true
   }
   ```
4. Rebuild and sync: `npm run build && npx cap sync ios`

## Camera Permissions in Info.plist

The camera permission should be automatically added, but if not, manually add to `ios/App/App/Info.plist`:

```xml
<key>NSCameraUsageDescription</key>
<string>This app needs camera access to scan QR codes for booking check-in.</string>
```

## Notes

- iOS development requires a Mac - you cannot build iOS apps on Windows
- Free Apple Developer account allows testing on your own devices
- Paid account ($99/year) needed for App Store distribution
- TestFlight allows beta testing with up to 10,000 external testers

