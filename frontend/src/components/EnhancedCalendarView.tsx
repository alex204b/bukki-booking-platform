import React, { useState, useRef, useEffect } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
// FullCalendar CSS - using CDN link in index.html or inline styles
import { format, addDays, isToday } from 'date-fns';
import { Sparkles, Search } from 'lucide-react';
import toast from 'react-hot-toast';
import { businessService, aiService } from '../services/api';
import { useNavigate } from 'react-router-dom';

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
  
  // Category-based colors
  const colorMap: Record<string, string> = {
    beauty_salon: '#ec4899', // Pink
    fitness: '#22c55e', // Green
    restaurant: '#f59e0b', // Amber
    healthcare: '#3b82f6', // Blue
    mechanic: '#6b7280', // Gray
    tailor: '#8b5cf6', // Purple
    education: '#06b6d4', // Cyan
    consulting: '#14b8a6', // Teal
    other: '#f97316', // Orange
  };
  
  const baseColor = colorMap[category] || '#f97316';
  return `${baseColor}${opacity}`;
};

export const EnhancedCalendarView: React.FC<EnhancedCalendarViewProps> = ({
  bookings,
  onCancelBooking,
  onReschedule,
  onBookingClick,
}) => {
  const calendarRef = useRef<FullCalendar>(null);
  const navigate = useNavigate();
  const [currentView, setCurrentView] = useState<'timeGridWeek' | 'dayGridMonth' | 'timeGridDay'>('timeGridWeek');
  const [showAIChat, setShowAIChat] = useState(false);
  const [aiQuery, setAiQuery] = useState('');
  const [aiSuggestions, setAiSuggestions] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  
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

  // AI-powered slot suggestion - searches for available businesses
  const findSmartSlots = async (query: string) => {
    if (!query.trim()) {
      setAiSuggestions([]);
      return;
    }

    setIsSearching(true);
    setAiSuggestions([]);

    try {
      // First, try to parse the query using AI service
      let serviceType: string | null = null;
      let parsedServices: Array<{ type: string; name: string; step: number }> = [];

      try {
        const aiResponse = await Promise.race([
          aiService.parseQuery(query),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('AI timeout')), 5000)
          )
        ]) as any;

        const data = aiResponse?.data || (aiResponse?.response?.data ? aiResponse.response.data : null);
        
        // Check if response contains an error
        if (data?.error) {
          throw new Error(data.error);
        }
        
        // Validate AI response
        if (!data || !Array.isArray(data.services) || data.services.length === 0) {
          throw new Error('AI did not return any services. Please try rephrasing your query.');
        }
        
        const validServices = data.services.filter((s: any) => s && s.type && s.name);
        if (validServices.length === 0) {
          throw new Error('AI returned invalid service data. Please try rephrasing your query.');
        }
        
        parsedServices = validServices;
        serviceType = validServices[0].type; // Use first service type (AI returns database category directly)
      } catch (aiError: any) {
        console.error('[Calendar AI] ❌ AI parsing failed:', aiError);
        
        // Extract error message
        const errorData = aiError.response?.data;
        let errorMessage = errorData?.error || aiError.message || 'Failed to understand your request.';
        
        // Make error message more user-friendly
        if (errorMessage.includes('not configured') || errorMessage.includes('API key')) {
          errorMessage = '⚠️ AI service is not configured. Please add GEMINI_API_KEY (recommended) or HUGGINGFACE_API_KEY to your backend .env file. Only ONE is needed.';
        } else if (errorMessage.includes('timeout') || errorMessage.includes('timed out')) {
          errorMessage = '⏱️ AI request timed out. Please try again.';
        } else if (!errorData || (errorData.services && errorData.services.length === 0)) {
          errorMessage = '❌ No services found. Please try rephrasing your query (e.g., "I need a haircut" or "Find me a restaurant").';
        }
        
        toast.error(errorMessage, { duration: 5000 });
        setIsSearching(false);
        setAiSuggestions([]);
        return;
      }

      // Search for available businesses
      let businesses: any[] = [];
      
      if (serviceType) {
        // Search by service type
        try {
          const searchResults = await businessService.search('', serviceType, '');
          businesses = searchResults.data || [];
        } catch (searchError: any) {
          console.warn('[Calendar AI] Search failed, using getAll:', searchError.message);
          try {
            const allBusinessesRes = await businessService.getAll();
            const allBusinesses = allBusinessesRes.data || [];
            const lowerServiceType = serviceType.toLowerCase();
            businesses = allBusinesses.filter((b: any) => 
              b.status === 'approved' && 
              b.isActive && 
              b.category?.toLowerCase() === lowerServiceType
            );
          } catch (getAllError: any) {
            console.error('[Calendar AI] getAll also failed:', getAllError);
          }
        }
      } else {
        // General search by query text
        try {
          const searchResults = await businessService.search(query, '', '');
          businesses = searchResults.data || [];
        } catch (searchError: any) {
          console.warn('[Calendar AI] General search failed:', searchError.message);
          try {
            const allBusinessesRes = await businessService.getAll();
            const allBusinesses = allBusinessesRes.data || [];
            const lowerQuery = query.toLowerCase();
            businesses = allBusinesses.filter((b: any) => 
              b.status === 'approved' && 
              b.isActive && 
              (b.name?.toLowerCase().includes(lowerQuery) ||
               b.category?.toLowerCase().includes(lowerQuery) ||
               b.description?.toLowerCase().includes(lowerQuery))
            );
          } catch (getAllError: any) {
            console.error('[Calendar AI] getAll also failed:', getAllError);
          }
        }
      }

      // Create suggestions from found businesses
      const suggestedSlots = businesses.slice(0, 5).map((business: any) => {
        // Suggest a date next week
        const suggestedDate = addDays(new Date(), 7);
        
        return {
          businessId: business.id,
          business: business.name,
          service: serviceType ? `${serviceType} service` : 'Service',
          category: business.category,
          suggestedDate: suggestedDate,
          reason: 'Available business found',
          address: business.address,
          rating: business.rating || 0,
        };
      });

      setAiSuggestions(suggestedSlots);
      
      if (suggestedSlots.length === 0) {
        toast('No businesses found. Try searching for a service type like "haircut", "restaurant", or "mechanic".', { 
          icon: 'ℹ️',
          duration: 4000 
        });
      } else {
        toast.success(`Found ${suggestedSlots.length} business${suggestedSlots.length > 1 ? 'es' : ''} for you!`, {
          duration: 2000
        });
      }
    } catch (error: any) {
      console.error('[Calendar AI] Error finding slots:', error);
      toast.error('Failed to search for businesses. Please try again.');
    } finally {
      setIsSearching(false);
    }
  };

  // Navigate to today
  const goToToday = () => {
    if (calendarRef.current) {
      calendarRef.current.getApi().today();
      toast.success('Jumped to today');
    }
  };

  return (
    <div className="space-y-4 relative">
      {/* Toolbar */}
      <div className="flex items-center justify-between bg-white p-4 rounded-lg shadow-sm border">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCurrentView('timeGridWeek')}
            className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
              currentView === 'timeGridWeek'
                ? 'bg-primary-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Week
          </button>
          <button
            onClick={() => setCurrentView('dayGridMonth')}
            className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
              currentView === 'dayGridMonth'
                ? 'bg-primary-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Month
          </button>
          <button
            onClick={() => setCurrentView('timeGridDay')}
            className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
              currentView === 'timeGridDay'
                ? 'bg-primary-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Day
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={goToToday}
            className="px-3 py-1.5 text-sm bg-primary-100 text-primary-700 rounded-md hover:bg-primary-200 transition-colors"
          >
            Today
          </button>
          <button
            onClick={jumpToNextOpenSlot}
            className="px-3 py-1.5 text-sm bg-green-100 text-green-700 rounded-md hover:bg-green-200 transition-colors flex items-center gap-1"
          >
            <Search className="h-4 w-4" />
            Next Open Slot
          </button>
        </div>
      </div>

      {/* FullCalendar */}
      <div className="bg-white rounded-lg shadow-sm border p-4">
        <FullCalendar
          ref={calendarRef}
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
          initialView="timeGridWeek"
          events={events}
          editable={!!onReschedule}
          eventDrop={handleEventDrop}
          eventClick={handleEventClick}
          eventContent={renderEventContent}
          headerToolbar={false}
          height="auto"
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
            isToday(arg.date) ? 'bg-yellow-50' : ''
          }
        />
      </div>

      {/* AI Chat Bubble */}
      <div className="fixed bottom-6 right-6 z-50">
        <button
          onClick={() => setShowAIChat(!showAIChat)}
          className="bg-gradient-to-r from-purple-600 to-pink-600 text-white p-4 rounded-full shadow-lg hover:scale-110 transition-transform"
          aria-label="AI Assistant"
        >
          <Sparkles className="h-6 w-6" />
        </button>

        {showAIChat && (
          <div className="absolute bottom-16 right-0 w-80 h-96 bg-white rounded-xl shadow-2xl p-4 flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-purple-600" />
                AI Booking Assistant
              </h3>
              <button
                onClick={() => setShowAIChat(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ×
              </button>
            </div>

            <div className="flex-1 overflow-y-auto mb-4 space-y-2">
              <div className="bg-gray-100 rounded-lg p-3 text-sm text-gray-700">
                <p className="font-medium mb-1">Try asking:</p>
                <ul className="list-disc list-inside space-y-1 text-xs">
                  <li>"Find me a haircut"</li>
                  <li>"Show me restaurants"</li>
                  <li>"I need a mechanic"</li>
                  <li>"Beauty salon near me"</li>
                </ul>
              </div>

              {isSearching && (
                <div className="text-center py-4 text-sm text-gray-500">
                  Searching for businesses...
                </div>
              )}

              {!isSearching && aiSuggestions.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-gray-700">Available Businesses:</p>
                  {aiSuggestions.map((slot, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        if (slot.businessId) {
                          navigate(`/businesses/${slot.businessId}`);
                          setShowAIChat(false);
                        }
                      }}
                      className="w-full text-left bg-primary-50 hover:bg-primary-100 rounded-lg p-3 text-sm transition-colors"
                    >
                      <div className="font-medium text-gray-900">{slot.business}</div>
                      <div className="text-xs text-gray-600 mt-1">{slot.category}</div>
                      {slot.address && (
                        <div className="text-xs text-gray-500 mt-1">{slot.address}</div>
                      )}
                      {slot.rating > 0 && (
                        <div className="text-xs text-primary-600 mt-1">⭐ {slot.rating.toFixed(1)}</div>
                      )}
                      <div className="text-xs text-primary-600 mt-2 font-medium">
                        Click to book →
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                value={aiQuery}
                onChange={(e) => setAiQuery(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    findSmartSlots(aiQuery);
                  }
                }}
                placeholder="Ask me anything..."
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
              />
              <button
                onClick={() => findSmartSlots(aiQuery)}
                className="px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:opacity-90 transition-opacity"
              >
                <Search className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

