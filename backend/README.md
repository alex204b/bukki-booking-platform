# Backend - Bukki Booking Platform API

NestJS backend API for the Bukki multi-business booking platform.

---

## 📁 Project Structure

```
backend/
├── src/                      # Source code
│   ├── auth/                # Authentication & authorization
│   ├── users/               # User management
│   ├── businesses/          # Business management
│   ├── bookings/            # Booking system
│   ├── services/            # Services offered by businesses
│   ├── resources/           # Resource management (staff, rooms, equipment)
│   ├── messages/            # Messaging system
│   ├── notifications/       # Push notifications
│   ├── payments/            # Payment processing (Stripe)
│   ├── reviews/             # Reviews & ratings
│   ├── analytics/           # Analytics & reporting
│   ├── ai/                  # AI features (Gemini/HuggingFace)
│   ├── chat/                # Real-time chat (WebSocket)
│   ├── database/            # Database migrations & scripts
│   ├── common/              # Shared utilities, filters, pipes
│   └── main.ts              # Application entry point
│
├── test/                     # E2E and integration tests
├── dist/                     # Compiled JavaScript (build output)
├── uploads/                  # File uploads (local storage)
│
├── Dockerfile                # Docker configuration
├── nest-cli.json            # NestJS CLI configuration
├── package.json             # Dependencies & scripts
├── tsconfig.json            # TypeScript configuration
└── README.md                # This file
```

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL 14+ (or Neon cloud database)
- Redis (optional, for caching)

### Installation

```bash
# Install dependencies
cd backend
npm install

# Setup environment variables
cp .env.team.example .env
# Edit .env with your database credentials
```

### Development

```bash
# Start in development mode (with watch)
npm run start:dev

# Start in debug mode
npm run start:debug

# Build for production
npm run build

# Start production build
npm run start:prod
```

### Testing

```bash
# Unit tests
npm run test

# E2E tests
npm run test:e2e

# Integration tests
npm run test:integration

# Test coverage
npm run test:cov
```

---

## 📊 Database

### Setup Database

```bash
# Apply migrations (if using migration scripts)
node scripts/database/setup/setup-neon-direct.js

# Create admin user
node scripts/database/admin/create-admin.js

# Test connection
node scripts/database/utils/test-db-connection.js
```

### Migrations

Database migrations are located in `src/database/migrations/`.

**Manual migration**:
```bash
# Run a specific migration
node src/database/scripts/apply-migration-019.ts

# Apply all migrations
npm run migration:all
```

---

## 🔐 Environment Variables

Required environment variables (see `.env.team.example` for full list):

### Database
```env
DATABASE_URL=postgresql://user:pass@host:5432/dbname
```

### Authentication
```env
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=7d
```

### Email (SMTP)
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
```

### Cloud Storage (Cloudflare R2)
```env
R2_ENDPOINT=https://your-account.r2.cloudflarestorage.com
R2_PUBLIC_URL=https://pub-xxxxx.r2.dev
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_REGION=auto
AWS_S3_BUCKET=your-bucket-name
```

### AI Features
```env
GEMINI_API_KEY=your-gemini-key
HUGGINGFACE_API_KEY=your-hf-key
AI_PROVIDER=huggingface
```

### Firebase (Push Notifications)
```env
FIREBASE_SERVICE_ACCOUNT={"type":"service_account",...}
```

### Optional
```env
REDIS_HOST=localhost
REDIS_PORT=6379
STRIPE_SECRET_KEY=sk_test_...
TWILIO_ACCOUNT_SID=AC...
TWILIO_AUTH_TOKEN=...
```

---

## 📡 API Documentation

### Swagger UI
Once the server is running, access the interactive API documentation at:

```
http://localhost:3000/api
```

### Health Check
```
GET /health
```

Returns server health status and uptime.

### Main Endpoints

| Endpoint | Description |
|----------|-------------|
| `/auth/*` | Authentication & registration |
| `/users/*` | User management |
| `/businesses/*` | Business CRUD operations |
| `/bookings/*` | Booking system |
| `/services/*` | Services offered |
| `/resources/*` | Staff, rooms, equipment |
| `/messages/*` | Messaging system |
| `/notifications/*` | Push notifications |
| `/payments/*` | Payment processing |
| `/reviews/*` | Reviews & ratings |
| `/analytics/*` | Business analytics |

---

## 🏗️ Architecture

### Technology Stack
- **Framework**: NestJS 10
- **Database**: PostgreSQL with TypeORM
- **Authentication**: JWT + Passport
- **Real-time**: Socket.IO (WebSockets)
- **File Storage**: Cloudflare R2 (S3-compatible)
- **Payments**: Stripe
- **AI**: Google Gemini, HuggingFace
- **Push Notifications**: Firebase Cloud Messaging
- **Email**: Nodemailer (SMTP)
- **SMS**: Twilio (optional)
- **Caching**: Redis (optional)

### Key Features
- ✅ Multi-tenant business management
- ✅ Booking system with time slots
- ✅ Resource management (staff assignment)
- ✅ Real-time chat & notifications
- ✅ Payment processing
- ✅ Review & rating system
- ✅ AI-powered features
- ✅ QR code check-in
- ✅ Analytics & reporting
- ✅ File uploads

---

## 🧪 Testing

### Test Structure
```
test/
├── auth.integration-spec.ts           # Auth integration tests
├── bookings.integration-spec.ts       # Booking integration tests
├── booking-workflow.e2e-spec.ts       # End-to-end workflow tests
├── jest-e2e.json                      # E2E configuration
└── jest-integration.json              # Integration configuration
```

### Running Tests
```bash
# Run specific test file
npm run test:e2e -- booking-workflow.e2e-spec

# Run all E2E tests
npm run test:e2e

# Run with coverage
npm run test:cov
```

---

## 🚢 Deployment

### Docker

```bash
# Build image
docker build -t bukki-backend .

# Run container
docker run -p 3000:3000 --env-file .env bukki-backend
```

### Render.com

See deployment guide: [docs/deployment/DEPLOY_NOW.md](../docs/deployment/DEPLOY_NOW.md)

### Manual Deployment

```bash
# Build
npm run build

# Set environment variables
export NODE_ENV=production
export DATABASE_URL=postgresql://...
export JWT_SECRET=...
# ... other vars

# Start
npm run start:prod
```

---

## 📚 Documentation

- **Main Documentation**: [../docs/](../docs/)
- **Deployment Guide**: [../docs/deployment/DEPLOY_NOW.md](../docs/deployment/DEPLOY_NOW.md)
- **Database Guides**: [../docs/database/guides/](../docs/database/guides/)
- **Implementation Guides**: [../docs/guides/](../docs/guides/)
- **API Documentation**: `/api` endpoint (Swagger)

### Key Documentation Files
- [Database Indexes Guide](../docs/database/guides/DATABASE_INDEXES_GUIDE.md)
- [Migration Guide](../docs/database/guides/APPLY_MIGRATION.md)
- [Pagination Implementation](../docs/guides/PAGINATION_IMPLEMENTATION_GUIDE.md)
- [Implementation Summary](../docs/development/IMPLEMENTATION_SUMMARY.md)

---

## 🛠️ Development Scripts

```json
{
  "start": "nest start",
  "start:dev": "nest start --watch",
  "start:debug": "nest start --debug --watch",
  "start:prod": "node dist/src/main.js",
  "build": "nest build",
  "test": "jest",
  "test:watch": "jest --watch",
  "test:cov": "jest --coverage",
  "test:e2e": "jest --config ./test/jest-e2e.json",
  "test:integration": "jest --config ./test/jest-integration.json",
  "lint": "eslint \"{src,apps,libs,test}/**/*.ts\" --fix"
}
```

---

## 🤝 Contributing

See [CONTRIBUTING.md](../CONTRIBUTING.md) for contribution guidelines.

---

## 📄 License

See [LICENSE](../LICENSE) for license information.

---

**Last Updated**: February 9, 2026
