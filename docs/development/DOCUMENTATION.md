# BUKKi - Booking Platform Documentation

## 📋 Table of Contents
1. [Overview](#overview)
2. [Technology Stack](#technology-stack)
3. [Database Schema](#database-schema)
4. [Features & Functionalities](#features--functionalities)
   - [Customer Features](#-customer-features)
   - [Business Owner Features](#-business-owner-features)
   - [Super Admin Features](#-super-admin-features)
   - [Internationalization Features](#-internationalization-features)
   - [User Interface Features](#-user-interface-features)
   - [Analytics & Reporting Features](#-analytics--reporting-features)
   - [Communication Features](#-communication-features)
   - [Security Features](#-security-features)
5. [API Endpoints](#api-endpoints)
6. [Frontend Components](#frontend-components)
7. [Internationalization](#internationalization)
8. [Deployment](#deployment)

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

### 👤 Customer Features

#### Business Discovery & Search
- **Business Browsing**: Browse all available businesses with filtering options
- **Advanced Search**: Search by business name, category, location, or keywords
- **Location-based Search**: Find nearby businesses using geolocation or address input
- **Category Filtering**: Filter businesses by industry categories (beauty, restaurant, mechanic, etc.)
- **Distance Sorting**: Sort businesses by proximity to user location
- **Available Now Filter**: Show only businesses currently open and accepting bookings
- **Business Detail Pages**: View comprehensive business information including:
  - Business description, contact information, location
  - Service offerings with pricing and duration
  - Average ratings and customer reviews
  - Working hours and availability
  - Business images and gallery

#### Booking Management
- **Service Booking**: Book appointments with real-time availability checking
- **Date & Time Selection**: Interactive calendar with available time slots
- **Custom Field Support**: Fill out business-specific booking forms (e.g., hair color, vehicle type)
- **Booking History**: View all past and upcoming bookings in one place
- **Booking Status Tracking**: Monitor booking status (Pending, Confirmed, Completed, Cancelled)
- **QR Code Generation**: Receive unique QR code for each booking for easy check-in
- **Booking Cancellation**: Cancel bookings with appropriate notice periods
- **Booking Limits**: Automatic enforcement of daily booking limits per business (max 2 per day)
- **Email Notifications**: Receive booking confirmations and reminders via email

#### Reviews & Ratings
- **Review Submission**: Leave reviews and ratings (1-5 stars) after completed visits
- **Review Editing**: Edit your own reviews
- **Review Display**: View all reviews for businesses
- **Trust Score**: Maintain a trust score (0-100) based on booking behavior:
  - Increases with successful check-ins
  - Decreases with no-shows
  - Visible to business owners

#### Profile Management
- **Personal Profile**: Edit personal information, address, and contact details
- **Avatar Upload**: Upload and manage profile pictures
- **Email Verification**: Required email verification before making bookings
- **Password Management**: Change password with secure verification
- **Trust Score Visibility**: View your trust score and understand how it's calculated

### 🏢 Business Owner Features

#### Business Onboarding
- **Multi-step Registration**: Guided onboarding process with 4 steps:
  1. Business Information (name, category, description, contact details)
  2. Services Setup (add multiple services with pricing and duration)
  3. Working Hours Configuration (set hours for each day of the week)
  4. Custom Booking Fields (create custom form fields for specialized services)
- **Business Address Setup**: Enter address with automatic geocoding for location services
- **Business Images**: Upload logo and gallery images
- **Email Verification**: Verify business email address
- **Admin Approval**: Await admin approval before business goes live

#### Service Management
- **Service Creation**: Add unlimited services with:
  - Service name and description
  - Pricing (supports multiple currencies)
  - Duration (in minutes)
  - Active/Inactive status
  - Custom fields integration
- **Service Editing**: Update service details at any time
- **Service Deactivation**: Temporarily disable services without deletion
- **Service Analytics**: View booking counts and popularity metrics per service

#### Booking Management
- **Dashboard Overview**: Comprehensive dashboard showing:
  - Total bookings (pending, confirmed, completed)
  - Revenue statistics (optional visibility toggle)
  - Customer count
  - Service performance metrics
- **Booking Calendar**: View all bookings organized by date
- **Booking Status Management**: Update booking statuses:
  - Confirm pending bookings
  - Mark bookings as completed
  - Cancel bookings with reason tracking
  - Handle no-show bookings
- **QR Code Scanning**: Scan customer QR codes for check-in
- **Check-in System**: Mark customers as checked in with timestamp
- **Booking Notifications**: Receive email notifications for new bookings
- **Customer Contact**: Access customer contact information for bookings

#### Business Settings
- **Revenue Visibility Toggle**: Control whether revenue appears in dashboard (privacy control)
- **Booking Limits Configuration**: Set maximum bookings per user per day (default: 2)
- **Working Hours Management**: Update business hours for each day
- **Business Profile Updates**: Edit business information, description, images
- **Team Management**: Invite team members (staff) with operational access
  - Staff members can manage bookings but cannot see revenue
  - Staff can check-in customers and update booking statuses
- **Auto-accept Bookings**: Toggle automatic booking confirmation (future feature)

#### Analytics & Insights
- **Booking Statistics**: View booking trends and patterns
- **Revenue Tracking**: Track revenue per service and overall (when enabled)
- **Customer Analytics**: Understand customer booking patterns
- **Review Analytics**: Monitor ratings and review trends
- **Performance Metrics**: Track business performance over time

### 👑 Super Admin Features

#### Platform Management
- **Admin Dashboard**: Comprehensive platform overview with key metrics:
  - Total users count
  - Total businesses count
  - Active businesses count
  - Total platform revenue
  - Pending business approvals
- **Business Approval System**: Review and approve/reject new business registrations
- **Business Suspension**: Suspend businesses for policy violations
- **Business Status Management**: Change business status (Pending, Approved, Rejected, Suspended)

#### User Management
- **User Overview**: View all platform users with filtering options
- **User Activation/Deactivation**: Activate or deactivate user accounts
- **User Role Management**: View user roles (Customer, Business Owner, Super Admin)
- **User Analytics**: Track user registration trends and activity

#### Content Moderation
- **Review Moderation**: Moderate reviews for inappropriate content
- **Business Content Review**: Review business information before approval
- **Report Management**: Handle user reports and complaints

#### System Monitoring
- **Platform Health**: Monitor system performance and uptime
- **Analytics Dashboard**: View platform-wide analytics and trends
- **Performance Metrics**: Track platform growth and usage statistics

### 🌍 Internationalization Features

#### Multi-language Support
- **Three Languages**: Full support for Romanian (ro), English (en), and Russian (ru)
- **Dynamic Language Switching**: Change language instantly without page reload
- **Comprehensive Translations**: All UI elements translated including:
  - Navigation menus
  - Form labels and placeholders
  - Error messages
  - Success notifications
  - Business onboarding steps
  - Review system
  - Admin dashboard
- **Language Persistence**: Selected language saved in localStorage
- **RTL Support Ready**: Architecture supports right-to-left languages for future expansion

### 🎨 User Interface Features

#### Design System
- **Custom Theme**: "Sunset Glow" color palette with warm oranges and yellows
- **Responsive Design**: Mobile-first approach, works on all screen sizes
- **Accessibility**: WCAG-compliant design with proper contrast ratios
- **Loading States**: Smooth loading indicators for all async operations
- **Error Handling**: User-friendly error messages and recovery options
- **Toast Notifications**: Non-intrusive notifications for user feedback

#### UI Components
- **Decorative Elements**: Traditional Moldovan-inspired geometric motifs
- **Icon System**: Lucide React icons for consistent visual language
- **Card Components**: Reusable card layouts for content display
- **Form Components**: Consistent form inputs with validation
- **Button System**: Standardized button styles matching theme colors
- **Navigation**: Sidebar navigation with role-based menu items

### 📊 Analytics & Reporting Features

#### Business Analytics
- **Booking Trends**: View booking patterns over time
- **Revenue Reports**: Track revenue by service, date, or customer
- **Customer Insights**: Understand customer booking behavior
- **Service Performance**: Identify most popular services
- **Review Statistics**: Monitor average ratings and review counts

#### Platform Analytics (Admin)
- **Platform Growth**: Track user and business growth metrics
- **Usage Statistics**: Monitor platform usage patterns
- **Revenue Metrics**: Track overall platform revenue (aggregated)
- **Performance Monitoring**: System performance and response times

### 📧 Communication Features

#### Email System
- **Verification Emails**: 6-digit verification codes sent via email
- **Booking Confirmations**: Automated booking confirmation emails
- **Booking Reminders**: Email reminders before appointments
- **Password Reset**: Secure password reset via email links
- **Business Notifications**: Email notifications for new bookings
- **Professional Templates**: HTML email templates with branding

#### Notifications
- **Real-time Toasts**: Instant feedback for user actions
- **Email Notifications**: Configurable email notification preferences
- **SMS Ready**: Infrastructure ready for SMS notifications (Twilio integration)

### 🔒 Security Features

#### Authentication Security

##### Password Security
- **Bcrypt Hashing**: All passwords hashed using bcrypt with 12 rounds
- **Password Requirements**: Minimum 8 characters with letters and numbers enforced
- **Password Reset**: Secure password reset flow with time-limited tokens
- **Password Change**: Users can change passwords with old password verification
- **No Password Storage**: Passwords never stored in plain text, only hashed versions

##### Email Verification
- **6-Digit Codes**: Cryptographically secure 6-digit verification codes
- **Code Expiration**: Verification codes expire after 15 minutes
- **Resend Functionality**: Users can request new verification codes
- **Email Verification Required**: Email must be verified before creating bookings
- **Rate Limiting**: Limited verification code requests per hour to prevent abuse

##### JWT Authentication
- **Token-based Auth**: Secure JWT tokens for stateless authentication
- **Token Expiration**: Configurable token expiration (default: 7 days)
- **Secret Key**: Strong JWT secret key required from environment variables
- **Token Validation**: All tokens validated on each request
- **User Context**: User information embedded in token payload

#### Authorization Security

##### Role-based Access Control (RBAC)
- **Three Roles**: Customer, Business Owner, Super Admin
- **Route Guards**: NestJS guards protect routes based on roles
- **Role Decorators**: `@Roles()` decorator for endpoint-level role requirements
- **JWT Guards**: JWT authentication required for protected routes
- **Role Validation**: Server-side role validation on all protected endpoints

##### Permission System
- **Business Ownership**: Business owners can only manage their own businesses
- **Customer Privacy**: Customers can only see their own bookings
- **Admin Powers**: Super admins have full platform access
- **Staff Limitations**: Staff members cannot access revenue data
- **Cross-user Protection**: Users cannot access other users' data

#### Data Security

##### Field Encryption
- **AES-256-GCM Encryption**: Sensitive fields encrypted at rest using AES-256-GCM
- **Encrypted Fields**:
  - User phone numbers
  - User addresses
  - Booking notes (custom field values)
  - Business contact emails
- **Authenticated Encryption**: GCM mode provides both confidentiality and authenticity
- **IV Generation**: Unique initialization vectors for each encryption operation
- **Key Management**: Encryption keys stored securely in environment variables
- **Automatic Decryption**: Transparent decryption when reading from database

##### Blind Indexes
- **Email Hashing**: Business contact emails hashed with SHA-256 for searchability
- **Salt-based Hashing**: Unique salt prevents rainbow table attacks
- **Searchable Encryption**: Allows searching encrypted emails without decryption

##### SQL Injection Protection
- **TypeORM Parameterized Queries**: All database queries use parameterized statements
- **Query Builder**: TypeORM QueryBuilder prevents SQL injection
- **Input Sanitization**: All user inputs validated and sanitized before database operations
- **No Raw Queries**: Restricted use of raw SQL queries

##### XSS Protection
- **Input Validation**: All inputs validated using class-validator DTOs
- **Content Sanitization**: User-generated content sanitized before display
- **React Auto-escaping**: React automatically escapes content in JSX
- **CSP Ready**: Content Security Policy headers configured via Helmet

#### API Security

##### Rate Limiting
- **Global Rate Limiting**: 300 requests per 15 minutes per IP (configurable)
- **Auth Endpoint Limits**: Tighter limits on authentication endpoints (20 requests per 15 minutes)
- **Verification Limits**: Email verification limited to 10 requests per hour
- **IP-based Tracking**: Rate limiting based on real IP addresses (proxy-aware)
- **Standard Headers**: Rate limit information in response headers

##### CORS Configuration
- **Allowed Origins**: Configurable allowed origins from environment variables
- **Credentials Support**: Cookies and authentication headers supported
- **Preflight Handling**: Proper OPTIONS request handling
- **Security Headers**: CORS configured with security best practices

##### HTTP Security Headers (Helmet)
- **Content Security Policy**: CSP headers prevent XSS attacks
- **X-Frame-Options**: Prevents clickjacking attacks
- **X-Content-Type-Options**: Prevents MIME type sniffing
- **Strict Transport Security**: HSTS headers for HTTPS enforcement (production)
- **X-XSS-Protection**: Additional XSS protection layers

#### Application Security

##### Trust Score System
- **Anti-abuse Mechanism**: Trust score (0-100) tracks user reliability
- **Score Calculation**:
  - Increases with successful check-ins
  - Decreases significantly with no-shows
  - Resets gradually with good behavior
- **Business Protection**: Prevents booking abuse and no-shows
- **Transparent Scoring**: Users can view their trust score

##### Booking Limits
- **Daily Limits**: Maximum 2 bookings per user per business per day (configurable)
- **Business-level Limits**: Businesses can set their own booking limits
- **Automatic Enforcement**: Limits enforced server-side on booking creation
- **Abuse Prevention**: Prevents booking spam and resource abuse

##### Input Validation
- **DTO Validation**: All endpoints use Data Transfer Objects with validation decorators
- **Type Validation**: Type checking for all inputs
- **Length Validation**: String length limits enforced
- **Format Validation**: Email, phone, date formats validated
- **Required Field Validation**: Required fields enforced

##### Session Security
- **Stateless Authentication**: JWT tokens eliminate server-side session vulnerabilities
- **Token Revocation**: Tokens invalidated on logout (client-side)
- **Secure Token Storage**: Tokens stored in localStorage (consider httpOnly cookies for production)
- **Token Refresh**: Token expiration handled gracefully

#### Database Security

##### Connection Security
- **Environment Variables**: Database credentials never hardcoded
- **Connection Pooling**: Secure connection pooling prevents connection exhaustion
- **SSL Support**: Database SSL connections supported (production recommended)

##### Data Integrity
- **Foreign Key Constraints**: Database relationships enforced at DB level
- **Unique Constraints**: Email uniqueness and other constraints enforced
- **Transaction Support**: Critical operations wrapped in database transactions
- **Data Validation**: TypeORM validators ensure data integrity

#### Email Security

##### SMTP Security
- **TLS/SSL**: Email sent over encrypted SMTP connections
- **App Passwords**: Gmail app passwords used instead of regular passwords
- **Email Verification**: Prevents email spoofing and fake accounts

##### Email Content Security
- **No Sensitive Data**: Verification codes and reset tokens only, no passwords
- **Time-limited Tokens**: All tokens have expiration times
- **Single-use Tokens**: Tokens invalidated after use

#### Deployment Security

##### Environment Security
- **Secret Management**: All secrets stored in environment variables
- **No Secrets in Code**: No credentials committed to version control
- **Separate Environments**: Development, staging, and production environments isolated

##### Production Security
- **HTTPS Required**: HTTPS enforced in production
- **Secure Headers**: Security headers configured via Helmet
- **Error Handling**: Error messages don't expose sensitive information
- **Logging**: Secure logging without sensitive data exposure

#### Additional Security Measures

##### QR Code Security
- **Server-side Generation**: QR codes generated server-side with booking data
- **Verification on Check-in**: QR codes verified server-side during check-in
- **Tamper Detection**: QR code data includes booking ID for verification

##### Business Approval System
- **Admin Approval Required**: New businesses require admin approval before going live
- **Status Tracking**: Business status tracked (Pending, Approved, Rejected, Suspended)
- **Content Moderation**: Business information reviewed before approval

##### Account Security
- **Account Deactivation**: Users can be deactivated without deletion
- **Active Status Check**: Active status verified on login
- **Account Recovery**: Email-based account recovery system

##### Privacy Protection
- **Revenue Privacy**: Business owners can hide revenue from staff members
- **Data Minimization**: Only necessary data collected and stored
- **GDPR Ready**: Architecture supports GDPR compliance requirements

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
