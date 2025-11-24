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
  
  // Generate 30-minute slots throughout the working day
  let currentTime = new Date(startTime);
  
  while (currentTime < endTime) {
    const slotEnd = new Date(currentTime.getTime() + serviceDuration * 60000);
    
    slots.push({
      time: new Date(currentTime),
      available: true,
    });
    
    // Move to next 30-minute slot
    currentTime = new Date(currentTime.getTime() + 30 * 60000);
  }
  
  return slots;
}

// Test with 28-minute service
const slots = generateTimeSlots(businessHoursData, 28);
console.log('\nGenerated', slots.length, 'slots:');
slots.forEach(slot => {
  console.log(slot.time.toLocaleTimeString());
});

// Expected: Should generate slots from 09:00 to 16:30 (every 30 minutes)
// That's: 09:00, 09:30, 10:00, 10:30, 11:00, 11:30, 12:00, 12:30, 13:00, 13:30, 14:00, 14:30, 15:00, 15:30, 16:00, 16:30
// Total: 16 slots
