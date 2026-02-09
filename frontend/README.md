# Frontend - Bukki Booking Platform

React + TypeScript web and mobile application for the Bukki booking platform.

---

## 📁 Project Structure

```
frontend/
├── src/                      # Source code
│   ├── components/          # Reusable UI components
│   ├── pages/               # Page components (routes)
│   ├── contexts/            # React Context providers
│   ├── hooks/               # Custom React hooks
│   ├── services/            # API services & utilities
│   ├── constants/           # Constants & configuration
│   ├── utils/               # Utility functions
│   ├── config/              # App configuration
│   ├── App.tsx              # Main app component
│   └── index.tsx            # Application entry point
│
├── public/                   # Static assets
│   ├── index.html           # HTML template
│   ├── icons/               # App icons
│   └── images/              # Static images
│
├── android/                  # Android (Capacitor)
│   └── app/                 # Android app source
│
├── build/                    # Production build output
├── resources/                # App resources (icons, splash)
│
├── Dockerfile                # Docker configuration
├── nginx.conf                # Nginx configuration for production
├── capacitor.config.ts       # Capacitor (mobile) configuration
├── package.json              # Dependencies & scripts
├── tailwind.config.js        # Tailwind CSS configuration
├── tsconfig.json             # TypeScript configuration
└── README.md                 # This file
```

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- npm or yarn

### Installation

```bash
# Install dependencies
cd frontend
npm install

# Setup environment variables
echo "REACT_APP_API_URL=http://localhost:3000" > .env
```

### Development

```bash
# Start development server
npm start

# Runs on http://localhost:3001
# Opens automatically in browser
```

### Build for Production

```bash
# Create production build
npm run build

# Build output in /build directory
```

### Mobile Development

```bash
# Sync web assets to mobile
npm run build
npx cap sync

# Run on Android
npx cap run android

# Open in Android Studio
npx cap open android
```

---

## 🎨 Key Features

### Core Features
- ✅ User authentication (email/password, Google, Facebook)
- ✅ Business discovery & search
- ✅ Real-time booking system
- ✅ QR code check-in
- ✅ Payment processing (Stripe)
- ✅ Reviews & ratings
- ✅ Push notifications
- ✅ Real-time chat
- ✅ Multi-language support (i18n)
- ✅ Dark mode ready

### User Features
- Browse and filter businesses
- Book services with time slots
- Manage bookings (view, cancel, reschedule)
- Chat with business owners
- Leave reviews and ratings
- Manage favorites
- View offers and promotions
- QR code check-in at business

### Business Owner Features
- Business dashboard with analytics
- Manage services and pricing
- Resource management (staff, rooms)
- Booking management
- Customer communication
- Revenue tracking
- Business settings
- Team collaboration

---

## 🛠️ Technology Stack

### Core
- **Framework**: React 18
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Routing**: React Router v6
- **State Management**: React Context API

### Mobile
- **Mobile Framework**: Capacitor
- **Platforms**: Android, iOS
- **Native Features**: Camera (QR), Notifications, Storage

### UI/UX
- **UI Components**: Custom components
- **Icons**: Lucide React
- **Toast Notifications**: React Hot Toast
- **Date Handling**: date-fns
- **Maps**: Leaflet + OpenStreetMap

### Integrations
- **Authentication**: Firebase Auth
- **Payments**: Stripe
- **Real-time**: Socket.IO
- **QR Codes**: html5-qrcode
- **API Client**: Axios

---

## 📂 Source Code Structure

### `/src/components`
Reusable UI components:
- `Layout.tsx` - Main app layout
- `NotificationCenter.tsx` - Push notifications UI
- `QRCodeScanner.tsx` - QR code scanner
- `AIAssistant.tsx` - AI chat interface
- `BookingDetailsModal.tsx` - Booking details
- `CreateBookingModal.tsx` - Create booking form
- `EnhancedCalendarView.tsx` - Calendar UI
- `MapView.tsx` - Interactive map
- And many more...

### `/src/pages`
Page components (routes):
- `Home.tsx` - Landing page
- `Login.tsx` / `Register.tsx` - Authentication
- `BusinessList.tsx` - Business discovery
- `BusinessDetails.tsx` - Business profile
- `BookingForm.tsx` - Booking creation
- `MyBookings.tsx` - User bookings
- `BusinessDashboard.tsx` - Business owner dashboard
- `Profile.tsx` - User profile
- `Chat.tsx` - Messaging
- And more...

### `/src/contexts`
React Context providers:
- `AuthContext.tsx` - Authentication state
- `I18nContext.tsx` - Internationalization
- `SocketContext.tsx` - WebSocket connection
- `CurrencyContext.tsx` - Currency formatting

### `/src/services`
API and utility services:
- `api.ts` - Main API client & endpoints
- Authentication services
- Booking services
- Business services
- Message services
- Payment services

### `/src/hooks`
Custom React hooks:
- `useLoginProtection.ts` - Login security
- `useAuth.ts` - Authentication helpers
- And more...

---

## 🌐 Environment Variables

Create `.env` file in frontend root:

```env
# Backend API URL
REACT_APP_API_URL=http://localhost:3000

# Optional: Firebase configuration (if not using env variables)
# REACT_APP_FIREBASE_API_KEY=...
# REACT_APP_FIREBASE_AUTH_DOMAIN=...
# ... etc
```

**For mobile development**, update IP address:
```bash
# Run from root directory
scripts\network\setup-ip.bat   # Windows
# OR
./scripts/network/setup-ip.js  # Unix/Mac
```

This automatically updates `REACT_APP_API_URL` with your local IP.

---

## 🧪 Testing

```bash
# Run tests (if configured)
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

---

## 📱 Mobile App (Capacitor)

### Initial Setup

```bash
# Install Capacitor CLI (if not already)
npm install -g @capacitor/cli

# Add Android platform
npx cap add android

# Add iOS platform (Mac only)
npx cap add ios
```

### Build & Sync

```bash
# 1. Build web assets
npm run build

# 2. Sync to native projects
npx cap sync

# 3. Open in IDE
npx cap open android   # Android Studio
npx cap open ios       # Xcode (Mac only)
```

### Run on Device

```bash
# Build and run on Android
npx cap run android

# Build and run on iOS (Mac only)
npx cap run ios
```

### Update App Icon & Splash Screen

```bash
# Place your icon in resources/icon.png (1024x1024)
# Place your splash in resources/splash.png (2732x2732)

# Generate icons and splash screens
npm install -g @capacitor/assets
npx capacitor-assets generate
```

---

## 🐳 Docker

### Build Docker Image

```bash
docker build -t bukki-frontend .
```

### Run Docker Container

```bash
docker run -p 80:80 \
  -e REACT_APP_API_URL=https://your-backend.onrender.com \
  bukki-frontend
```

**Note**: `REACT_APP_API_URL` must be set at **build time**, not runtime.

---

## 🚢 Deployment

### Render.com (Recommended)

See: [docs/deployment/DEPLOY_NOW.md](../docs/deployment/DEPLOY_NOW.md)

1. **Connect GitHub repo**
2. **Configure**:
   - Name: `bukki-frontend`
   - Root Directory: `frontend`
   - Build Command: Docker
   - Environment: `REACT_APP_API_URL=https://your-backend-url.onrender.com`
3. **Deploy**: Wait 5-10 minutes

### Manual Deployment (Nginx)

```bash
# 1. Build
npm run build

# 2. Copy build/ to server
scp -r build/ user@server:/var/www/bukki/

# 3. Configure Nginx
# Use nginx.conf as reference

# 4. Restart Nginx
sudo systemctl restart nginx
```

---

## 🎨 Styling & Theming

### Tailwind CSS

This project uses Tailwind CSS for styling. Configuration in `tailwind.config.js`.

**Custom colors**:
- Primary: Red (`#EF4444`)
- Background: Dark gray (`#1F2937`)
- Cards: Lighter gray (`#374151`)

### Responsive Design

- Mobile-first approach
- Breakpoints: `sm:`, `md:`, `lg:`, `xl:`, `2xl:`
- Touch-optimized UI for mobile

See: [docs/RESPONSIVE_DESIGN_GUIDE.md](../docs/RESPONSIVE_DESIGN_GUIDE.md)

---

## 🌍 Internationalization (i18n)

Multi-language support via `I18nContext`:

**Supported languages**:
- English (en)
- Hebrew (he)
- Russian (ru)

**Usage**:
```typescript
import { useI18n } from './contexts/I18nContext';

const { t, language, setLanguage } = useI18n();

// In JSX
<h1>{t('welcome')}</h1>

// Change language
setLanguage('he');
```

---

## 📚 Documentation

- **Main Documentation**: [../docs/](../docs/)
- **Deployment Guide**: [../docs/deployment/DEPLOY_NOW.md](../docs/deployment/DEPLOY_NOW.md)
- **Backend API**: [../backend/README.md](../backend/README.md)
- **Mobile Setup**: [../docs/mobile/](../docs/mobile/)
- **Responsive Design**: [../docs/RESPONSIVE_DESIGN_GUIDE.md](../docs/RESPONSIVE_DESIGN_GUIDE.md)

---

## 🐛 Troubleshooting

### "Cannot connect to backend"
1. Check `REACT_APP_API_URL` in `.env`
2. Verify backend is running
3. Check CORS settings in backend

### "Module not found" errors
```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install
```

### Mobile app won't build
```bash
# Re-sync Capacitor
npm run build
npx cap sync

# Clean Android build
cd android
./gradlew clean
cd ..
```

### QR Scanner not working
- Requires HTTPS in production (or localhost)
- Check camera permissions
- Only works in Capacitor or modern browsers

---

## 🛠️ Development Scripts

```json
{
  "start": "react-scripts start",
  "build": "react-scripts build",
  "test": "react-scripts test",
  "eject": "react-scripts eject"
}
```

### Useful Commands

```bash
# Start dev server with custom port
PORT=3002 npm start

# Build with specific API URL
REACT_APP_API_URL=https://api.example.com npm run build

# Analyze bundle size
npm run build
npx source-map-explorer 'build/static/js/*.js'
```

---

## 🤝 Contributing

See [CONTRIBUTING.md](../CONTRIBUTING.md) for contribution guidelines.

---

## 📄 License

See [LICENSE](../LICENSE) for license information.

---

**Last Updated**: February 9, 2026
