import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.bukki.app',
  appName: 'BUKKi',
  webDir: 'build',
  server: {
    // Uncomment for development testing with local server
    // url: 'http://YOUR_COMPUTER_IP:3000',
    // cleartext: true
  },
  android: {
    allowMixedContent: true, // Allow HTTP connections (for local testing)
  },
  ios: {
    // iOS specific configuration
    scheme: 'BUKKi',
    // Allow HTTP connections for local testing (remove in production)
    allowsLinkPreview: false,
  },
  plugins: {
    // Camera permission will be handled via Info.plist
    Camera: {
      permissions: {
        camera: 'This app needs camera access to scan QR codes for booking check-in.',
      },
    },
  },
};

export default config;

