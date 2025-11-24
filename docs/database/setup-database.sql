-- Create Database Tables for Bukki Booking Platform
-- Run this in your database to create all necessary tables

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    "firstName" VARCHAR(100) NOT NULL,
    "lastName" VARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    role VARCHAR(20) DEFAULT 'customer' CHECK (role IN ('customer', 'business_owner', 'employee', 'super_admin')),
    "isActive" BOOLEAN DEFAULT true,
    avatar VARCHAR(500),
    address VARCHAR(255),
    city VARCHAR(100),
    state VARCHAR(100),
    "zipCode" VARCHAR(20),
    country VARCHAR(100),
    "dateOfBirth" DATE,
    "emailVerified" BOOLEAN DEFAULT false,
    "emailVerificationToken" VARCHAR(255),
    "passwordResetToken" VARCHAR(255),
    "passwordResetExpires" TIMESTAMP,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP
);

-- Businesses table
CREATE TABLE IF NOT EXISTS businesses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(50) NOT NULL CHECK (category IN (
        'beauty_salon', 'tailor', 'mechanic', 'restaurant', 
        'fitness', 'healthcare', 'education', 'consulting', 'other'
    )),
    address VARCHAR(255) NOT NULL,
    city VARCHAR(100) NOT NULL,
    state VARCHAR(100) NOT NULL,
    "zipCode" VARCHAR(20) NOT NULL,
    country VARCHAR(100) NOT NULL,
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    phone VARCHAR(20) NOT NULL,
    email VARCHAR(255),
    website VARCHAR(255),
    logo VARCHAR(500),
    images JSONB,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'suspended')),
    "workingHours" JSONB,
    "customBookingFields" JSONB,
    "qrCode" TEXT,
    rating DECIMAL(3, 2) DEFAULT 0,
    "reviewCount" INTEGER DEFAULT 0,
    "isActive" BOOLEAN DEFAULT true,
    "subscriptionPlan" VARCHAR(50),
    "subscriptionExpiresAt" TIMESTAMP,
    "ownerId" UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP
);

-- Services table
CREATE TABLE IF NOT EXISTS services (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    price DECIMAL(10, 2) NOT NULL,
    duration INTEGER NOT NULL, -- in minutes
    "businessId" UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    "isActive" BOOLEAN DEFAULT true,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP
);

-- Bookings table
CREATE TABLE IF NOT EXISTS bookings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "customerId" UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    "serviceId" UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
    "businessId" UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    "appointmentDate" TIMESTAMP NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'completed', 'cancelled', 'no_show')),
    "paymentStatus" VARCHAR(20) DEFAULT 'pending' CHECK ("paymentStatus" IN ('pending', 'paid', 'refunded', 'failed')),
    "totalAmount" DECIMAL(10, 2) NOT NULL,
    notes TEXT,
    "checkInTime" TIMESTAMP,
    "checkOutTime" TIMESTAMP,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP
);

-- Reviews table
CREATE TABLE IF NOT EXISTS reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "businessId" UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    "customerId" UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    "bookingId" UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_businesses_owner ON businesses("ownerId");
CREATE INDEX IF NOT EXISTS idx_services_business ON services("businessId");
CREATE INDEX IF NOT EXISTS idx_bookings_customer ON bookings("customerId");
CREATE INDEX IF NOT EXISTS idx_bookings_business ON bookings("businessId");
CREATE INDEX IF NOT EXISTS idx_reviews_business ON reviews("businessId");

-- Insert admin user
INSERT INTO users (
    id,
    email,
    password,
    "firstName",
    "lastName",
    role,
    "isActive",
    "emailVerified",
    "createdAt",
    "updatedAt"
) VALUES (
    uuid_generate_v4(),
    'admin@bukki.com',
    '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', -- password: 'password'
    'Super',
    'Admin',
    'super_admin',
    true,
    true,
    NOW(),
    NOW()
) ON CONFLICT (email) DO NOTHING;

-- Business Members table (for employee invitations)
CREATE TABLE IF NOT EXISTS business_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "businessId" UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    "userId" UUID REFERENCES users(id) ON DELETE SET NULL,
    email VARCHAR(255) NOT NULL,
    status VARCHAR(20) DEFAULT 'invited' CHECK (status IN ('invited', 'active', 'removed')),
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP
);

-- Create indexes for business_members
CREATE INDEX IF NOT EXISTS idx_business_members_business ON business_members("businessId");
CREATE INDEX IF NOT EXISTS idx_business_members_user ON business_members("userId");
CREATE INDEX IF NOT EXISTS idx_business_members_email ON business_members(email);
CREATE INDEX IF NOT EXISTS idx_business_members_status ON business_members(status);

-- Verify tables were created
SELECT 'Tables created successfully!' as status;
SELECT COUNT(*) as user_count FROM users;
SELECT COUNT(*) as business_count FROM businesses;





