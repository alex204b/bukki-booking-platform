# 🚀 MultiBusiness Booking Platform - Setup Guide

This guide will help you set up and run the complete MultiBusiness Booking Platform on your local machine.

## 📋 Prerequisites

Before you begin, make sure you have the following installed:

- **Node.js** (v18 or higher) - [Download here](https://nodejs.org/)
- **PostgreSQL** (v13 or higher) - [Download here](https://www.postgresql.org/download/)
- **Git** - [Download here](https://git-scm.com/)

## 🗄️ Database Setup

### 1. Install PostgreSQL
- Download and install PostgreSQL from the official website
- During installation, remember the password you set for the `postgres` user
- Make sure PostgreSQL service is running

### 2. Create Database
```sql
-- Connect to PostgreSQL as superuser
psql -U postgres

-- Create database
CREATE DATABASE booking_platform;

-- Create a user (optional, you can use postgres user)
CREATE USER booking_user WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE booking_platform TO booking_user;

-- Exit psql
\q
```

### 3. Run Database Migrations
```bash
# Navigate to backend directory
cd backend

# Connect to your database and run the migration
psql -U postgres -d booking_platform -f src/database/migrations/001-initial-schema.sql

# Run sample data (optional)
psql -U postgres -d booking_platform -f src/database/seeders/001-sample-data.sql
```

## ⚙️ Environment Configuration

### 1. Backend Environment
```bash
# Copy the example environment file
cd backend
cp env.example .env
```

Edit `backend/.env` with your configuration:
```env
# Database
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_USERNAME=postgres
DATABASE_PASSWORD=your_postgres_password
DATABASE_NAME=booking_platform

# JWT
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRES_IN=7d

# App
PORT=3000
NODE_ENV=development
FRONTEND_URL=http://localhost:3001

# Email (Optional - for notifications)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# Payment (Optional - for Stripe integration)
STRIPE_SECRET_KEY=sk_test_your-stripe-secret-key
STRIPE_PUBLISHABLE_KEY=pk_test_your-stripe-publishable-key
STRIPE_WEBHOOK_SECRET=whsec_your-webhook-secret

# File Storage (Optional - for AWS S3)
AWS_ACCESS_KEY_ID=your-aws-access-key
AWS_SECRET_ACCESS_KEY=your-aws-secret-key
AWS_REGION=us-east-1
AWS_S3_BUCKET=booking-platform-images
```

### 2. Frontend Environment
```bash
# Navigate to frontend directory
cd frontend

# Create environment file
echo "REACT_APP_API_URL=http://localhost:3000" > .env
```

## 📦 Installation

### 1. Install All Dependencies
```bash
# From the root directory
npm run install:all
```

This will install dependencies for:
- Root project
- Backend (NestJS)
- Frontend (React)

### 2. Alternative Manual Installation
```bash
# Install root dependencies
npm install

# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

## 🚀 Running the Application

### Option 1: Run Both Services Together
```bash
# From the root directory
npm run dev
```

This will start:
- Backend API on `http://localhost:3000`
- Frontend app on `http://localhost:3001`

### Option 2: Run Services Separately

**Backend:**
```bash
cd backend
npm run start:dev
```

**Frontend (in a new terminal):**
```bash
cd frontend
npm start
```

## 🌐 Accessing the Application

Once both services are running:

- **Frontend Application**: http://localhost:3001
- **Backend API**: http://localhost:3000
- **API Documentation**: http://localhost:3000/api

## 👤 Default Accounts

If you ran the sample data, you can use these accounts:

### Super Admin
- **Email**: admin@bookit.com
- **Password**: password123
- **Role**: Super Admin

### Customer
- **Email**: john@example.com
- **Password**: password123
- **Role**: Customer

### Business Owner
- **Email**: salon@beauty.com
- **Password**: password123
- **Role**: Business Owner

## 🧪 Testing the Application

### 1. Test Backend API
```bash
# Health check
curl http://localhost:3000/health

# API documentation
# Visit http://localhost:3000/api in your browser
```

### 2. Test Frontend
1. Open http://localhost:3001
2. Try logging in with the default accounts
3. Browse businesses and create bookings
4. Test different user roles

## 🔧 Development Commands

### Backend Commands
```bash
cd backend

# Start development server
npm run start:dev

# Build for production
npm run build

# Start production server
npm run start:prod

# Run tests
npm run test

# Lint code
npm run lint
```

### Frontend Commands
```bash
cd frontend

# Start development server
npm start

# Build for production
npm run build

# Run tests
npm run test

# Eject (not recommended)
npm run eject
```

## 📁 Project Structure

```
📦 booking-platform/
├── 📁 backend/                 # NestJS Backend
│   ├── 📁 src/
│   │   ├── 📁 auth/           # Authentication
│   │   ├── 📁 users/          # User management
│   │   ├── 📁 businesses/     # Business logic
│   │   ├── 📁 bookings/       # Booking system
│   │   ├── 📁 services/       # Service management
│   │   ├── 📁 notifications/  # Email/SMS
│   │   ├── 📁 payments/       # Stripe integration
│   │   ├── 📁 files/          # File uploads
│   │   └── 📁 database/       # Migrations & seeders
│   └── 📄 package.json
├── 📁 frontend/               # React Frontend
│   ├── 📁 src/
│   │   ├── 📁 pages/          # App pages
│   │   ├── 📁 components/     # Reusable components
│   │   ├── 📁 contexts/       # React contexts
│   │   └── 📁 services/       # API services
│   └── 📄 package.json
└── 📄 README.md
```

## 🐛 Troubleshooting

### Common Issues

**1. Database Connection Error**
```
Error: connect ECONNREFUSED 127.0.0.1:5432
```
- Make sure PostgreSQL is running
- Check your database credentials in `.env`
- Verify the database exists

**2. Port Already in Use**
```
Error: listen EADDRINUSE :::3000
```
- Kill the process using the port: `npx kill-port 3000`
- Or change the port in your `.env` file

**3. Frontend Can't Connect to Backend**
- Make sure the backend is running on port 3000
- Check the `REACT_APP_API_URL` in frontend `.env`
- Verify CORS settings in backend

**4. JWT Token Issues**
- Make sure `JWT_SECRET` is set in backend `.env`
- Check token expiration settings

### Getting Help

1. Check the console logs for error messages
2. Verify all environment variables are set correctly
3. Make sure all dependencies are installed
4. Check that PostgreSQL is running and accessible

## 🚀 Production Deployment

For production deployment, you'll need to:

1. Set up a production PostgreSQL database
2. Configure environment variables for production
3. Set up file storage (AWS S3 or similar)
4. Configure email service
5. Set up payment processing
6. Deploy backend to a cloud service
7. Deploy frontend to a CDN or hosting service

## 📝 Next Steps

Once you have the application running:

1. **Customize the UI**: Modify colors, fonts, and layout in `frontend/src/index.css`
2. **Add Features**: Implement additional business logic in the backend
3. **Integrate Services**: Set up email, SMS, and payment services
4. **Deploy**: Follow production deployment guidelines
5. **Monitor**: Set up logging and monitoring

## 🎉 You're Ready!

Your MultiBusiness Booking Platform is now running locally! Start exploring the features and building your business.

For questions or issues, check the troubleshooting section or refer to the API documentation at `http://localhost:3000/api`.
