// Test script to verify time slot generation
const businessHoursData = {
  "monday": {"isOpen": true, "openTime": "09:00", "closeTime": "17:00"},
  "tuesday": {"isOpen": true, "openTime": "09:00", "closeTime": "17:00"},
  "wednesday": {"isOpen": true, "openTime": "09:00", "closeTime": "17:00"},
  "thursday": {"isOpen": true, "openTime": "09:00", "closeTime": "17:00"},
  "friday": {"isOpen": true, "openTime": "09:00", "closeTime": "17:00"},
  "saturday": {"isOpen": false},
  "sunday": {"isOpen": false}
};

function generateTimeSlots(workingHours, serviceDuration) {
  const slots = [];
  const selectedDate = new Date('2025-10-30'); // Thursday
  const dayOfWeek = selectedDate.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
  
  const workingHoursForDay = workingHours[dayOfWeek];
  if (!workingHoursForDay || !workingHoursForDay.isOpen) {
    return [];
  }
  
  // Parse working hours
  const openTimeParts = workingHoursForDay.openTime.split(':');
  const closeTimeParts = workingHoursForDay.closeTime.split(':');
  
  const openHour = parseInt(openTimeParts[0], 10);
  const openMinute = parseInt(openTimeParts[1] || '0', 10);
  const closeHour = parseInt(closeTimeParts[0], 10);
  const closeMinute = parseInt(closeTimeParts[1] || '0', 10);
  
  const startTime = new Date(selectedDate);
  startTime.setHours(openHour, openMinute, 0, 0);
  
  const endTime = new Date(selectedDate);
  endTime.setHours(closeHour, closeMinute, 0, 0);
  
  console.log('Start time:', startTime.toLocaleTimeString());
  console.log('End time:', endTime.toLocaleTimeString());
  console.log('Service duration:', serviceDuration, 'minutes');
  
  // Generate slots based on service duration
  let currentTime = new Date(startTime);
  
  while (currentTime < endTime) {
    slots.push({
      time: new Date(currentTime),
      available: true,
    });
    
    // Move to next slot based on service duration
    currentTime = new Date(currentTime.getTime() + serviceDuration * 60000);
  }
  
  return slots;
}

// Test with 14-minute service (like a haircut)
const slots = generateTimeSlots(businessHoursData, 14);
console.log('\nGenerated', slots.length, 'slots for 14-minute service:');
slots.forEach(slot => {
  console.log(slot.time.toLocaleTimeString());
});

// Expected: Should generate slots based on service duration (every 14 minutes)
// Example: 09:00, 09:14, 09:28, 09:42, 09:56, 10:10, 10:24, etc.
console.log('\n---');

// Test with 28-minute service
const slots28 = generateTimeSlots(businessHoursData, 28);
console.log('\nGenerated', slots28.length, 'slots for 28-minute service:');
slots28.slice(0, 10).forEach(slot => {
  console.log(slot.time.toLocaleTimeString());
});
console.log('...');

// Expected: Should generate slots based on service duration (every 28 minutes)
// Example: 09:00, 09:28, 09:56, 10:24, 10:52, etc.
