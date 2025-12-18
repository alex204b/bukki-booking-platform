import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as admin from 'firebase-admin';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { DeviceToken, DevicePlatform } from './entities/device-token.entity';
import { User } from '../users/entities/user.entity';

export interface PushNotificationPayload {
  title: string;
  body: string;
  data?: Record<string, any>;
  imageUrl?: string;
  clickAction?: string; // URL or deep link
}

@Injectable()
export class PushNotificationService {
  private readonly logger = new Logger(PushNotificationService.name);
  private firebaseApp: admin.app.App | null = null;

  constructor(
    private configService: ConfigService,
    @InjectRepository(DeviceToken)
    private deviceTokenRepository: Repository<DeviceToken>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {
    this.initializeFirebase();
  }

  private initializeFirebase() {
    try {
      const serviceAccount = this.configService.get('FIREBASE_SERVICE_ACCOUNT');
      
      if (!serviceAccount) {
        this.logger.warn('FIREBASE_SERVICE_ACCOUNT not configured. Push notifications will be disabled.');
        return;
      }

      // Parse service account if it's a JSON string
      let serviceAccountObj;
      try {
        serviceAccountObj = typeof serviceAccount === 'string' 
          ? JSON.parse(serviceAccount) 
          : serviceAccount;
      } catch (e) {
        this.logger.error('Failed to parse FIREBASE_SERVICE_ACCOUNT JSON');
        return;
      }

      // Initialize Firebase Admin if not already initialized
      if (admin.apps.length === 0) {
        this.firebaseApp = admin.initializeApp({
          credential: admin.credential.cert(serviceAccountObj as admin.ServiceAccount),
        });
        this.logger.log('Firebase Admin initialized successfully');
      } else {
        this.firebaseApp = admin.app();
      }
    } catch (error) {
      this.logger.error('Failed to initialize Firebase Admin:', error);
    }
  }

  /**
   * Register a device token for push notifications
   */
  async registerToken(
    userId: string,
    token: string,
    platform: DevicePlatform,
    deviceId?: string,
    deviceName?: string,
  ): Promise<DeviceToken> {
    // Check if token already exists
    let deviceToken = await this.deviceTokenRepository.findOne({
      where: { token, userId },
    });

    if (deviceToken) {
      // Update existing token
      deviceToken.platform = platform;
      deviceToken.deviceId = deviceId || deviceToken.deviceId;
      deviceToken.deviceName = deviceName || deviceToken.deviceName;
      deviceToken.isActive = true;
      return await this.deviceTokenRepository.save(deviceToken);
    }

    // Create new token
    deviceToken = this.deviceTokenRepository.create({
      userId,
      token,
      platform,
      deviceId,
      deviceName,
      isActive: true,
      notificationPreferences: {
        bookingConfirmations: true,
        bookingReminders: true,
        bookingCancellations: true,
        bookingUpdates: true,
        messages: true,
        reviews: true,
        offers: true,
      },
    });

    return await this.deviceTokenRepository.save(deviceToken);
  }

  /**
   * Unregister a device token
   */
  async unregisterToken(token: string, userId: string): Promise<void> {
    await this.deviceTokenRepository.update(
      { token, userId },
      { isActive: false },
    );
  }

  /**
   * Send push notification to a single user
   */
  async sendToUser(
    userId: string,
    payload: PushNotificationPayload,
    notificationType?: keyof DeviceToken['notificationPreferences'],
  ): Promise<void> {
    if (!this.firebaseApp) {
      this.logger.warn('Firebase not initialized. Skipping push notification.');
      return;
    }

    // Get all active tokens for the user
    const tokens = await this.deviceTokenRepository.find({
      where: { userId, isActive: true },
    });

    if (tokens.length === 0) {
      this.logger.debug(`No active tokens found for user ${userId}`);
      return;
    }

    // Filter tokens based on notification preferences
    const tokensToNotify = tokens.filter((token) => {
      if (!notificationType) return true;
      const prefs = token.notificationPreferences || {};
      return prefs[notificationType] !== false;
    });

    if (tokensToNotify.length === 0) {
      this.logger.debug(`User ${userId} has disabled ${notificationType} notifications`);
      return;
    }

    const fcmTokens = tokensToNotify.map((t) => t.token);

    await this.sendToTokens(fcmTokens, payload);
  }

  /**
   * Send push notification to multiple users
   */
  async sendToUsers(
    userIds: string[],
    payload: PushNotificationPayload,
    notificationType?: keyof DeviceToken['notificationPreferences'],
  ): Promise<void> {
    if (!this.firebaseApp) {
      this.logger.warn('Firebase not initialized. Skipping push notification.');
      return;
    }

    if (userIds.length === 0) return;

    // Get all active tokens for the users
    const tokens = await this.deviceTokenRepository.find({
      where: {
        userId: In(userIds),
        isActive: true,
      },
    });

    if (tokens.length === 0) {
      this.logger.debug(`No active tokens found for users ${userIds.join(', ')}`);
      return;
    }

    // Filter tokens based on notification preferences
    const tokensToNotify = tokens.filter((token) => {
      if (!notificationType) return true;
      const prefs = token.notificationPreferences || {};
      return prefs[notificationType] !== false;
    });

    if (tokensToNotify.length === 0) {
      this.logger.debug(`Users have disabled ${notificationType} notifications`);
      return;
    }

    const fcmTokens = tokensToNotify.map((t) => t.token);

    await this.sendToTokens(fcmTokens, payload);
  }

  /**
   * Send push notification to specific FCM tokens
   */
  private async sendToTokens(
    tokens: string[],
    payload: PushNotificationPayload,
  ): Promise<void> {
    if (!this.firebaseApp || tokens.length === 0) return;

    const message: admin.messaging.MulticastMessage = {
      notification: {
        title: payload.title,
        body: payload.body,
        imageUrl: payload.imageUrl,
      },
      data: payload.data
        ? Object.fromEntries(
            Object.entries(payload.data).map(([key, value]) => [
              key,
              String(value),
            ]),
          )
        : undefined,
      android: {
        priority: 'high',
        notification: {
          channelId: 'bukki_notifications',
          sound: 'default',
          clickAction: payload.clickAction,
        },
      },
      apns: {
        payload: {
          aps: {
            sound: 'default',
            badge: 1,
          },
        },
      },
      webpush: {
        notification: {
          title: payload.title,
          body: payload.body,
          icon: '/logo.png',
          badge: '/logo.png',
          requireInteraction: false,
        },
        fcmOptions: {
          link: payload.clickAction || '/',
        },
      },
      tokens,
    };

    try {
      const response = await admin.messaging().sendEachForMulticast(message);
      
      this.logger.log(
        `Successfully sent ${response.successCount} notifications. ` +
        `Failed: ${response.failureCount}`,
      );

      // Remove invalid tokens
      if (response.failureCount > 0) {
        const invalidTokens: string[] = [];
        response.responses.forEach((resp, idx) => {
          if (!resp.success && resp.error) {
            const errorCode = resp.error.code;
            if (
              errorCode === 'messaging/invalid-registration-token' ||
              errorCode === 'messaging/registration-token-not-registered'
            ) {
              invalidTokens.push(tokens[idx]);
            }
          }
        });

        if (invalidTokens.length > 0) {
          await this.deviceTokenRepository.update(
            { token: In(invalidTokens) },
            { isActive: false },
          );
          this.logger.log(`Deactivated ${invalidTokens.length} invalid tokens`);
        }
      }
    } catch (error) {
      this.logger.error('Error sending push notifications:', error);
      throw error;
    }
  }

  /**
   * Update notification preferences for a device token
   */
  async updatePreferences(
    token: string,
    userId: string,
    preferences: Partial<DeviceToken['notificationPreferences']>,
  ): Promise<DeviceToken> {
    const deviceToken = await this.deviceTokenRepository.findOne({
      where: { token, userId },
    });

    if (!deviceToken) {
      throw new Error('Device token not found');
    }

    deviceToken.notificationPreferences = {
      ...deviceToken.notificationPreferences,
      ...preferences,
    };

    return await this.deviceTokenRepository.save(deviceToken);
  }

  /**
   * Get all device tokens for a user
   */
  async getUserTokens(userId: string): Promise<DeviceToken[]> {
    return await this.deviceTokenRepository.find({
      where: { userId, isActive: true },
      order: { createdAt: 'DESC' },
    });
  }
}

