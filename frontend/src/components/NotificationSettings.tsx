import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { api } from '../services/api';
import { pushNotificationService, NotificationPreferences } from '../services/pushNotificationService';
import { Bell, BellOff, Smartphone, Globe, Trash2, Send } from 'lucide-react';
import toast from 'react-hot-toast';
import { useI18n } from '../contexts/I18nContext';

export const NotificationSettings: React.FC = () => {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const [preferences, setPreferences] = useState<Record<string, Partial<NotificationPreferences>>>({});

  // Get all device tokens
  const { data: tokensData, isLoading } = useQuery(
    'notification-tokens',
    async () => {
      const tokens = await pushNotificationService.getTokens();
      return tokens;
    },
    {
      onSuccess: (tokens) => {
        // Initialize preferences from tokens
        const prefs: Record<string, Partial<NotificationPreferences>> = {};
        tokens.forEach((token: any) => {
          prefs[token.token] = token.notificationPreferences || {
            bookingConfirmations: true,
            bookingReminders: true,
            bookingCancellations: true,
            bookingUpdates: true,
            messages: true,
            reviews: true,
          };
        });
        setPreferences(prefs);
      },
    }
  );

  const tokens = tokensData || [];

  // Update preferences mutation
  const updatePreferencesMutation = useMutation(
    async ({ token, prefs }: { token: string; prefs: Partial<NotificationPreferences> }) => {
      await pushNotificationService.updatePreferences(token, prefs);
    },
    {
      onSuccess: () => {
        toast.success(t('notificationPreferencesUpdated') || 'Notification preferences updated');
        queryClient.invalidateQueries('notification-tokens');
      },
      onError: () => {
        toast.error(t('failedToUpdatePreferences') || 'Failed to update preferences');
      },
    }
  );

  // Unregister token mutation
  const unregisterMutation = useMutation(
    async (token: string) => {
      await pushNotificationService.unregister();
    },
    {
      onSuccess: () => {
        toast.success(t('deviceUnregistered') || 'Device unregistered');
        queryClient.invalidateQueries('notification-tokens');
      },
      onError: () => {
        toast.error(t('failedToUnregister') || 'Failed to unregister device');
      },
    }
  );

  // Test notification mutation
  const testNotificationMutation = useMutation(
    async () => {
      await pushNotificationService.sendTest();
    },
    {
      onSuccess: () => {
        toast.success(t('testNotificationSent') || 'Test notification sent!');
      },
      onError: () => {
        toast.error(t('failedToSendTest') || 'Failed to send test notification');
      },
    }
  );

  const handlePreferenceChange = (
    token: string,
    key: keyof NotificationPreferences,
    value: boolean
  ) => {
    const newPrefs = {
      ...preferences[token],
      [key]: value,
    };
    setPreferences({
      ...preferences,
      [token]: newPrefs,
    });
    updatePreferencesMutation.mutate({ token, prefs: newPrefs });
  };

  const getPlatformIcon = (platform: string) => {
    switch (platform) {
      case 'android':
        return <Smartphone className="h-5 w-5 text-green-600" />;
      case 'ios':
        return <Smartphone className="h-5 w-5 text-blue-600" />;
      case 'web':
        return <Globe className="h-5 w-5 text-primary-600" />;
      default:
        return <Smartphone className="h-5 w-5 text-gray-600" />;
    }
  };

  const getPlatformName = (platform: string) => {
    switch (platform) {
      case 'android':
        return 'Android';
      case 'ios':
        return 'iOS';
      case 'web':
        return 'Web Browser';
      default:
        return platform;
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          {t('pushNotifications') || 'Push Notifications'}
        </h3>
        <p className="text-sm text-gray-600 mb-4">
          {t('managePushNotificationPreferences') || 'Manage your push notification preferences for each device'}
        </p>
      </div>

      {/* Test Notification Button */}
      <div className="bg-primary-50 border border-primary-200 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-medium text-gray-900">
              {t('testNotifications') || 'Test Notifications'}
            </h4>
            <p className="text-sm text-gray-600">
              {t('sendTestNotification') || 'Send a test notification to all your devices'}
            </p>
          </div>
          <button
            onClick={() => testNotificationMutation.mutate()}
            disabled={testNotificationMutation.isLoading || tokens.length === 0}
            className="btn btn-primary btn-sm flex items-center gap-2"
          >
            <Send className="h-4 w-4" />
            {t('sendTest') || 'Send Test'}
          </button>
        </div>
      </div>

      {/* Device Tokens List */}
      {tokens.length === 0 ? (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-center">
          <BellOff className="h-8 w-8 text-yellow-600 mx-auto mb-2" />
          <p className="text-sm text-gray-700">
            {t('noDevicesRegistered') || 'No devices registered for push notifications'}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            {t('notificationsWillRegisterOnLogin') || 'Devices will be registered automatically when you log in'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {tokens.map((token: any) => {
            const tokenPrefs = preferences[token.token] || {
              bookingConfirmations: true,
              bookingReminders: true,
              bookingCancellations: true,
              bookingUpdates: true,
              messages: true,
              reviews: true,
            };

            return (
              <div
                key={token.id}
                className="bg-white border border-gray-200 rounded-lg p-4 space-y-4"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {getPlatformIcon(token.platform)}
                    <div>
                      <h4 className="font-medium text-gray-900">
                        {token.deviceName || getPlatformName(token.platform)}
                      </h4>
                      <p className="text-xs text-gray-500">
                        {getPlatformName(token.platform)} • {token.isActive ? t('active') : t('inactive')}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => unregisterMutation.mutate(token.token)}
                    className="text-red-600 hover:text-red-700 p-2"
                    title={t('unregisterDevice') || 'Unregister device'}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                {/* Notification Preferences */}
                <div className="space-y-2 pt-2 border-t border-gray-100">
                  <p className="text-xs font-medium text-gray-700 mb-2">
                    {t('notificationTypes') || 'Notification Types'}
                  </p>
                  
                  {[
                    { key: 'bookingConfirmations' as const, label: t('bookingConfirmations') || 'Booking Confirmations' },
                    { key: 'bookingReminders' as const, label: t('bookingReminders') || 'Booking Reminders' },
                    { key: 'bookingCancellations' as const, label: t('bookingCancellations') || 'Booking Cancellations' },
                    { key: 'bookingUpdates' as const, label: t('bookingUpdates') || 'Booking Updates' },
                    { key: 'messages' as const, label: t('messages') || 'Messages' },
                    { key: 'reviews' as const, label: t('reviews') || 'Reviews' },
                  ].map(({ key, label }) => (
                    <label
                      key={key}
                      className="flex items-center justify-between p-2 hover:bg-gray-50 rounded cursor-pointer"
                    >
                      <span className="text-sm text-gray-700">{label}</span>
                      <input
                        type="checkbox"
                        checked={tokenPrefs[key] ?? true}
                        onChange={(e) =>
                          handlePreferenceChange(token.token, key, e.target.checked)
                        }
                        className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                      />
                    </label>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Support Info */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <h4 className="font-medium text-gray-900 mb-2">
          {t('aboutPushNotifications') || 'About Push Notifications'}
        </h4>
        <ul className="text-sm text-gray-600 space-y-1 list-disc list-inside">
          <li>{t('notificationsHelpYouStayUpdated') || 'Notifications help you stay updated about your bookings'}</li>
          <li>{t('youCanControlEachDevice') || 'You can control notifications for each device separately'}</li>
          <li>{t('notificationsWorkEvenWhenAppClosed') || 'Notifications work even when the app is closed'}</li>
        </ul>
      </div>
    </div>
  );
};

