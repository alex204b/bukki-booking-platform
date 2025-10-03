-- Sample data for MultiBusiness Booking Platform

-- Insert sample users
INSERT INTO users (id, email, password, "firstName", "lastName", phone, role, "isActive") VALUES
('550e8400-e29b-41d4-a716-446655440001', 'admin@bookit.com', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4J/8KzKz2K', 'Super', 'Admin', '+1234567890', 'super_admin', true),
('550e8400-e29b-41d4-a716-446655440002', 'john@example.com', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4J/8KzKz2K', 'John', 'Doe', '+1234567891', 'customer', true),
('550e8400-e29b-41d4-a716-446655440003', 'jane@example.com', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4J/8KzKz2K', 'Jane', 'Smith', '+1234567892', 'customer', true),
('550e8400-e29b-41d4-a716-446655440004', 'salon@beauty.com', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4J/8KzKz2K', 'Maria', 'Garcia', '+1234567893', 'business_owner', true),
('550e8400-e29b-41d4-a716-446655440005', 'restaurant@food.com', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4J/8KzKz2K', 'Chef', 'Johnson', '+1234567894', 'business_owner', true);

-- Insert sample businesses
INSERT INTO businesses (id, name, description, category, address, city, state, "zipCode", country, latitude, longitude, phone, email, status, "ownerId", rating, "reviewCount") VALUES
('660e8400-e29b-41d4-a716-446655440001', 'Glamour Beauty Salon', 'Full-service beauty salon offering haircuts, styling, coloring, and spa treatments. Professional stylists with years of experience.', 'beauty_salon', '350 5th Ave', 'New York', 'NY', '10118', 'USA', 40.7484, -73.9857, '+1234567893', 'salon@beauty.com', 'approved', '550e8400-e29b-41d4-a716-446655440004', 4.8, 127),
('660e8400-e29b-41d4-a716-446655440002', 'Bella Vista Restaurant', 'Authentic Italian cuisine with a modern twist. Fresh ingredients, homemade pasta, and an extensive wine selection.', 'restaurant', '11 Times Sq', 'New York', 'NY', '10036', 'USA', 40.7557, -73.9873, '+1234567894', 'restaurant@food.com', 'approved', '550e8400-e29b-41d4-a716-446655440005', 4.6, 89),
('660e8400-e29b-41d4-a716-446655440003', 'Quick Fix Auto Repair', 'Professional auto repair services. Oil changes, brake repairs, engine diagnostics, and more. ASE certified technicians.', 'mechanic', '200 Cadman Plaza W', 'Brooklyn', 'NY', '11201', 'USA', 40.6943, -73.9910, '+1234567895', 'auto@repair.com', 'approved', '550e8400-e29b-41d4-a716-446655440004', 4.4, 56),
('660e8400-e29b-41d4-a716-446655440004', 'Perfect Fit Tailoring', 'Custom tailoring and alterations. Suits, dresses, formal wear, and everyday clothing. Quick turnaround times.', 'tailor', '86 Trinity Pl', 'New York', 'NY', '10006', 'USA', 40.7076, -74.0125, '+1234567896', 'tailor@fit.com', 'approved', '550e8400-e29b-41d4-a716-446655440005', 4.7, 43);

-- Insert sample services
INSERT INTO services (id, name, description, price, duration, "businessId", rating, "reviewCount", "bookingCount") VALUES
-- Beauty Salon Services
('770e8400-e29b-41d4-a716-446655440001', 'Haircut & Style', 'Professional haircut with styling and blow-dry', 65.00, 60, '660e8400-e29b-41d4-a716-446655440001', 4.9, 45, 12),
('770e8400-e29b-41d4-a716-446655440002', 'Hair Coloring', 'Full hair coloring service with consultation', 120.00, 120, '660e8400-e29b-41d4-a716-446655440001', 4.8, 32, 8),
('770e8400-e29b-41d4-a716-446655440003', 'Manicure & Pedicure', 'Complete nail care service', 85.00, 90, '660e8400-e29b-41d4-a716-446655440001', 4.7, 28, 15),

-- Restaurant Services
('770e8400-e29b-41d4-a716-446655440004', 'Dinner Reservation', 'Table reservation for dinner service', 0.00, 120, '660e8400-e29b-41d4-a716-446655440002', 4.6, 67, 25),
('770e8400-e29b-41d4-a716-446655440005', 'Private Dining', 'Private dining room for special occasions', 0.00, 180, '660e8400-e29b-41d4-a716-446655440002', 4.8, 12, 3),
('770e8400-e29b-41d4-a716-446655440006', 'Cooking Class', 'Learn to cook authentic Italian dishes', 95.00, 150, '660e8400-e29b-41d4-a716-446655440002', 4.9, 8, 2),

-- Auto Repair Services
('770e8400-e29b-41d4-a716-446655440007', 'Oil Change', 'Full synthetic oil change with filter', 45.00, 30, '660e8400-e29b-41d4-a716-446655440003', 4.5, 23, 18),
('770e8400-e29b-41d4-a716-446655440008', 'Brake Inspection', 'Complete brake system inspection and service', 89.00, 60, '660e8400-e29b-41d4-a716-446655440003', 4.6, 15, 7),
('770e8400-e29b-41d4-a716-446655440009', 'Engine Diagnostic', 'Computer diagnostic and engine check', 75.00, 45, '660e8400-e29b-41d4-a716-446655440003', 4.4, 18, 9),

-- Tailoring Services
('770e8400-e29b-41d4-a716-446655440010', 'Suit Alterations', 'Professional suit fitting and alterations', 45.00, 30, '660e8400-e29b-41d4-a716-446655440004', 4.8, 19, 11),
('770e8400-e29b-41d4-a716-446655440011', 'Dress Fitting', 'Custom dress fitting and adjustments', 35.00, 45, '660e8400-e29b-41d4-a716-446655440004', 4.7, 14, 6),
('770e8400-e29b-41d4-a716-446655440012', 'Custom Suit', 'Bespoke suit creation from scratch', 450.00, 300, '660e8400-e29b-41d4-a716-446655440004', 4.9, 10, 2);

-- Insert sample bookings
INSERT INTO bookings (id, "appointmentDate", "appointmentEndDate", status, "paymentStatus", "totalAmount", "customerId", "businessId", "serviceId", notes) VALUES
('880e8400-e29b-41d4-a716-446655440001', '2024-01-15 10:00:00', '2024-01-15 11:00:00', 'completed', 'paid', 65.00, '550e8400-e29b-41d4-a716-446655440002', '660e8400-e29b-41d4-a716-446655440001', '770e8400-e29b-41d4-a716-446655440001', 'First time customer, please be gentle with my hair'),
('880e8400-e29b-41d4-a716-446655440002', '2024-01-16 19:00:00', '2024-01-16 21:00:00', 'confirmed', 'paid', 0.00, '550e8400-e29b-41d4-a716-446655440003', '660e8400-e29b-41d4-a716-446655440002', '770e8400-e29b-41d4-a716-446655440004', 'Anniversary dinner, table for 2'),
('880e8400-e29b-41d4-a716-446655440003', '2024-01-17 09:00:00', '2024-01-17 09:30:00', 'pending', 'pending', 45.00, '550e8400-e29b-41d4-a716-446655440002', '660e8400-e29b-41d4-a716-446655440003', '770e8400-e29b-41d4-a716-446655440007', 'Regular maintenance'),
('880e8400-e29b-41d4-a716-446655440004', '2024-01-18 14:00:00', '2024-01-18 14:30:00', 'confirmed', 'paid', 45.00, '550e8400-e29b-41d4-a716-446655440003', '660e8400-e29b-41d4-a716-446655440004', '770e8400-e29b-41d4-a716-446655440010', 'Wedding suit alterations');

-- Update business working hours
UPDATE businesses SET "workingHours" = '{
  "monday": {"isOpen": true, "openTime": "09:00", "closeTime": "18:00"},
  "tuesday": {"isOpen": true, "openTime": "09:00", "closeTime": "18:00"},
  "wednesday": {"isOpen": true, "openTime": "09:00", "closeTime": "18:00"},
  "thursday": {"isOpen": true, "openTime": "09:00", "closeTime": "18:00"},
  "friday": {"isOpen": true, "openTime": "09:00", "closeTime": "18:00"},
  "saturday": {"isOpen": true, "openTime": "10:00", "closeTime": "16:00"},
  "sunday": {"isOpen": false}
}' WHERE category = 'beauty_salon';

UPDATE businesses SET "workingHours" = '{
  "monday": {"isOpen": true, "openTime": "11:00", "closeTime": "22:00"},
  "tuesday": {"isOpen": true, "openTime": "11:00", "closeTime": "22:00"},
  "wednesday": {"isOpen": true, "openTime": "11:00", "closeTime": "22:00"},
  "thursday": {"isOpen": true, "openTime": "11:00", "closeTime": "22:00"},
  "friday": {"isOpen": true, "openTime": "11:00", "closeTime": "23:00"},
  "saturday": {"isOpen": true, "openTime": "10:00", "closeTime": "23:00"},
  "sunday": {"isOpen": true, "openTime": "10:00", "closeTime": "21:00"}
}' WHERE category = 'restaurant';

UPDATE businesses SET "workingHours" = '{
  "monday": {"isOpen": true, "openTime": "08:00", "closeTime": "17:00"},
  "tuesday": {"isOpen": true, "openTime": "08:00", "closeTime": "17:00"},
  "wednesday": {"isOpen": true, "openTime": "08:00", "closeTime": "17:00"},
  "thursday": {"isOpen": true, "openTime": "08:00", "closeTime": "17:00"},
  "friday": {"isOpen": true, "openTime": "08:00", "closeTime": "17:00"},
  "saturday": {"isOpen": true, "openTime": "09:00", "closeTime": "15:00"},
  "sunday": {"isOpen": false}
}' WHERE category = 'mechanic';

UPDATE businesses SET "workingHours" = '{
  "monday": {"isOpen": true, "openTime": "09:00", "closeTime": "18:00"},
  "tuesday": {"isOpen": true, "openTime": "09:00", "closeTime": "18:00"},
  "wednesday": {"isOpen": true, "openTime": "09:00", "closeTime": "18:00"},
  "thursday": {"isOpen": true, "openTime": "09:00", "closeTime": "18:00"},
  "friday": {"isOpen": true, "openTime": "09:00", "closeTime": "18:00"},
  "saturday": {"isOpen": true, "openTime": "10:00", "closeTime": "16:00"},
  "sunday": {"isOpen": false}
}' WHERE category = 'tailor';
