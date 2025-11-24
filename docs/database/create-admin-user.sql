-- Create Super Admin User
-- Run this in your database to create an admin user

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
    'admin@bukki.com',
    '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', -- password: 'password'
    'Super',
    'Admin',
    'super_admin',
    true,
    true,
    NOW(),
    NOW()
);

-- Verify the user was created
SELECT id, email, "firstName", "lastName", role, "isActive" FROM users WHERE role = 'super_admin';





