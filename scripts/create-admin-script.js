// Admin User Creation Script
// Run this in your browser console on your frontend application

// First, let's check if we can access the backend
console.log('Checking backend status...');

fetch('https://bukki-booking-platform.onrender.com/')
  .then(response => {
    console.log('Backend status:', response.status);
    return response.text();
  })
  .then(data => {
    console.log('Backend response:', data);
    
    // If backend is working, try to create admin user
    if (data.includes('MultiBusiness Booking Platform API')) {
      console.log('Backend is working, attempting to create admin user...');
      
      // Try with minimal data first
      return fetch('https://bukki-booking-platform.onrender.com/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: 'admin@bukki.com',
          password: 'password',
          firstName: 'Super',
          lastName: 'Admin'
        })
      });
    } else {
      throw new Error('Backend not responding properly');
    }
  })
  .then(response => {
    console.log('Registration response status:', response.status);
    return response.json();
  })
  .then(data => {
    console.log('Registration response:', data);
    if (data.statusCode === 201 || data.statusCode === 200) {
      console.log('✅ Admin user created successfully!');
      console.log('You can now login with: admin@bukki.com / password');
    } else {
      console.error('❌ Failed to create admin user:', data.message);
    }
  })
  .catch(error => {
    console.error('❌ Error:', error);
    console.log('Backend might be down or having issues. Check Render logs.');
  });





