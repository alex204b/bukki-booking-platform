-- Insert sample businesses for testing
-- This script will add sample businesses with coordinates to test the map functionality

-- First, let's check if we have any users to assign as business owners
-- If not, we'll create a test user first

-- Insert a test business owner user (if not exists)
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
    'test-business@bukki.com',
    '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', -- password: 'password'
    'Test',
    'Business Owner',
    'business_owner',
    true,
    true,
    NOW(),
    NOW()
) ON CONFLICT (email) DO NOTHING;

-- Get the test user ID for business assignment
-- Insert sample businesses with coordinates
INSERT INTO businesses (
    id,
    name,
    description,
    category,
    address,
    city,
    state,
    "zipCode",
    country,
    latitude,
    longitude,
    phone,
    email,
    website,
    status,
    "workingHours",
    "customBookingFields",
    rating,
    "reviewCount",
    "isActive",
    "onboardingCompleted",
    "ownerId",
    "createdAt",
    "updatedAt"
) VALUES 
-- Beauty Salon in Bucharest
(
    uuid_generate_v4(),
    'Elegant Beauty Salon',
    'Professional beauty services including haircuts, styling, coloring, and nail care. We provide a relaxing atmosphere with experienced stylists.',
    'beauty_salon',
    'Calea Victoriei 12',
    'Bucharest',
    'Bucharest',
    '010061',
    'Romania',
    44.4268,
    26.1025,
    '+40 21 123 4567',
    'info@elegantbeauty.ro',
    'https://elegantbeauty.ro',
    'approved',
    '{"monday":{"isOpen":true,"openTime":"09:00","closeTime":"18:00"},"tuesday":{"isOpen":true,"openTime":"09:00","closeTime":"18:00"},"wednesday":{"isOpen":true,"openTime":"09:00","closeTime":"18:00"},"thursday":{"isOpen":true,"openTime":"09:00","closeTime":"18:00"},"friday":{"isOpen":true,"openTime":"09:00","closeTime":"19:00"},"saturday":{"isOpen":true,"openTime":"10:00","closeTime":"16:00"},"sunday":{"isOpen":false}}',
    '[]',
    4.5,
    23,
    true,
    true,
    (SELECT id FROM users WHERE email = 'test-business@bukki.com'),
    NOW(),
    NOW()
),

-- Restaurant in Bucharest
(
    uuid_generate_v4(),
    'Casa Doina Restaurant',
    'Traditional Romanian cuisine in an elegant setting. Experience authentic flavors with modern presentation.',
    'restaurant',
    'Strada Doina 2',
    'Bucharest',
    'Bucharest',
    '010464',
    'Romania',
    44.4355,
    26.1025,
    '+40 21 234 5678',
    'reservations@casadoina.ro',
    'https://casadoina.ro',
    'approved',
    '{"monday":{"isOpen":true,"openTime":"12:00","closeTime":"23:00"},"tuesday":{"isOpen":true,"openTime":"12:00","closeTime":"23:00"},"wednesday":{"isOpen":true,"openTime":"12:00","closeTime":"23:00"},"thursday":{"isOpen":true,"openTime":"12:00","closeTime":"23:00"},"friday":{"isOpen":true,"openTime":"12:00","closeTime":"24:00"},"saturday":{"isOpen":true,"openTime":"12:00","closeTime":"24:00"},"sunday":{"isOpen":true,"openTime":"12:00","closeTime":"22:00"}}',
    '[]',
    4.8,
    156,
    true,
    true,
    (SELECT id FROM users WHERE email = 'test-business@bukki.com'),
    NOW(),
    NOW()
),

-- Fitness Center in Bucharest
(
    uuid_generate_v4(),
    'FitLife Gym',
    'Modern fitness center with state-of-the-art equipment, personal training, and group classes. Achieve your fitness goals with us!',
    'fitness',
    'Bulevardul Magheru 28-30',
    'Bucharest',
    'Bucharest',
    '010325',
    'Romania',
    44.4418,
    26.0955,
    '+40 21 345 6789',
    'info@fitlifegym.ro',
    'https://fitlifegym.ro',
    'approved',
    '{"monday":{"isOpen":true,"openTime":"06:00","closeTime":"22:00"},"tuesday":{"isOpen":true,"openTime":"06:00","closeTime":"22:00"},"wednesday":{"isOpen":true,"openTime":"06:00","closeTime":"22:00"},"thursday":{"isOpen":true,"openTime":"06:00","closeTime":"22:00"},"friday":{"isOpen":true,"openTime":"06:00","closeTime":"22:00"},"saturday":{"isOpen":true,"openTime":"08:00","closeTime":"20:00"},"sunday":{"isOpen":true,"openTime":"08:00","closeTime":"20:00"}}',
    '[]',
    4.3,
    89,
    true,
    true,
    (SELECT id FROM users WHERE email = 'test-business@bukki.com'),
    NOW(),
    NOW()
),

-- Mechanic Shop in Bucharest
(
    uuid_generate_v4(),
    'AutoFix Service',
    'Professional automotive repair and maintenance services. We specialize in all car brands with certified mechanics.',
    'mechanic',
    'Șoseaua Colentina 21',
    'Bucharest',
    'Bucharest',
    '020755',
    'Romania',
    44.4500,
    26.1200,
    '+40 21 456 7890',
    'service@autofix.ro',
    'https://autofix.ro',
    'approved',
    '{"monday":{"isOpen":true,"openTime":"08:00","closeTime":"18:00"},"tuesday":{"isOpen":true,"openTime":"08:00","closeTime":"18:00"},"wednesday":{"isOpen":true,"openTime":"08:00","closeTime":"18:00"},"thursday":{"isOpen":true,"openTime":"08:00","closeTime":"18:00"},"friday":{"isOpen":true,"openTime":"08:00","closeTime":"18:00"},"saturday":{"isOpen":true,"openTime":"09:00","closeTime":"14:00"},"sunday":{"isOpen":false}}',
    '[]',
    4.6,
    67,
    true,
    true,
    (SELECT id FROM users WHERE email = 'test-business@bukki.com'),
    NOW(),
    NOW()
),

-- Tailor Shop in Bucharest
(
    uuid_generate_v4(),
    'Master Tailor Studio',
    'Custom tailoring and alterations for men and women. Professional fitting services for suits, dresses, and formal wear.',
    'tailor',
    'Strada Lipscani 55',
    'Bucharest',
    'Bucharest',
    '030031',
    'Romania',
    44.4300,
    26.1000,
    '+40 21 567 8901',
    'info@mastertailor.ro',
    'https://mastertailor.ro',
    'approved',
    '{"monday":{"isOpen":true,"openTime":"10:00","closeTime":"19:00"},"tuesday":{"isOpen":true,"openTime":"10:00","closeTime":"19:00"},"wednesday":{"isOpen":true,"openTime":"10:00","closeTime":"19:00"},"thursday":{"isOpen":true,"openTime":"10:00","closeTime":"19:00"},"friday":{"isOpen":true,"openTime":"10:00","closeTime":"19:00"},"saturday":{"isOpen":true,"openTime":"10:00","closeTime":"16:00"},"sunday":{"isOpen":false}}',
    '[]',
    4.7,
    34,
    true,
    true,
    (SELECT id FROM users WHERE email = 'test-business@bukki.com'),
    NOW(),
    NOW()
);

-- Insert sample services for each business
-- Services for Elegant Beauty Salon
INSERT INTO services (
    id,
    name,
    description,
    price,
    duration,
    "businessId",
    "isActive",
    "createdAt",
    "updatedAt"
) VALUES 
(
    uuid_generate_v4(),
    'Haircut & Style',
    'Professional haircut with styling and blow-dry',
    150.00,
    60,
    (SELECT id FROM businesses WHERE name = 'Elegant Beauty Salon'),
    true,
    NOW(),
    NOW()
),
(
    uuid_generate_v4(),
    'Hair Coloring',
    'Full hair coloring service with premium products',
    300.00,
    120,
    (SELECT id FROM businesses WHERE name = 'Elegant Beauty Salon'),
    true,
    NOW(),
    NOW()
),
(
    uuid_generate_v4(),
    'Manicure & Pedicure',
    'Complete nail care service',
    200.00,
    90,
    (SELECT id FROM businesses WHERE name = 'Elegant Beauty Salon'),
    true,
    NOW(),
    NOW()
);

-- Services for Casa Doina Restaurant
INSERT INTO services (
    id,
    name,
    description,
    price,
    duration,
    "businessId",
    "isActive",
    "createdAt",
    "updatedAt"
) VALUES 
(
    uuid_generate_v4(),
    'Dinner Reservation',
    'Table reservation for dinner service',
    0.00,
    120,
    (SELECT id FROM businesses WHERE name = 'Casa Doina Restaurant'),
    true,
    NOW(),
    NOW()
),
(
    uuid_generate_v4(),
    'Private Dining',
    'Private dining room for special occasions',
    0.00,
    180,
    (SELECT id FROM businesses WHERE name = 'Casa Doina Restaurant'),
    true,
    NOW(),
    NOW()
),
(
    uuid_generate_v4(),
    'Cooking Class',
    'Learn traditional Romanian cooking',
    250.00,
    150,
    (SELECT id FROM businesses WHERE name = 'Casa Doina Restaurant'),
    true,
    NOW(),
    NOW()
);

-- Services for FitLife Gym
INSERT INTO services (
    id,
    name,
    description,
    price,
    duration,
    "businessId",
    "isActive",
    "createdAt",
    "updatedAt"
) VALUES 
(
    uuid_generate_v4(),
    'Personal Training Session',
    'One-on-one personal training with certified trainer',
    200.00,
    60,
    (SELECT id FROM businesses WHERE name = 'FitLife Gym'),
    true,
    NOW(),
    NOW()
),
(
    uuid_generate_v4(),
    'Group Fitness Class',
    'Group fitness class (yoga, pilates, spinning)',
    50.00,
    45,
    (SELECT id FROM businesses WHERE name = 'FitLife Gym'),
    true,
    NOW(),
    NOW()
),
(
    uuid_generate_v4(),
    'Nutrition Consultation',
    'Personalized nutrition plan consultation',
    150.00,
    60,
    (SELECT id FROM businesses WHERE name = 'FitLife Gym'),
    true,
    NOW(),
    NOW()
);

-- Services for AutoFix Service
INSERT INTO services (
    id,
    name,
    description,
    price,
    duration,
    "businessId",
    "isActive",
    "createdAt",
    "updatedAt"
) VALUES 
(
    uuid_generate_v4(),
    'Oil Change Service',
    'Complete oil change with filter replacement',
    180.00,
    30,
    (SELECT id FROM businesses WHERE name = 'AutoFix Service'),
    true,
    NOW(),
    NOW()
),
(
    uuid_generate_v4(),
    'Brake Inspection',
    'Complete brake system inspection and service',
    350.00,
    60,
    (SELECT id FROM businesses WHERE name = 'AutoFix Service'),
    true,
    NOW(),
    NOW()
),
(
    uuid_generate_v4(),
    'Engine Diagnostic',
    'Computer diagnostic and engine check',
    120.00,
    45,
    (SELECT id FROM businesses WHERE name = 'AutoFix Service'),
    true,
    NOW(),
    NOW()
);

-- Services for Master Tailor Studio
INSERT INTO services (
    id,
    name,
    description,
    price,
    duration,
    "businessId",
    "isActive",
    "createdAt",
    "updatedAt"
) VALUES 
(
    uuid_generate_v4(),
    'Suit Alterations',
    'Professional suit fitting and alterations',
    200.00,
    30,
    (SELECT id FROM businesses WHERE name = 'Master Tailor Studio'),
    true,
    NOW(),
    NOW()
),
(
    uuid_generate_v4(),
    'Dress Fitting',
    'Custom dress fitting and adjustments',
    150.00,
    45,
    (SELECT id FROM businesses WHERE name = 'Master Tailor Studio'),
    true,
    NOW(),
    NOW()
),
(
    uuid_generate_v4(),
    'Custom Suit',
    'Complete custom suit creation',
    2500.00,
    300,
    (SELECT id FROM businesses WHERE name = 'Master Tailor Studio'),
    true,
    NOW(),
    NOW()
);

-- Verify the data was inserted
SELECT 'Sample businesses and services inserted successfully!' as status;
SELECT COUNT(*) as business_count FROM businesses;
SELECT COUNT(*) as service_count FROM services;
SELECT COUNT(*) as user_count FROM users;
