# Troubleshooting USB Connection Issues in Android Studio

## Quick Fixes (Try These First)

### 1. **Check USB Connection Mode on Your Phone**
   - When you plug in your phone, a notification should appear
   - Tap it and select **"File Transfer"** or **"MTP"** (not "Charging only")
   - Some phones: Settings → Connected devices → USB → File Transfer

### 2. **Restart ADB (Android Debug Bridge)**
   - In Android Studio, go to: **Tools → SDK Manager**
   - Or open Terminal in Android Studio (bottom panel)
   - Run these commands:
     ```
     adb kill-server
     adb start-server
     adb devices
     ```
   - You should see your device listed

### 3. **Check USB Debugging is Enabled**
   - On your phone: **Settings → About Phone**
   - Tap **"Build Number"** 7 times (if not already a developer)
   - Go back: **Settings → Developer Options**
   - Make sure **"USB Debugging"** is ON
   - Also enable **"Install via USB"** if available

### 4. **Revoke and Re-authorize USB Debugging**
   - On your phone, when you plug in USB, you should see a popup:
     - **"Allow USB debugging?"**
   - Check **"Always allow from this computer"**
   - Tap **"Allow"**
   - If you don't see this, unplug and replug the USB cable

### 5. **Try a Different USB Cable**
   - Some cables are "charging only" and don't support data transfer
   - Use the original cable that came with your phone, or a known data cable

### 6. **Check Windows Device Manager**
   - Press `Win + X` → **Device Manager**
   - Look for your phone under:
     - **"Portable Devices"** or
     - **"Android Phone"** or
     - **"Other devices"** (with yellow warning)
   - If you see a yellow warning:
     - Right-click → **Update Driver**
     - Choose **"Browse my computer"** → **"Let me pick"**
     - Select **"Android Composite ADB Interface"**

### 7. **Install/Update USB Drivers**
   - **For Samsung**: Install Samsung USB Drivers
   - **For Google Pixel**: Install Google USB Driver
   - **For other brands**: Install manufacturer's USB drivers
   - Or use **Universal ADB Driver** (works for most phones)

### 8. **Check Android Studio Settings**
   - **File → Settings → Build, Execution, Deployment → Debugger**
   - Make sure **"Use libusb backend"** is checked (if available)

### 9. **Restart Everything**
   - Unplug USB cable
   - Close Android Studio
   - Restart your computer
   - Restart your phone
   - Open Android Studio
   - Plug in USB cable
   - Wait for phone to be recognized

### 10. **Check ADB Path**
   - In Android Studio: **File → Settings → Appearance & Behavior → System Settings → Android SDK**
   - Check **"SDK Location"** - note the path
   - ADB should be at: `[SDK Location]\platform-tools\adb.exe`
   - Make sure this path exists

## Advanced Troubleshooting

### Check if ADB Sees Your Device
1. Open **Command Prompt** or **PowerShell** (as Administrator)
2. Navigate to Android SDK platform-tools:
   ```
   cd C:\Users\37369\AppData\Local\Android\Sdk\platform-tools
   ```
   (Or wherever your Android SDK is installed)
3. Run: `adb devices`
4. If you see your device but it says "unauthorized":
   - Check your phone for the USB debugging authorization popup
   - Tap "Allow"

### Enable Wireless Debugging (Alternative)
If USB keeps failing, you can use WiFi:
1. On your phone: **Settings → Developer Options → Wireless debugging**
2. Enable it and note the IP address and port
3. In Android Studio terminal:
   ```
   adb connect [IP_ADDRESS]:[PORT]
   ```

### Check Windows USB Settings
- Some Windows versions have USB power management issues
- **Device Manager → Universal Serial Bus controllers**
- Right-click each **"USB Root Hub"** → **Properties → Power Management**
- Uncheck **"Allow the computer to turn off this device"**

## Common Error Messages

- **"Device offline"**: Restart ADB and re-authorize on phone
- **"Unauthorized"**: Check phone for authorization popup
- **"No devices found"**: Check USB mode, drivers, and cable
- **"ADB not found"**: Check Android SDK installation

## Still Not Working?

1. Try a different USB port (preferably USB 2.0, not USB 3.0)
2. Disable antivirus temporarily (sometimes blocks USB debugging)
3. Check if your phone manufacturer has specific USB debugging requirements
4. Try connecting to a different computer to isolate the issue

