import React, { useState, useRef, useEffect } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
// FullCalendar CSS - using CDN link in index.html or inline styles
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { format, isToday } from 'date-fns';
import toast from 'react-hot-toast';
import { CreateBookingModal } from './CreateBookingModal';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../services/api';

export type CalendarViewType = 'timeGridDay' | 'timeGridWeek' | 'dayGridMonth';

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

export interface EnhancedCalendarViewProps {
  bookings: Booking[];
  onCancelBooking: (bookingId: string) => void;
  onReschedule?: (bookingId: string, newDate: string) => Promise<void>;
  onBookingClick?: (booking: Booking) => void;
  /** Controlled view: when provided, parent controls Day/Week/Month */
  currentView?: CalendarViewType;
  onViewChange?: (view: CalendarViewType) => void;
  /** Optional initial date to show (e.g. when deep-linking to a booking) */
  initialDate?: string | Date;
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
  currentView: controlledView,
  onViewChange,
  initialDate,
}) => {
  const { user } = useAuth();
  const calendarRef = useRef<FullCalendar>(null);
  const [internalView, setInternalView] = useState<CalendarViewType>('timeGridWeek');
  const currentView = controlledView ?? internalView;
  const setCurrentView = onViewChange ?? setInternalView;

  const [showCreateBooking, setShowCreateBooking] = useState(false);
  const [selectedSlotDate, setSelectedSlotDate] = useState<Date>(new Date());
  const [businessId, setBusinessId] = useState<string>('');
  const [viewTitle, setViewTitle] = useState<string>('');
  
  // Detect if user is a business owner and get their business ID
  const isBusinessOwner = user?.role === 'business_owner' || user?.role === 'employee';
  
  useEffect(() => {
    const fetchBusinessId = async () => {
      if (!isBusinessOwner) return;

      // ALWAYS fetch from user's OWN business profile (not from bookings!)
      // Bookings array might contain bookings from OTHER businesses
      try {
        console.log('[EnhancedCalendarView] Fetching business profile...');
        const response = await api.get('/businesses/my-business');
        
        console.log('[EnhancedCalendarView] Business response:', response.data);
        
        if (response.data?.id) {
          console.log('[EnhancedCalendarView] ✅ Using YOUR business ID:', response.data.id);
          setBusinessId(response.data.id);
        } else {
          console.error('[EnhancedCalendarView] ❌ No business ID in response');
          toast.error('No business profile found. Please complete business onboarding.');
        }
      } catch (error: any) {
        console.error('[EnhancedCalendarView] ❌ Error fetching business ID:', error);
        console.error('[EnhancedCalendarView] Error response:', error.response?.data);
        
        if (error.response?.status === 404) {
          toast.error('Business profile not found. Please complete business onboarding first.');
        } else {
          toast.error('Could not load business profile. Please refresh the page.');
        }
      }
    };

    fetchBusinessId();
  }, [isBusinessOwner]);
  
  // Update calendar view when currentView changes
  useEffect(() => {
    if (calendarRef.current) {
      // Use setTimeout to defer the changeView call outside of React's render cycle
      // This prevents the flushSync warning
      const timer = setTimeout(() => {
        const calendarApi = calendarRef.current?.getApi();
        if (calendarApi) {
          calendarApi.changeView(currentView);
        }
      }, 0);
      
      return () => clearTimeout(timer);
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

  // Handle slot click (for business owners to create bookings)
  const handleDateClick = (info: any) => {
    if (!isBusinessOwner) {
      return; // Only business owners can create bookings
    }

    // If we're in month view, switch to day view for the clicked date
    if (currentView === 'dayGridMonth') {
      const clickedDate = new Date(info.dateStr);
      
      // Update state and change view + navigate in one operation
      setCurrentView('timeGridDay');
      
      // Navigate to the clicked date and change view
      // The changeView can take a date as second parameter to navigate and change view at once
      setTimeout(() => {
        const calendarApi = calendarRef.current?.getApi();
        if (calendarApi) {
          // Change view to day and navigate to the clicked date in one call
          calendarApi.changeView('timeGridDay', clickedDate);
        }
      }, 50);
      
      return;
    }

    // For week and day views, open the booking modal
    if (!businessId) {
      console.error('[EnhancedCalendarView] ❌ businessId is not set!');
      toast.error('Loading business profile... Please wait a moment and try again.');
      
      // Try to fetch business ID again using api instance
      api.get('/businesses/my-business')
        .then(response => {
          if (response.data?.id) {
            console.log('[EnhancedCalendarView] ✅ Business ID loaded:', response.data.id);
            setBusinessId(response.data.id);
            toast.success('Business loaded! You can now create bookings.');
          } else {
            console.error('[EnhancedCalendarView] No business ID in response');
            toast.error('Business profile incomplete. Please contact support.');
          }
        })
        .catch(err => {
          console.error('[EnhancedCalendarView] Error fetching business:', err);
          console.error('[EnhancedCalendarView] Error response:', err.response?.data);
          
          if (err.response?.status === 404) {
            toast.error('Business not found. Please complete business onboarding.');
          } else {
            toast.error('Error loading business. Please refresh the page.');
          }
        });
      
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

  const handlePrev = () => {
    const api = calendarRef.current?.getApi();
    api?.prev();
  };
  const handleNext = () => {
    const api = calendarRef.current?.getApi();
    api?.next();
  };
  const handleToday = () => {
    const api = calendarRef.current?.getApi();
    api?.today();
  };

  const handleDatesSet = (dateInfo: { view: { type: string }; start: Date; end: Date }) => {
    const { view, start, end } = dateInfo;
    if (view.type === 'dayGridMonth') {
      setViewTitle(format(start, 'MMMM yyyy'));
    } else if (view.type === 'timeGridWeek') {
      setViewTitle(`${format(start, 'MMM d')} – ${format(end, 'MMM d, yyyy')}`);
    } else if (view.type === 'timeGridDay') {
      setViewTitle(format(start, 'EEEE, MMM d, yyyy'));
    } else {
      setViewTitle(format(start, 'MMM d, yyyy'));
    }
  };

  return (
    <div className="h-full flex flex-col space-y-2 relative pb-2">
      {/* Calendar container with red border - nav + calendar together */}
      <div className="bg-white rounded-lg shadow-sm border border-[#E7001E] p-2 flex-1 min-h-0 flex flex-col">
        {/* Navigation toolbar - inside the red-bordered container */}
        <div className="flex-shrink-0 flex items-center justify-between gap-2 py-1 px-1 mb-2 border-b border-gray-100">
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={handlePrev}
              className="p-2 rounded-lg text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors"
              aria-label="Previous"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={handleNext}
              className="p-2 rounded-lg text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors"
              aria-label="Next"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
          <h3 className="text-sm font-semibold text-gray-700 truncate min-w-0 flex-1 text-center">
            {viewTitle || format(new Date(), 'MMMM yyyy')}
          </h3>
          <button
            type="button"
            onClick={handleToday}
            className="flex-shrink-0 px-3 py-1.5 text-xs font-medium text-[#E7001E] bg-[#E7001E]/10 hover:bg-[#E7001E]/20 rounded-lg transition-colors"
          >
            Today
          </button>
        </div>
        {/* FullCalendar */}
        <div className="flex-1 min-h-0">
        <FullCalendar
          ref={calendarRef}
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
          initialView="timeGridWeek"
          initialDate={initialDate ? new Date(initialDate).toISOString() : undefined}
          events={events}
          editable={!!onReschedule}
          selectable={false}
          dateClick={handleDateClick}
          eventDrop={handleEventDrop}
          eventClick={handleEventClick}
          eventContent={renderEventContent}
          datesSet={handleDatesSet}
          headerToolbar={false}
          height="100%"
          slotDuration="00:15:00"
          slotLabelInterval="00:30"
          slotMinTime="06:00:00"
          slotMaxTime="22:00:00"
          slotEventOverlap={false}
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
        </div>
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
          ${(isBusinessOwner && businessId) ? `
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
      {isBusinessOwner && (
        <CreateBookingModal
          isOpen={showCreateBooking}
          onClose={() => setShowCreateBooking(false)}
          selectedDate={selectedSlotDate}
          businessId={businessId}
          onBookingCreated={handleBookingCreated}
          showWorkerSelector={true}
        />
      )}
    </div>
  );
};

