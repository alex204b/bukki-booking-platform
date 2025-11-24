# Push Notifications Setup Guide

## Overview

BUKKi now supports push notifications for both web and mobile apps! Users will receive notifications for:
- Booking confirmations
- Booking reminders
- Booking cancellations
- Booking updates (reschedules, etc.)
- New booking requests (for business owners)

## Backend Setup

### 1. Firebase Configuration

You need to set up Firebase Cloud Messaging (FCM) to enable push notifications.

#### Steps:

1. **Create a Firebase Project**
   - Go to https://console.firebase.google.com/
   - Click "Add project"
   - Follow the setup wizard

2. **Get Service Account Key**
   - In Firebase Console, go to Project Settings → Service Accounts
   - Click "Generate new private key"
   - Download the JSON file

3. **Add to Backend Environment**
   - Copy the JSON content
   - Add to `backend/.env`:
   ```env
   FIREBASE_SERVICE_ACCOUNT='{"type":"service_account","project_id":"...","private_key_id":"...","private_key":"...","client_email":"...","client_id":"...","auth_uri":"...","token_uri":"...","auth_provider_x509_cert_url":"...","client_x509_cert_url":"..."}'
   ```
   
   **OR** save the JSON file and reference it:
   ```env
   FIREBASE_SERVICE_ACCOUNT_PATH=./path/to/service-account-key.json
   ```

### 2. Database Migration

The `device_tokens` table will be created automatically when you start the backend (if `synchronize: true` in development).

For production, create a migration:
```sql
CREATE TABLE device_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token VARCHAR(500) NOT NULL,
  platform VARCHAR(20) NOT NULL,
  deviceId VARCHAR(255),
  deviceName VARCHAR(255),
  isActive BOOLEAN DEFAULT true,
  notificationPreferences JSONB,
  userId UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  createdAt TIMESTAMP DEFAULT NOW(),
  updatedAt TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_device_tokens_userId ON device_tokens(userId);
CREATE INDEX idx_device_tokens_token ON device_tokens(token);
```

## Frontend Setup

### 1. Web Push (Browser)

For web browsers, you need a VAPID key pair:

1. **Generate VAPID Keys**
   - Use https://web-push-codelab.glitch.me/ or:
   ```bash
   npm install -g web-push
   web-push generate-vapid-keys
   ```

2. **Add to Frontend Environment**
   - Create `frontend/.env`:
   ```env
   REACT_APP_VAPID_PUBLIC_KEY=your_vapid_public_key_here
   ```

3. **Create Service Worker** (for web push)
   - Create `frontend/public/firebase-messaging-sw.js`:
   ```javascript
   // This will be created automatically by Firebase SDK
   // For now, a basic service worker is sufficient
   self.addEventListener('push', function(event) {
     const data = event.data.json();
     const options = {
       body: data.body,
       icon: '/logo.png',
       badge: '/logo.png',
       data: data.data,
     };
     event.waitUntil(
       self.registration.showNotification(data.title, options)
     );
   });

   self.addEventListener('notificationclick', function(event) {
     event.notification.close();
     const url = event.notification.data?.clickAction || '/';
     event.waitUntil(
       clients.openWindow(url)
     );
   });
   ```

### 2. Mobile App (Capacitor)

For Android/iOS apps:

1. **Android Setup**
   - Firebase is already configured in `android/app/google-services.json` (if you added it)
   - If not, download `google-services.json` from Firebase Console
   - Place it in `frontend/android/app/`

2. **iOS Setup**
   - Download `GoogleService-Info.plist` from Firebase Console
   - Add it to your iOS project in Xcode

3. **Sync Capacitor**
   ```bash
   cd frontend
   npm run cap:sync
   ```

## Testing

### 1. Test from Backend API

```bash
# Register a token first (from frontend)
# Then test:
curl -X POST http://localhost:3000/notifications/push/test \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 2. Test from Frontend

1. Log in to the app
2. Push notifications will be initialized automatically
3. Go to Profile → Notification Settings
4. Click "Send Test Notification"

## Notification Types

The system sends notifications for:

1. **Booking Created** (to business owner)
   - When a customer creates a booking
   - Type: `booking_created`

2. **Booking Confirmed** (to customer)
   - When business accepts a booking
   - Type: `booking_confirmed`

3. **Booking Cancelled** (to customer)
   - When booking is cancelled
   - Type: `booking_cancelled`

4. **Booking Rescheduled** (to both)
   - When booking is rescheduled
   - Type: `booking_rescheduled`

5. **Booking Reminders** (to customer)
   - 24 hours before appointment
   - 2 hours before appointment
   - Type: `booking_reminder`

## User Preferences

Users can control notification preferences:
- Booking Confirmations
- Booking Reminders
- Booking Cancellations
- Booking Updates
- Messages
- Reviews

These are stored per device token in the database.

## Troubleshooting

### Notifications not working?

1. **Check Firebase Configuration**
   - Verify `FIREBASE_SERVICE_ACCOUNT` is set correctly
   - Check Firebase Console for errors

2. **Check Permissions**
   - Browser: Check notification permissions in browser settings
   - Mobile: Check app permissions in device settings

3. **Check Device Tokens**
   - Verify tokens are registered: `GET /notifications/push/tokens`
   - Check if tokens are active

4. **Check Logs**
   - Backend logs will show notification sending status
   - Frontend console will show registration errors

### Common Issues

- **"Firebase not initialized"**: Check `FIREBASE_SERVICE_ACCOUNT` in backend `.env`
- **"Permission denied"**: User needs to grant notification permission
- **"Token not registered"**: Frontend may not have initialized properly
- **"Invalid token"**: Token may have expired, will be auto-removed

## Production Checklist

- [ ] Firebase project created
- [ ] Service account key added to backend `.env`
- [ ] VAPID keys generated and added to frontend `.env` (for web)
- [ ] `google-services.json` added to Android project
- [ ] `GoogleService-Info.plist` added to iOS project
- [ ] Service worker deployed (for web)
- [ ] Test notifications working
- [ ] Notification preferences UI implemented
- [ ] Error handling in place

## Next Steps

1. Set up Firebase project
2. Add environment variables
3. Test notifications
4. Add notification settings UI (see `frontend/src/pages/Profile.tsx` for example)
5. Implement booking reminders (scheduled jobs)

