# BUKKi - Booking Platform Documentation

## 📋 Table of Contents
1. [Overview](#overview)
2. [Technology Stack](#technology-stack)
3. [Database Schema](#database-schema)
4. [Features & Functionalities](#features--functionalities)
5. [API Endpoints](#api-endpoints)
6. [Frontend Components](#frontend-components)
7. [Internationalization](#internationalization)
8. [Security Features](#security-features)
9. [Deployment](#deployment)

## 🎯 Overview

**BUKKi** is a comprehensive booking platform that connects customers with local businesses for appointment scheduling. The platform supports multiple user roles, advanced booking management, review systems, and geolocation-based services.

### Core Concept
- **Customers** can discover, book, and review services from local businesses
- **Business Owners** can manage their services, bookings, and customer interactions
- **Administrators** can oversee the entire platform and moderate content

## 🛠 Technology Stack

### Backend
- **Framework**: NestJS (Node.js)
- **Database**: PostgreSQL with TypeORM
- **Authentication**: JWT (JSON Web Tokens)
- **Email Service**: Nodemailer with Gmail SMTP
- **Geocoding**: Nominatim API
- **QR Code Generation**: qrcode library
- **Validation**: Class-validator, Class-transformer

### Frontend
- **Framework**: React 18 with TypeScript
- **Routing**: React Router v6
- **State Management**: React Query (TanStack Query)
- **Styling**: Tailwind CSS with custom "Sunset Glow" theme
- **UI Components**: Custom components with Lucide React icons
- **Notifications**: React Hot Toast
- **Internationalization**: Custom i18n context

### Development Tools
- **Package Manager**: npm
- **Build Tool**: Vite (Frontend), TypeScript compiler (Backend)
- **Code Quality**: ESLint, Prettier
- **Version Control**: Git

## 🗄 Database Schema

### Entity Relationship Diagram

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│      USERS      │    │   BUSINESSES    │    │    SERVICES     │
├─────────────────┤    ├─────────────────┤    ├─────────────────┤
│ id (PK)         │    │ id (PK)         │    │ id (PK)         │
│ email (UNIQUE)  │    │ name            │    │ name            │
│ password        │    │ description     │    │ description     │
│ firstName       │    │ category        │    │ price           │
│ lastName        │    │ address         │    │ duration        │
│ phone           │    │ city            │    │ isActive        │
│ role            │    │ state           │    │ images          │
│ isActive        │    │ zipCode         │    │ customFields    │
│ trustScore      │    │ country         │    │ maxBookingsPerSlot│
│ emailVerified   │    │ latitude        │    │ advanceBookingDays│
│ avatar          │    │ longitude       │    │ cancellationHours│
│ address         │    │ phone           │    │ rating          │
│ city            │    │ email           │    │ reviewCount     │
│ state           │    │ website         │    │ bookingCount    │
│ zipCode         │    │ logo            │    │ businessId (FK) │
│ country         │    │ images          │    └─────────────────┘
│ dateOfBirth     │    │ status          │             │
│ emailVerificationToken│ workingHours    │             │
│ passwordResetToken│   customBookingFields│           │
│ passwordResetExpires│ qrCode           │             │
└─────────────────┘    │ rating          │             │
         │              │ reviewCount     │             │
         │              │ isActive        │             │
         │              │ showRevenue     │             │
         │              │ maxBookingsPerUserPerDay│     │
         │              │ onboardingCompleted│         │
         │              │ subscriptionPlan│             │
         │              │ subscriptionExpiresAt│       │
         │              │ ownerId (FK)   │             │
         │              └─────────────────┘             │
         │                       │                      │
         │                       │                      │
         │              ┌─────────────────┐             │
         │              │    BOOKINGS     │             │
         │              ├─────────────────┤             │
         │              │ id (PK)         │             │
         │              │ appointmentDate │             │
         │              │ appointmentEndDate│           │
         │              │ status          │             │
         │              │ paymentStatus   │             │
         │              │ totalAmount    │             │
         │              │ customFieldValues│            │
         │              │ notes           │             │
         │              │ qrCode          │             │
         │              │ checkedInAt     │             │
         │              │ checkedIn       │             │
         │              │ cancelledAt     │             │
         │              │ cancellationReason│           │
         │              │ reminderSentAt  │             │
         │              │ paymentDetails  │             │
         │              │ customerId (FK) │             │
         │              │ businessId (FK) │             │
         │              │ serviceId (FK)  │             │
         │              └─────────────────┘             │
         │                       │                      │
         │                       │                      │
         │              ┌─────────────────┐             │
         │              │     REVIEWS     │             │
         │              ├─────────────────┤             │
         │              │ id (PK)         │             │
         │              │ businessId (FK) │             │
         │              │ userId (FK)     │             │
         │              │ bookingId (FK)  │             │
         │              │ rating          │             │
         │              │ comment         │             │
         │              │ isActive        │             │
         │              │ createdAt       │             │
         │              │ updatedAt       │             │
         │              └─────────────────┘             │
         │                       │                      │
         └───────────────────────┼──────────────────────┘
                                 │
                                 │
                    ┌─────────────────┐
                    │   RELATIONSHIPS  │
                    ├─────────────────┤
                    │ User 1:1 Business│
                    │ User 1:N Bookings│
                    │ User 1:N Reviews │
                    │ Business 1:N Services│
                    │ Business 1:N Bookings│
                    │ Business 1:N Reviews│
                    │ Service 1:N Bookings│
                    │ Booking 1:N Reviews│
                    └─────────────────┘
```

### Key Relationships
- **User ↔ Business**: One-to-One (Business Owner)
- **User ↔ Bookings**: One-to-Many (Customer bookings)
- **User ↔ Reviews**: One-to-Many (User reviews)
- **Business ↔ Services**: One-to-Many (Business services)
- **Business ↔ Bookings**: One-to-Many (Business bookings)
- **Business ↔ Reviews**: One-to-Many (Business reviews)
- **Service ↔ Bookings**: One-to-Many (Service bookings)
- **Booking ↔ Reviews**: One-to-Many (Booking reviews)

## 🚀 Features & Functionalities

### 🔐 Authentication & Authorization
- **User Registration** with email verification
- **Role-based Access Control** (Customer, Business Owner, Super Admin)
- **JWT Token Authentication**
- **Password Reset** functionality
- **Email Verification** system with 6-digit codes
- **Trust Score System** (0-100 points) for anti-abuse

### 👥 User Management
- **User Profiles** with personal information
- **Avatar Upload** support
- **Address Management** with geocoding
- **Trust Score Tracking** with visual indicators
- **Account Status Management** (Active/Inactive)

### 🏢 Business Management
- **Business Registration** with multi-step onboarding
- **Service Management** (Create, Read, Update, Delete)
- **Working Hours** configuration
- **Custom Booking Fields** for specialized services
- **Business Settings** for daily booking limits
- **Revenue Tracking** toggle (privacy control)
- **Business Status** management (Pending, Approved, Rejected, Suspended)

### 📅 Booking System
- **Real-time Availability** checking
- **QR Code Generation** for bookings
- **QR Code Scanning** for check-ins
- **Booking Status** tracking (Pending, Confirmed, Completed, Cancelled, No-Show)
- **Payment Integration** (Stripe ready)
- **Custom Field Support** for specialized bookings
- **Booking Limits** per user per business per day
- **Automatic No-Show Detection** with trust score penalties

### ⭐ Review & Rating System
- **5-Star Rating System** (1-5 stars)
- **Review Comments** (optional)
- **Average Rating Calculation**
- **Review Display** on business pages
- **Automatic Review Prompts** after completed visits
- **Review Moderation** capabilities

### 🗺 Geolocation Features
- **Address Geocoding** using Nominatim API
- **Nearby Business Search** with radius filtering
- **Distance-based Sorting**
- **"Available Now" Filter** based on working hours
- **Map Integration** ready for future implementation

### 🌍 Internationalization
- **Multi-language Support**: Romanian, English, Russian
- **Dynamic Language Switching**
- **Comprehensive Translation Coverage**
- **RTL Support Ready**

### 🎨 UI/UX Features
- **Responsive Design** (Mobile-first approach)
- **Custom "Sunset Glow" Theme** with Tailwind CSS
- **Geometric Decorative Elements**
- **Loading States** and error handling
- **Toast Notifications** for user feedback
- **Accessibility Features**

### 📊 Analytics & Reporting
- **Business Dashboard** with booking statistics
- **Revenue Tracking** (optional for businesses)
- **User Analytics** for administrators
- **Booking Analytics** with time-based filtering
- **Review Analytics** for business insights

### 🔒 Security Features
- **Input Validation** on all forms
- **SQL Injection Protection** via TypeORM
- **XSS Protection** with proper sanitization
- **Rate Limiting** for API endpoints
- **Trust Score System** for abuse prevention
- **Email Verification** for account security
- **Password Hashing** with bcrypt

## 🌐 API Endpoints

### Authentication
- `POST /auth/register` - User registration
- `POST /auth/login` - User login
- `POST /auth/verify-email` - Email verification
- `POST /auth/resend-verification` - Resend verification code
- `POST /auth/forgot-password` - Password reset request
- `POST /auth/reset-password` - Password reset confirmation
- `GET /auth/profile` - Get user profile

### Users
- `GET /users` - Get all users (Admin)
- `GET /users/:id` - Get user by ID
- `PATCH /users/:id` - Update user
- `DELETE /users/:id` - Deactivate user
- `POST /users/:id/activate` - Activate user

### Businesses
- `POST /businesses` - Create business
- `GET /businesses` - Get all businesses
- `GET /businesses/:id` - Get business by ID
- `PATCH /businesses/:id` - Update business
- `GET /businesses/search` - Search businesses
- `GET /businesses/nearby` - Get nearby businesses
- `GET /businesses/my-business` - Get user's business
- `POST /businesses/:id/approve` - Approve business
- `POST /businesses/:id/reject` - Reject business
- `POST /businesses/:id/suspend` - Suspend business
- `GET /businesses/:id/stats` - Get business statistics
- `PATCH /businesses/:id/toggle-revenue` - Toggle revenue visibility

### Services
- `POST /services` - Create service
- `GET /services` - Get all services
- `GET /services/:id` - Get service by ID
- `PATCH /services/:id` - Update service
- `DELETE /services/:id` - Delete service
- `GET /services/search` - Search services
- `GET /services/popular` - Get popular services
- `GET /services/business/:businessId` - Get business services
- `GET /services/:id/available-slots` - Get available time slots

### Bookings
- `POST /bookings` - Create booking
- `GET /bookings` - Get user bookings
- `GET /bookings/:id` - Get booking by ID
- `PATCH /bookings/:id/status` - Update booking status
- `POST /bookings/:id/checkin` - Check-in booking
- `DELETE /bookings/:id` - Cancel booking
- `GET /bookings/business/:businessId/date/:date` - Get business bookings by date
- `GET /bookings/business/:businessId/stats` - Get booking statistics

### Reviews
- `POST /reviews` - Create review
- `GET /reviews/business/:businessId` - Get business reviews
- `GET /reviews/trust-score` - Get user trust score

## 🎨 Frontend Components

### Core Components
- **Layout** - Main application layout with navigation
- **ProtectedRoute** - Route protection based on user roles
- **GeometricSymbols** - Decorative SVG components
- **DecorativeBackground** - Background decoration system

### Authentication Components
- **Login** - User login form
- **Register** - User registration form
- **EmailVerification** - Email verification form

### Business Components
- **BusinessList** - Business listing with search and filters
- **BusinessDetail** - Business detail page with services and reviews
- **BusinessDashboard** - Business owner dashboard
- **BusinessOnboarding** - Multi-step business setup
- **BusinessSettings** - Business configuration

### Booking Components
- **BookingForm** - Service booking form
- **MyBookings** - User's booking history
- **BookingReviewPrompt** - Review prompt for completed bookings

### Review Components
- **ReviewPrompt** - Review submission form
- **ReviewDisplay** - Review display with ratings
- **TrustScore** - Trust score visualization

### User Components
- **Profile** - User profile management
- **AdminDashboard** - Administrative dashboard

## 🌍 Internationalization

### Supported Languages
- **Romanian (ro)** - Primary language
- **English (en)** - Secondary language
- **Russian (ru)** - Tertiary language

### Translation Coverage
- **Authentication** - Login, register, verification
- **Navigation** - Menu items, breadcrumbs
- **Business Management** - Onboarding, settings, dashboard
- **Booking System** - Forms, status messages, confirmations
- **Review System** - Prompts, displays, ratings
- **User Interface** - Buttons, labels, placeholders, error messages
- **Admin Features** - Dashboard, user management, business approval

### Implementation
- **Custom i18n Context** with React hooks
- **Dynamic Language Switching** without page reload
- **Fallback to English** for missing translations
- **RTL Support Ready** for future expansion

## 🚀 Deployment

### Environment Variables
```env
# Database
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_USERNAME=postgres
DATABASE_PASSWORD=your_password
DATABASE_NAME=booking_platform

# JWT
JWT_SECRET=your_jwt_secret
JWT_EXPIRES_IN=7d

# Email (Gmail SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password

# Geocoding
NOMINATIM_CONTACT_EMAIL=your_email@example.com

# App
PORT=3000
NODE_ENV=development
FRONTEND_URL=http://localhost:3001
```

### Database Setup
1. **PostgreSQL** database creation
2. **TypeORM** automatic schema generation
3. **Seed data** for initial setup
4. **Indexes** for performance optimization

### Production Considerations
- **Environment Variables** configuration
- **Database Connection Pooling**
- **CORS** configuration for frontend
- **Rate Limiting** implementation
- **Error Logging** and monitoring
- **SSL/HTTPS** configuration
- **CDN** for static assets

## 📈 Future Enhancements

### Planned Features
- **Mobile App** (React Native)
- **Real-time Notifications** (WebSocket)
- **Payment Integration** (Stripe)
- **Advanced Analytics** (Charts, Reports)
- **Multi-tenant Architecture**
- **API Rate Limiting**
- **Caching Layer** (Redis)
- **File Upload** (AWS S3)
- **SMS Notifications** (Twilio)

### Scalability Considerations
- **Microservices Architecture**
- **Database Sharding**
- **Load Balancing**
- **CDN Integration**
- **Caching Strategies**
- **Monitoring & Logging**

---

## 📞 Support & Contact

For technical support or questions about the BUKKi platform, please refer to the development team or create an issue in the project repository.

**Version**: 1.0.0  
**Last Updated**: December 2024  
**Status**: Production Ready
