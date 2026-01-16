import React, { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Calendar, Clock, MapPin, Phone, X, CheckCircle, AlertCircle } from 'lucide-react';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, isSameMonth, isSameDay, addMonths, subMonths, isToday, isPast, isFuture } from 'date-fns';
import toast from 'react-hot-toast';

interface Booking {
  id: string;
  appointmentDate: string;
  appointmentEndDate: string;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'no_show';
  notes?: string;
  customer: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
  };
  business: {
    id: string;
    name: string;
    category: string;
    address?: string;
    phone?: string;
  };
  service: {
    id: string;
    name: string;
    duration: number;
  };
}

interface CalendarViewProps {
  bookings: Booking[];
  onCancelBooking: (bookingId: string) => void;
  view: 'month' | 'week' | 'day';
  onViewChange: (view: 'month' | 'week' | 'day') => void;
}

export const CalendarView: React.FC<CalendarViewProps> = ({
  bookings,
  onCancelBooking,
  view,
  onViewChange,
}) => {
  const [currentDate, setCurrentDate] = useState(new Date());

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'cancelled':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'completed':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'no_show':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'confirmed':
        return <CheckCircle className="h-3 w-3" />;
      case 'pending':
        return <Clock className="h-3 w-3" />;
      case 'cancelled':
        return <X className="h-3 w-3" />;
      case 'completed':
        return <CheckCircle className="h-3 w-3" />;
      case 'no_show':
        return <AlertCircle className="h-3 w-3" />;
      default:
        return <Clock className="h-3 w-3" />;
    }
  };

  const formatTime = (dateString: string) => {
    return format(new Date(dateString), 'h:mm a');
  };

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  };

  // Get bookings for a specific date
  const getBookingsForDate = (date: Date) => {
    return bookings.filter(booking => 
      isSameDay(new Date(booking.appointmentDate), date)
    );
  };

  // Calendar navigation
  const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));
  const prevMonth = () => setCurrentDate(subMonths(currentDate, 1));
  const goToToday = () => setCurrentDate(new Date());

  // Generate calendar days
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart);
    const endDate = endOfWeek(monthEnd);

    const days = [];
    let day = startDate;

    while (day <= endDate) {
      days.push(day);
      day = addDays(day, 1);
    }

    return days;
  }, [currentDate]);

  // Month view
  const renderMonthView = () => (
    <div className="bg-white rounded-lg shadow-sm border">
      {/* Calendar Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center space-x-4">
          <h2 className="text-xl font-semibold text-gray-900">
            {format(currentDate, 'MMMM yyyy')}
          </h2>
          <div className="flex space-x-1">
            <button
              onClick={prevMonth}
              className="p-1 hover:bg-gray-100 rounded"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              onClick={nextMonth}
              className="p-1 hover:bg-gray-100 rounded"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        </div>
        <button
          onClick={goToToday}
          className="px-3 py-1 text-sm bg-primary-100 text-primary-700 rounded-md hover:bg-primary-200"
        >
          Today
        </button>
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7">
        {/* Day headers */}
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
          <div key={day} className="p-2 text-center text-sm font-medium text-gray-500 border-b">
            {day}
          </div>
        ))}

        {/* Calendar days */}
        {calendarDays.map(day => {
          const dayBookings = getBookingsForDate(day);
          const isCurrentMonth = isSameMonth(day, currentDate);
          const isTodayDate = isToday(day);

          return (
            <div
              key={day.toISOString()}
              className={`min-h-[120px] p-1 border-r border-b ${
                isCurrentMonth ? 'bg-white' : 'bg-gray-50'
              } ${isTodayDate ? 'bg-blue-50' : ''}`}
            >
              <div className={`text-sm mb-1 ${
                isCurrentMonth ? 'text-gray-900' : 'text-gray-400'
              } ${isTodayDate ? 'font-semibold text-blue-600' : ''}`}>
                {format(day, 'd')}
              </div>
              
              {/* Bookings for this day */}
              <div className="space-y-1">
                {dayBookings.slice(0, 3).map(booking => (
                  <div
                    key={booking.id}
                    className={`text-xs p-1 rounded border-l-2 ${getStatusColor(booking.status)} cursor-pointer hover:shadow-sm`}
                    title={`${booking.service.name} at ${booking.business.name} - ${formatTime(booking.appointmentDate)}`}
                  >
                    <div className="flex items-center space-x-1">
                      {getStatusIcon(booking.status)}
                      <span className="truncate">{formatTime(booking.appointmentDate)}</span>
                    </div>
                    <div className="truncate font-medium">{booking.service.name}</div>
                    <div className="truncate text-xs opacity-75">{booking.business.name}</div>
                  </div>
                ))}
                {dayBookings.length > 3 && (
                  <div className="text-xs text-gray-500">
                    +{dayBookings.length - 3} more
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  // Week view
  const renderWeekView = () => {
    const weekStart = startOfWeek(currentDate);
    const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

    return (
      <div className="bg-white rounded-lg shadow-sm border">
        {/* Week Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center space-x-4">
            <h2 className="text-xl font-semibold text-gray-900">
              {format(weekStart, 'MMM d')} - {format(addDays(weekStart, 6), 'MMM d, yyyy')}
            </h2>
            <div className="flex space-x-1">
              <button
                onClick={() => setCurrentDate(subMonths(currentDate, 1))}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                onClick={() => setCurrentDate(addMonths(currentDate, 1))}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
          </div>
          <button
            onClick={goToToday}
            className="px-3 py-1 text-sm bg-primary-100 text-primary-700 rounded-md hover:bg-primary-200"
          >
            Today
          </button>
        </div>

        {/* Week Grid */}
        <div className="grid grid-cols-7">
          {weekDays.map(day => {
            const dayBookings = getBookingsForDate(day);
            const isTodayDate = isToday(day);

            return (
              <div key={day.toISOString()} className="border-r last:border-r-0">
                <div className={`p-2 text-center border-b ${
                  isTodayDate ? 'bg-blue-50 font-semibold text-blue-600' : 'bg-gray-50'
                }`}>
                  <div className="text-sm">{format(day, 'EEE')}</div>
                  <div className="text-lg">{format(day, 'd')}</div>
                </div>
                
                <div className="p-2 min-h-[400px]">
                  {dayBookings.map(booking => (
                    <div
                      key={booking.id}
                      className={`mb-2 p-2 rounded border-l-4 ${getStatusColor(booking.status)} cursor-pointer hover:shadow-sm`}
                    >
                      <div className="flex items-center space-x-1 mb-1">
                        {getStatusIcon(booking.status)}
                        <span className="text-sm font-medium">{formatTime(booking.appointmentDate)}</span>
                      </div>
                      <div className="text-sm font-semibold">{booking.service.name}</div>
                      <div className="text-xs opacity-75">{booking.business.name}</div>
                      <div className="text-xs opacity-75">{formatDuration(booking.service.duration)}</div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // Day view
  const renderDayView = () => {
    const dayBookings = getBookingsForDate(currentDate);
    const hours = Array.from({ length: 24 }, (_, i) => i);

    return (
      <div className="bg-white rounded-lg shadow-sm border h-full flex flex-col">
        {/* Day Header - Fixed */}
        <div className="flex items-center justify-between p-4 border-b flex-shrink-0">
          <div className="flex items-center space-x-4">
            <h2 className="text-xl font-semibold text-gray-900">
              {format(currentDate, 'EEEE, MMMM d, yyyy')}
            </h2>
            <div className="flex space-x-1">
              <button
                onClick={() => setCurrentDate(addDays(currentDate, -1))}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                onClick={() => setCurrentDate(addDays(currentDate, 1))}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
          </div>
          <button
            onClick={goToToday}
            className="px-3 py-1 text-sm bg-primary-100 text-primary-700 rounded-md hover:bg-primary-200"
          >
            Today
          </button>
        </div>

        {/* Day Schedule - Scrollable */}
        <div className="flex flex-1 overflow-y-auto">
          <div className="w-16 border-r flex-shrink-0">
            {hours.map(hour => (
              <div key={hour} className="h-16 border-b flex items-center justify-center text-sm text-gray-500">
                {hour === 0 ? '12 AM' : hour < 12 ? `${hour} AM` : hour === 12 ? '12 PM' : `${hour - 12} PM`}
              </div>
            ))}
          </div>
          
          <div className="flex-1 relative">
            {hours.map(hour => (
              <div key={hour} className="h-16 border-b border-gray-100 relative">
                {/* Grid fills entire height */}
                <div className="absolute inset-0 border-b border-gray-100"></div>
                
                {/* Bookings at bottom edge */}
                <div className="absolute bottom-0 left-0 right-0 z-10 transform translate-y-full">
                  {dayBookings
                    .filter(booking => new Date(booking.appointmentDate).getHours() === hour)
                    .map(booking => (
                      <div
                        key={booking.id}
                        className={`mx-1 p-2 rounded border-l-4 ${getStatusColor(booking.status)} cursor-pointer hover:shadow-md transition-shadow`}
                        style={{
                          minHeight: `${Math.min((booking.service.duration / 60) * 64, 48)}px`,
                        }}
                      >
                        <div className="flex items-center space-x-1 mb-1">
                          {getStatusIcon(booking.status)}
                          <span className="text-xs font-medium">{formatTime(booking.appointmentDate)}</span>
                        </div>
                        <div className="text-xs font-semibold truncate">{booking.service.name}</div>
                        <div className="text-xs opacity-75 truncate">{booking.business.name}</div>
                      </div>
                    ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* View Toggle */}
      <div className="flex items-center justify-between">
        <div className="flex space-x-2">
          <button
            onClick={() => onViewChange('month')}
            className={`px-3 py-1 text-sm rounded-md ${
              view === 'month' ? 'bg-primary-100 text-primary-700' : 'bg-gray-100 text-gray-700'
            }`}
          >
            Month
          </button>
          <button
            onClick={() => onViewChange('week')}
            className={`px-3 py-1 text-sm rounded-md ${
              view === 'week' ? 'bg-primary-100 text-primary-700' : 'bg-gray-100 text-gray-700'
            }`}
          >
            Week
          </button>
          <button
            onClick={() => onViewChange('day')}
            className={`px-3 py-1 text-sm rounded-md ${
              view === 'day' ? 'bg-primary-100 text-primary-700' : 'bg-gray-100 text-gray-700'
            }`}
          >
            Day
          </button>
        </div>
        
        <div className="flex items-center space-x-2 text-sm text-gray-600">
          <Calendar className="h-4 w-4" />
          <span>{bookings.length} bookings</span>
        </div>
      </div>

      {/* Calendar Content */}
      {view === 'month' && renderMonthView()}
      {view === 'week' && renderWeekView()}
      {view === 'day' && renderDayView()}
    </div>
  );
};
