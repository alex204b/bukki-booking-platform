import { api } from './api';
import { PushNotifications } from '@capacitor/push-notifications';
import { Capacitor } from '@capacitor/core';

export type DevicePlatform = 'web' | 'android' | 'ios';

export interface NotificationPreferences {
  bookingConfirmations: boolean;
  bookingReminders: boolean;
  bookingCancellations: boolean;
  bookingUpdates: boolean;
  messages: boolean;
  reviews: boolean;
}

class PushNotificationService {
  private isInitialized = false;
  private currentToken: string | null = null;
  private devicePlatform: DevicePlatform = 'web';

  /**
   * Initialize push notifications
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      // Check if we're on mobile (Capacitor)
      const isNative = Capacitor.isNativePlatform();
      
      if (isNative) {
        // Mobile app - use Capacitor Push Notifications
        await this.initializeNative();
      } else {
        // Web browser - use Web Push API
        await this.initializeWeb();
      }
    } catch (error: any) {
      // If initialization fails (e.g., Firebase not configured), that's okay
      // Push notifications are optional - don't crash the app
      console.warn('Push notifications initialization failed (optional feature):', error?.message || error);
      // Mark as initialized anyway to prevent retry loops
    }

    this.isInitialized = true;
  }

  /**
   * Initialize for native mobile apps (Android/iOS)
   */
  private async initializeNative(): Promise<void> {
    try {
      // Determine platform
      const platform = Capacitor.getPlatform();
      this.devicePlatform = platform === 'ios' ? 'ios' : 'android';

      // Request permission
      let permStatus = await PushNotifications.checkPermissions();
      
      if (permStatus.receive === 'prompt') {
        permStatus = await PushNotifications.requestPermissions();
      }

      if (permStatus.receive !== 'granted') {
        console.warn('Push notification permission denied');
        return;
      }

      // Register for push notifications
      // Wrap in try-catch to handle Firebase initialization errors gracefully
      try {
        await PushNotifications.register();
      } catch (registerError: any) {
        // If Firebase is not initialized, this will fail
        // That's okay - push notifications are optional
        if (registerError?.message?.includes('Firebase') || 
            registerError?.message?.includes('firebase') ||
            registerError?.message?.includes('not initialized')) {
          console.warn('Push notifications require Firebase setup. Skipping push notifications.');
          return;
        }
        throw registerError; // Re-throw if it's a different error
      }

      // Listen for registration (only if register succeeded)
      PushNotifications.addListener('registration', async (token) => {
        console.log('Push registration success, token:', token.value);
        this.currentToken = token.value;
        await this.registerToken(token.value);
      });

      // Listen for registration errors
      PushNotifications.addListener('registrationError', (error) => {
        console.warn('Push registration error (push notifications disabled):', error);
        // Don't throw - just log the error
      });

      // Listen for push notifications
      PushNotifications.addListener('pushNotificationReceived', (notification) => {
        console.log('Push notification received:', notification);
        // Notification is automatically displayed by the OS
      });

      // Listen for notification actions (when user taps notification)
      PushNotifications.addListener('pushNotificationActionPerformed', (notification) => {
        console.log('Push notification action performed:', notification);
        const data = notification.notification.data;
        
        if (data?.clickAction) {
          window.location.href = data.clickAction;
        } else if (data?.bookingId) {
          window.location.href = `/my-bookings?booking=${data.bookingId}`;
        }
      });
    } catch (error) {
      console.error('Failed to initialize native push notifications:', error);
    }
  }

  /**
   * Initialize for web browsers
   */
  private async initializeWeb(): Promise<void> {
    this.devicePlatform = 'web';

    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      console.warn('Push notifications are not supported in this browser');
      return;
    }

    try {
      // Request permission
      const permission = await Notification.requestPermission();
      
      if (permission !== 'granted') {
        console.warn('Push notification permission denied');
        return;
      }

      // Register service worker (we'll create this)
      const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
      console.log('Service Worker registered:', registration);

      // Get FCM token (we'll need Firebase SDK for this)
      // For now, we'll use a simpler approach with Web Push API
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: this.urlBase64ToUint8Array(
          process.env.REACT_APP_VAPID_PUBLIC_KEY || ''
        ),
      });

      // Convert subscription to token format
      const token = JSON.stringify(subscription);
      this.currentToken = token;
      await this.registerToken(token);
    } catch (error) {
      console.error('Failed to initialize web push notifications:', error);
    }
  }

  /**
   * Register device token with backend
   */
  private async registerToken(token: string): Promise<void> {
    try {
      const deviceId = this.getDeviceId();
      const deviceName = this.getDeviceName();

      await api.post('/notifications/push/register', {
        token,
        platform: this.devicePlatform,
        deviceId,
        deviceName,
      });

      console.log('Device token registered successfully');
    } catch (error) {
      console.error('Failed to register device token:', error);
    }
  }

  /**
   * Unregister device token
   */
  async unregister(): Promise<void> {
    if (!this.currentToken) {
      return;
    }

    try {
      await api.delete(`/notifications/push/unregister/${encodeURIComponent(this.currentToken)}`);
      this.currentToken = null;
    } catch (error) {
      console.error('Failed to unregister device token:', error);
    }
  }

  /**
   * Update notification preferences
   */
  async updatePreferences(
    token: string,
    preferences: Partial<NotificationPreferences>
  ): Promise<void> {
    try {
      await api.post('/notifications/push/preferences', {
        token,
        preferences,
      });
    } catch (error) {
      console.error('Failed to update notification preferences:', error);
    }
  }

  /**
   * Get all device tokens for current user
   */
  async getTokens(): Promise<any[]> {
    try {
      const response = await api.get('/notifications/push/tokens');
      return response.data.tokens || [];
    } catch (error) {
      console.error('Failed to get device tokens:', error);
      return [];
    }
  }

  /**
   * Send test notification
   */
  async sendTest(): Promise<void> {
    try {
      await api.post('/notifications/push/test');
    } catch (error) {
      console.error('Failed to send test notification:', error);
    }
  }

  /**
   * Get device ID (for tracking)
   */
  private getDeviceId(): string {
    try {
      if (typeof localStorage === 'undefined') {
        // Generate a temporary ID if localStorage is not available
        return `device_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      }
      
      let deviceId = localStorage.getItem('deviceId');
      if (!deviceId) {
        deviceId = `device_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        try {
          localStorage.setItem('deviceId', deviceId);
        } catch (error) {
          console.error('[PushNotificationService] Error saving deviceId:', error);
          // Continue with generated ID even if we can't save it
        }
      }
      return deviceId;
    } catch (error) {
      console.error('[PushNotificationService] Error getting deviceId:', error);
      // Return a temporary ID if anything fails
      return `device_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
  }

  /**
   * Get device name
   */
  private getDeviceName(): string {
    if (Capacitor.isNativePlatform()) {
      const platform = Capacitor.getPlatform();
      return `${platform.charAt(0).toUpperCase() + platform.slice(1)} Device`;
    }
    return `${navigator.userAgent.includes('Chrome') ? 'Chrome' : 'Browser'} on ${navigator.platform}`;
  }

  /**
   * Convert VAPID key from base64 URL to Uint8Array
   */
  private urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }

  /**
   * Check if push notifications are supported
   */
  isSupported(): boolean {
    if (Capacitor.isNativePlatform()) {
      return true; // Capacitor handles this
    }
    return 'serviceWorker' in navigator && 'PushManager' in window;
  }

  /**
   * Check if permission is granted
   */
  async hasPermission(): Promise<boolean> {
    if (Capacitor.isNativePlatform()) {
      const status = await PushNotifications.checkPermissions();
      return status.receive === 'granted';
    }
    return Notification.permission === 'granted';
  }
}

export const pushNotificationService = new PushNotificationService();

