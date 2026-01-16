import React, { useState, useRef, useEffect } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
// FullCalendar CSS - using CDN link in index.html or inline styles
import { format, addDays, isToday } from 'date-fns';
import { Search } from 'lucide-react';
import toast from 'react-hot-toast';
import { CreateBookingModal } from './CreateBookingModal';
import { useAuth } from '../contexts/AuthContext';

interface Booking {
  id: string;
  appointmentDate: string;
  appointmentEndDate: string;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'no_show';
  notes?: string;
  business: {
    id: string;
    name: string;
    category: string;
    address?: string;
    phone?: string;
    logo?: string;
  };
  service: {
    id: string;
    name: string;
    duration: number;
  };
}

interface EnhancedCalendarViewProps {
  bookings: Booking[];
  onCancelBooking: (bookingId: string) => void;
  onReschedule?: (bookingId: string, newDate: string) => Promise<void>;
  onBookingClick?: (booking: Booking) => void;
}

// Service type color mapping
const getServiceColor = (category: string, status: string): string => {
  // Status-based opacity
  const opacity = status === 'cancelled' ? '40' : status === 'completed' ? '60' : '100';
  
  // All bookings use #E7001E
  const baseColor = '#E7001E';
  return `${baseColor}${opacity}`;
};

export const EnhancedCalendarView: React.FC<EnhancedCalendarViewProps> = ({
  bookings,
  onCancelBooking,
  onReschedule,
  onBookingClick,
}) => {
  const { user } = useAuth();
  const calendarRef = useRef<FullCalendar>(null);
  const [currentView, setCurrentView] = useState<'timeGridWeek' | 'dayGridMonth' | 'timeGridDay'>('timeGridWeek');
  const [showCreateBooking, setShowCreateBooking] = useState(false);
  const [selectedSlotDate, setSelectedSlotDate] = useState<Date>(new Date());
  const [businessId, setBusinessId] = useState<string>('');
  
  // Detect if user is a business owner and get their business ID
  const isBusinessOwner = user?.role === 'business_owner' || user?.role === 'employee';
  
  useEffect(() => {
    const fetchBusinessId = async () => {
      if (!isBusinessOwner) return;

      // Try to get business ID from bookings first
      if (bookings && bookings.length > 0) {
        const firstBooking = bookings[0];
        if (firstBooking.business?.id) {
          setBusinessId(firstBooking.business.id);
          return;
        }
      }

      // If no bookings, fetch from user's business profile
      try {
        const response = await fetch('/api/businesses/my-business', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
          },
        });
        
        if (response.ok) {
          const business = await response.json();
          if (business?.id) {
            setBusinessId(business.id);
          }
        }
      } catch (error) {
        console.error('Error fetching business ID:', error);
      }
    };

    fetchBusinessId();
  }, [bookings, isBusinessOwner]);
  
  // Update calendar view when currentView changes
  useEffect(() => {
    if (calendarRef.current) {
      const calendarApi = calendarRef.current.getApi();
      calendarApi.changeView(currentView);
    }
  }, [currentView]);

  // Convert bookings to FullCalendar events
  const events = bookings.map(booking => {
    const start = new Date(booking.appointmentDate);
    const end = new Date(booking.appointmentEndDate || new Date(start.getTime() + booking.service.duration * 60000));
    const color = getServiceColor(booking.business.category, booking.status);
    
    return {
      id: booking.id,
      title: booking.service.name,
      start: start.toISOString(),
      end: end.toISOString(),
      backgroundColor: color,
      borderColor: color,
      textColor: '#ffffff',
      extendedProps: {
        business: booking.business,
        service: booking.service,
        status: booking.status,
        notes: booking.notes,
      },
    };
  });

  // Custom event content with business logo
  const renderEventContent = (eventInfo: any) => {
    const { business, status } = eventInfo.event.extendedProps;
    const isCancelled = status === 'cancelled';
    
    return (
      <div className={`flex items-center gap-1 p-1 rounded overflow-hidden ${isCancelled ? 'opacity-50' : ''}`}>
        {business.logo ? (
          <img 
            src={business.logo} 
            alt={business.name}
            className="w-4 h-4 rounded-full object-cover flex-shrink-0"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
        ) : (
          <div 
            className="w-4 h-4 rounded-full flex-shrink-0"
            style={{ backgroundColor: getServiceColor(business.category, status) }}
          />
        )}
        <div className="flex-1 min-w-0">
          <div className="text-xs font-semibold truncate">{eventInfo.timeText}</div>
          <div className="text-xs truncate">{eventInfo.event.title}</div>
          <div className="text-xs opacity-75 truncate">{business.name}</div>
        </div>
      </div>
    );
  };

  // Handle event click
  const handleEventClick = (clickInfo: any) => {
    const { business, service, status, notes } = clickInfo.event.extendedProps;
    const booking: Booking = {
      id: clickInfo.event.id,
      appointmentDate: clickInfo.event.start.toISOString(),
      appointmentEndDate: clickInfo.event.end?.toISOString() || new Date(clickInfo.event.start.getTime() + service.duration * 60000).toISOString(),
      status: status as any,
      notes,
      business,
      service,
    };
    
    // If onBookingClick is provided, use it (for modal display)
    if (onBookingClick) {
      console.log('[Calendar] Opening booking modal for:', booking.id);
      onBookingClick(booking);
      return; // Prevent default behavior
    } else {
      // Fallback to old behavior
      const start = format(new Date(clickInfo.event.start), 'MMM d, yyyy h:mm a');
      const message = `
Service: ${service.name}
Business: ${business.name}
Date: ${start}
Duration: ${service.duration} minutes
Status: ${status}
${notes ? `Notes: ${notes}` : ''}
      `.trim();
      
      if (window.confirm(message + '\n\nWould you like to cancel this booking?')) {
        onCancelBooking(clickInfo.event.id);
      }
    }
  };

  // Handle drag to reschedule
  const handleEventDrop = async (dropInfo: any) => {
    const bookingId = dropInfo.event.id;
    const newStart = dropInfo.event.start;
    
    if (onReschedule) {
      try {
        await onReschedule(bookingId, newStart.toISOString());
        toast.success('Booking rescheduled successfully!');
      } catch (error: any) {
        toast.error(error.response?.data?.message || 'Failed to reschedule booking');
        dropInfo.revert(); // Revert the drag if it fails
      }
    } else {
      toast.error('Rescheduling is not available');
      dropInfo.revert();
    }
  };

  // Jump to next open slot
  const jumpToNextOpenSlot = () => {
    const today = new Date();
    const nextWeek = addDays(today, 7);
    
    if (calendarRef.current) {
      const calendarApi = calendarRef.current.getApi();
      calendarApi.gotoDate(nextWeek);
      toast.success('Jumped to next week');
    }
  };

  // Navigate to today
  const goToToday = () => {
    if (calendarRef.current) {
      calendarRef.current.getApi().today();
      toast.success('Jumped to today');
    }
  };

  // Handle slot click (for business owners to create bookings)
  const handleDateClick = (info: any) => {
    if (!isBusinessOwner) {
      return; // Only business owners can create bookings
    }

    if (!businessId) {
      toast.error('Business ID not found. Please ensure you have at least one booking.');
      return;
    }

    // Just get the start time - end time will be calculated based on selected service
    const startDate = new Date(info.dateStr);
    setSelectedSlotDate(startDate);
    setShowCreateBooking(true);
  };

  // Handle booking created
  const handleBookingCreated = () => {
    // Refresh the page to show new booking
    window.location.reload();
  };

  return (
    <div className="h-full flex flex-col space-y-2 relative pr-2 pb-2">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between bg-white p-2 rounded-lg shadow-sm border border-[#E7001E] flex-shrink-0 gap-2">
        {/* Hint for business owners */}
        {isBusinessOwner && businessId && (
          <div className="text-xs text-gray-600 bg-green-50 border border-green-200 px-3 py-1 rounded-md w-full sm:w-auto">
            💡 Click on a time slot, select a service, and the duration is calculated automatically
          </div>
        )}
        
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCurrentView('timeGridDay')}
            className={`px-2 py-1 text-xs sm:text-sm rounded-md transition-colors ${
              currentView === 'timeGridDay'
                ? 'bg-[#E7001E] text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Day
          </button>
          <button
            onClick={() => setCurrentView('timeGridWeek')}
            className={`px-2 py-1 text-xs sm:text-sm rounded-md transition-colors ${
              currentView === 'timeGridWeek'
                ? 'bg-[#E7001E] text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Week
          </button>
          <button
            onClick={() => setCurrentView('dayGridMonth')}
            className={`px-2 py-1 text-xs sm:text-sm rounded-md transition-colors ${
              currentView === 'dayGridMonth'
                ? 'bg-[#E7001E] text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Month
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={goToToday}
            className="px-2 py-1 text-xs sm:text-sm bg-red-100 text-red-700 rounded-md hover:bg-red-200 transition-colors"
          >
            Today
          </button>
          <button
            onClick={jumpToNextOpenSlot}
            className="px-2 py-1 text-xs sm:text-sm bg-green-100 text-green-700 rounded-md hover:bg-green-200 transition-colors flex items-center gap-1"
          >
            <Search className="h-3 w-3 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">Next Open Slot</span>
            <span className="sm:hidden">Next</span>
          </button>
        </div>
      </div>

      {/* FullCalendar */}
      <div className="bg-white rounded-lg shadow-sm border border-[#E7001E] p-2 flex-1 min-h-0">
        <FullCalendar
          ref={calendarRef}
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
          initialView="timeGridWeek"
          events={events}
          editable={!!onReschedule}
          selectable={false}
          dateClick={handleDateClick}
          eventDrop={handleEventDrop}
          eventClick={handleEventClick}
          eventContent={renderEventContent}
          headerToolbar={false}
          height="100%"
          slotDuration="00:15:00"
          slotLabelInterval="00:30"
          slotMinTime="06:00:00"
          slotMaxTime="22:00:00"
          allDaySlot={false}
          dayHeaderFormat={{ weekday: 'short' }}
          eventDisplay="block"
          eventTimeFormat={{
            hour: 'numeric',
            minute: '2-digit',
            meridiem: 'short',
          }}
          nowIndicator={true}
          dayCellClassNames={(arg) => 
            isToday(arg.date) ? 'bg-red-50' : ''
          }
        />
        <style>{`
          .fc-timegrid-col.fc-day-today .fc-timegrid-col-frame {
            background-color: rgb(254 242 242) !important;
          }
          .fc-daygrid-day.fc-day-today {
            background-color: rgb(254 242 242) !important;
          }
          .fc-event {
            background-color: #E7001E !important;
            border-color: #E7001E !important;
          }
          .fc-event .fc-event-title {
            color: #ffffff !important;
          }
          .fc-event-main {
            background-color: #E7001E !important;
          }
          ${isBusinessOwner && businessId ? `
          .fc-timegrid-slot:hover,
          .fc-daygrid-day:hover {
            background-color: rgba(231, 0, 30, 0.05) !important;
            cursor: pointer;
          }
          .fc-timegrid-slot-label:hover {
            cursor: pointer;
          }
          ` : ''}
        `}</style>
      </div>

      {/* Create Booking Modal (only for business owners) */}
      {isBusinessOwner && (
        <CreateBookingModal
          isOpen={showCreateBooking}
          onClose={() => setShowCreateBooking(false)}
          selectedDate={selectedSlotDate}
          businessId={businessId}
          onBookingCreated={handleBookingCreated}
        />
      )}
    </div>
  );
};

