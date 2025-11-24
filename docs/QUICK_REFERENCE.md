# Quick Reference Guide

Quick links to the most commonly needed documentation.

## 🚀 Getting Started

- **First Time Setup**: [Setup Guide](./setup/SETUP.md)
- **Create Admin User**: [Admin Setup](./setup/ADMIN_SETUP_GUIDE.md)
- **Database Setup**: [Database Access](./setup/DATABASE_ACCESS_GUIDE.md)

## 📱 Mobile App

- **Build Android APK**: [Build APK Quick Start](./mobile/BUILD_APK_QUICK_START.md)
- **Android Studio Setup**: [Android Studio Guide](./mobile/ANDROID_STUDIO_GUIDE.md)
- **Network Configuration**: [Android Network Setup](./mobile/ANDROID_APP_NETWORK_SETUP.md)
- **USB Debugging**: [ADB Port Forwarding](./mobile/SETUP_ADB_PORT_FORWARDING.md)

## 🔧 Troubleshooting

- **App Crashes**: [Fix App Crash](./troubleshooting/FIX_APP_CRASH.md)
- **Network Errors**: [Fix Connection Error](./troubleshooting/FIX_CONNECTION_ERROR.md)
- **Login Issues**: [Debug Login Issue](./troubleshooting/DEBUG_LOGIN_ISSUE.md)
- **Check Logcat**: [Check Logcat Errors](./troubleshooting/CHECK_LOGCAT_ERRORS.md)
- **Update IP Address**: [Update IP Address](./troubleshooting/UPDATE_IP_ADDRESS.md)

## 🚢 Deployment

- **Deploy to Production**: [Deployment Instructions](./deployment/deploy-instructions.md)
- **Frontend Deployment**: [Frontend Deployment Guide](./deployment/FRONTEND_DEPLOYMENT_GUIDE.md)
- **Render.com Fix**: [Render Deployment Fix](./deployment/RENDER_DEPLOYMENT_FIX.md)

## 💻 Development

- **Project Documentation**: [Documentation](./development/DOCUMENTATION.md)
- **Feature List**: [Features Implementation](./development/FEATURES_IMPLEMENTATION_SUMMARY.md)
- **Launch Checklist**: [Launch Checklist](./development/LAUNCH_CHECKLIST.md)

## 🗄️ Database

- **Database Diagram**: [Database Diagram](./database/DATABASE_DIAGRAM.md)
- **Setup Script**: `setup-database.sql`
- **Sample Data**: `insert-sample-businesses.sql`

## 📞 Common Tasks

### Start Development
```bash
npm run dev
```

### Build for Production
```bash
npm run build
```

### Build Android App
```bash
cd frontend
npm run build
npx cap sync
# Then open in Android Studio
```

### Fix Network Issues (Android)
```bash
adb reverse tcp:3000 tcp:3000
```

### Update IP Address
Edit `frontend/.env`:
```env
REACT_APP_API_URL=http://YOUR_IP:3000
```

## 🔍 Finding Documentation

- **Setup**: `docs/setup/`
- **Mobile**: `docs/mobile/`
- **Troubleshooting**: `docs/troubleshooting/`
- **Deployment**: `docs/deployment/`
- **Database**: `docs/database/`
- **Development**: `docs/development/`

