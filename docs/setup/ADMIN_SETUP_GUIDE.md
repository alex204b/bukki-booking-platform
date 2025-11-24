# 🔧 Admin Dashboard Setup Guide

## Quick Setup for Super Admin Access

### **Method 1: Database Direct Setup (Fastest)**

#### **Step 1: Get Database Access**
1. Go to **Render Dashboard**
2. Find your **backend service**
3. Click **"Environment"** tab
4. Copy the `DATABASE_URL`

#### **Step 2: Connect to Database**
**Using pgAdmin:**
1. Download pgAdmin from https://www.pgadmin.org/
2. Install and open pgAdmin
3. Right-click "Servers" → "Create" → "Server"
4. Enter connection details from DATABASE_URL
5. Click "Save"

#### **Step 3: Create Admin User**
Run this SQL in your database:

```sql
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
    '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
    'Super',
    'Admin',
    'super_admin',
    true,
    true,
    NOW(),
    NOW()
);
```

#### **Step 4: Login as Admin**
- **Email**: `admin@bukki.com`
- **Password**: `password`

### **Method 2: Through Application (If Available)**

1. **Go to your frontend URL**
2. **Register a new account**
3. **Look for role selection** during registration
4. **Select "Super Admin"** if available
5. **Complete registration**

### **Method 3: Backend API (Advanced)**

You can also create an admin user through the API:

```bash
curl -X POST https://bukki-booking-platform.onrender.com/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@bukki.com",
    "password": "password",
    "firstName": "Super",
    "lastName": "Admin",
    "role": "super_admin"
  }'
```

## **What You'll See in Admin Dashboard:**

### **Users Management:**
- View all registered users
- Activate/deactivate users
- View user profiles and activity

### **Businesses Management:**
- Approve/reject business applications
- View all business listings
- Manage business status

### **Bookings Overview:**
- All appointments across the platform
- Booking statistics
- Revenue reports

### **Analytics:**
- User growth
- Booking trends
- Popular services
- Revenue analytics

## **Admin Features Available:**
✅ **User Management** - View and manage all users  
✅ **Business Approval** - Approve/reject business applications  
✅ **Analytics Dashboard** - Platform statistics and trends  
✅ **Reports** - Generate various reports  
✅ **System Settings** - Platform configuration  

## **Next Steps:**
1. **Create the admin user** using one of the methods above
2. **Login with admin credentials**
3. **Explore the admin dashboard**
4. **View all your database data**

Your admin dashboard will give you full control over your booking platform! 🚀





