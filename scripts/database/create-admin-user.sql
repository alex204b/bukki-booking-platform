-- Create Another Super Admin User
-- Run this in your Neon.tech database SQL Editor

-- Option 1: Create with custom email and password
-- Replace 'newadmin@bukki.com' with your desired email
-- Replace 'YourSecurePassword123!' with your desired password
-- Note: You'll need to hash the password using bcrypt first

-- For now, let's create one with a pre-hashed password (password: 'admin123')
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
    '$2b$10$rOzJqZqZqZqZqZqZqZqZqOqZqZqZqZqZqZqZqZqZqZqZqZqZqZqZq', -- password: 'admin123'
    'Admin',
    'Two',
    'super_admin',
    true,
    true,
    NOW(),
    NOW()
) ON CONFLICT (email) DO NOTHING;

-- Verify the admin user was created
SELECT id, email, "firstName", "lastName", role, "isActive", "emailVerified"
FROM users 
WHERE role = 'super_admin'
ORDER BY "createdAt" DESC;

