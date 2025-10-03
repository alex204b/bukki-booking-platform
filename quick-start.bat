@echo off
echo 🚀 MultiBusiness Booking Platform - Quick Start
echo ================================================

echo.
echo 📦 Installing dependencies...
call npm run install:all

echo.
echo 🗄️ Setting up database...
echo Please make sure PostgreSQL is running and create a database named 'booking_platform'
echo You can run the following SQL commands:
echo.
echo CREATE DATABASE booking_platform;
echo.
echo Then run the migration:
echo psql -U postgres -d booking_platform -f backend/src/database/migrations/001-initial-schema.sql
echo.

echo ⚙️ Setting up environment files...
if not exist "backend\.env" (
    copy "backend\env.example" "backend\.env"
    echo ✅ Created backend/.env file
    echo ⚠️  Please edit backend/.env with your database credentials
) else (
    echo ✅ backend/.env already exists
)

if not exist "frontend\.env" (
    echo REACT_APP_API_URL=http://localhost:3000 > "frontend\.env"
    echo ✅ Created frontend/.env file
) else (
    echo ✅ frontend/.env already exists
)

echo.
echo 🎉 Setup complete! 
echo.
echo Next steps:
echo 1. Edit backend/.env with your database credentials
echo 2. Run database migration (see instructions above)
echo 3. Start the application: npm run dev
echo.
echo The application will be available at:
echo - Frontend: http://localhost:3001
echo - Backend API: http://localhost:3000
echo - API Docs: http://localhost:3000/api
echo.
pause
