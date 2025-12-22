-- Create Another Admin User - Simple SQL Script
-- Run this in your Neon.tech SQL Editor
-- 
-- This creates an admin with:
-- Email: admin2@bukki.com
-- Password: admin123
-- 
-- To customize, change the email and generate a new password hash
-- You can use the create-admin.js script to generate a proper hash

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
    gen_random_uuid(),
    'admin2@bukki.com',
    '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4J/8KzKz2K', -- password: 'admin123'
    'Admin',
    'Two',
    'super_admin',
    true,
    true,
    NOW(),
    NOW()
) ON CONFLICT (email) DO NOTHING;

-- Verify the admin was created
SELECT 
    id, 
    email, 
    "firstName", 
    "lastName", 
    role, 
    "isActive", 
    "emailVerified",
    "createdAt"
FROM users 
WHERE role = 'super_admin'
ORDER BY "createdAt" DESC;

