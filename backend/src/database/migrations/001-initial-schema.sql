-- Initial database schema for MultiBusiness Booking Platform

-- Create database (run this separately)
-- CREATE DATABASE booking_platform;

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    "firstName" VARCHAR(100) NOT NULL,
    "lastName" VARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    role VARCHAR(20) DEFAULT 'customer' CHECK (role IN ('customer', 'business_owner', 'super_admin')),
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
CREATE TABLE businesses (
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
CREATE TABLE services (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    price DECIMAL(10, 2) NOT NULL,
    duration INTEGER DEFAULT 30, -- in minutes
    "isActive" BOOLEAN DEFAULT true,
    images JSONB,
    "customFields" JSONB,
    "maxBookingsPerSlot" INTEGER DEFAULT 1,
    "advanceBookingDays" INTEGER DEFAULT 0,
    "cancellationHours" INTEGER DEFAULT 0,
    rating DECIMAL(3, 2) DEFAULT 0,
    "reviewCount" INTEGER DEFAULT 0,
    "bookingCount" INTEGER DEFAULT 0,
    "businessId" UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP
);

-- Bookings table
CREATE TABLE bookings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "appointmentDate" TIMESTAMP NOT NULL,
    "appointmentEndDate" TIMESTAMP NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN (
        'pending', 'confirmed', 'cancelled', 'completed', 'no_show'
    )),
    "paymentStatus" VARCHAR(20) DEFAULT 'pending' CHECK (paymentStatus IN (
        'pending', 'paid', 'failed', 'refunded'
    )),
    "totalAmount" DECIMAL(10, 2) NOT NULL,
    "customFieldValues" JSONB,
    notes TEXT,
    "qrCode" TEXT,
    "checkedInAt" TIMESTAMP,
    "cancelledAt" TIMESTAMP,
    "cancellationReason" VARCHAR(255),
    "reminderSentAt" TIMESTAMP,
    "paymentDetails" JSONB,
    "customerId" UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    "businessId" UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    "serviceId" UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_businesses_owner ON businesses("ownerId");
CREATE INDEX idx_businesses_category ON businesses(category);
CREATE INDEX idx_businesses_status ON businesses(status);
CREATE INDEX idx_businesses_location ON businesses(city, state);
CREATE INDEX idx_services_business ON services("businessId");
CREATE INDEX idx_bookings_customer ON bookings("customerId");
CREATE INDEX idx_bookings_business ON bookings("businessId");
CREATE INDEX idx_bookings_service ON bookings("serviceId");
CREATE INDEX idx_bookings_date ON bookings("appointmentDate");
CREATE INDEX idx_bookings_status ON bookings(status);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW."updatedAt" = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_businesses_updated_at BEFORE UPDATE ON businesses
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_services_updated_at BEFORE UPDATE ON services
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_bookings_updated_at BEFORE UPDATE ON bookings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
