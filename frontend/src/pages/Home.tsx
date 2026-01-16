import React, { useState } from 'react';
import { useQuery } from 'react-query';
import { useNavigate } from 'react-router-dom';
import { bookingService, api } from '../services/api';
import { Calendar, Clock, MapPin, ChevronRight, AlertCircle, ChevronLeft, X, Menu, Filter } from 'lucide-react';
import { format, isToday, isTomorrow, isFuture, isPast } from 'date-fns';
import { useAuth } from '../contexts/AuthContext';
import { EmptyBookings } from '../components/EmptyState';
import { useI18n } from '../contexts/I18nContext';

export const Home: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { t } = useI18n();
  const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000';
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'confirmed' | 'cancelled' | 'completed'>('all');
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'upcoming' | 'past'>('all');
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const isBusinessOwner = user?.role === 'business_owner';
  const isEmployee = user?.role === 'employee';

  // Listen for sidebar state changes from Layout component
  React.useEffect(() => {
    const handleSidebarChange = (event: any) => {
      setSidebarOpen(event.detail?.isOpen || false);
    };
    window.addEventListener('sidebarStateChange', handleSidebarChange);
    return () => {
      window.removeEventListener('sidebarStateChange', handleSidebarChange);
    };
  }, []);

  // Get bookings
  const { data: bookings, isLoading, error } = useQuery(
    ['my-bookings', user?.id],
    async () => {
      console.log('[Home] Fetching bookings for user:', user?.id, 'role:', user?.role);

      const allBookingsRes = await bookingService.getAll();

      let allBookings: any[] = [];
      if (Array.isArray(allBookingsRes.data)) {
        allBookings = allBookingsRes.data;
      } else if (allBookingsRes.data?.data && Array.isArray(allBookingsRes.data.data)) {
        allBookings = allBookingsRes.data.data;
      }

      console.log('[Home] All bookings from API:', allBookings.length);

      if (isBusinessOwner) {
        // For business owners, show BOTH:
        // 1. Bookings for their business (work bookings)
        // 2. Bookings they made as customers (personal bookings)
        try {
          const businessRes = await api.get('/businesses/my-business');
          const business = businessRes.data;
          console.log('[Home] Business owner - business:', business?.id);

          // Get bookings for their business
          const businessBookings = business?.id
            ? allBookings.filter((b: any) =>
                b.business?.id === business.id || b.businessId === business.id
              )
            : [];

          // Get bookings they made as customers (personal bookings)
          const personalBookings = allBookings.filter((b: any) =>
            b.customer?.id === user?.id || b.customerId === user?.id
          );

          // Combine both, removing duplicates
          const combined = [...businessBookings, ...personalBookings];
          const uniqueBookings = Array.from(new Map(combined.map(b => [b.id, b])).values());

          console.log('[Home] Business owner bookings:', {
            businessId: business?.id,
            businessBookings: businessBookings.length,
            personalBookings: personalBookings.length,
            totalBookings: uniqueBookings.length,
          });

          return uniqueBookings;
        } catch (error) {
          console.error('[Home] Error fetching business bookings:', error);
          // Fallback: return personal bookings only
          return allBookings.filter((b: any) =>
            b.customer?.id === user?.id || b.customerId === user?.id
          );
        }
      } else if (isEmployee) {
        try {
          const businessRes = await api.get('/businesses/my-business');
          const business = businessRes.data;

          const businessBookings = business?.id
            ? allBookings.filter((b: any) =>
                b.business?.id === business.id || b.businessId === business.id
              )
            : [];

          const personalBookings = allBookings.filter((b: any) =>
            b.customer?.id === user?.id || b.customerId === user?.id
          );

          const combined = [...businessBookings, ...personalBookings];
          const uniqueBookings = Array.from(new Map(combined.map(b => [b.id, b])).values());

          console.log('[Home] Employee bookings:', uniqueBookings.length, uniqueBookings);
          return uniqueBookings;
        } catch (error) {
          console.error('[Home] Error fetching employee bookings:', error);
          return allBookings.filter((b: any) =>
            b.customer?.id === user?.id || b.customerId === user?.id
          );
        }
      } else {
        // Customer bookings
        const filtered = allBookings.filter((b: any) =>
          b.customer?.id === user?.id || b.customerId === user?.id
        );
        console.log('[Home] Customer bookings:', filtered.length);
        return filtered;
      }
    },
    {
      enabled: !!user,
    }
  );

  const formatDate = (date: string) => {
    const appointmentDate = new Date(date);
    if (isToday(appointmentDate)) {
      return `Today, ${format(appointmentDate, 'h:mm a')}`;
    } else if (isTomorrow(appointmentDate)) {
      return `Tomorrow, ${format(appointmentDate, 'h:mm a')}`;
    } else {
      return format(appointmentDate, 'MMM d, yyyy h:mm a');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'confirmed':
        return 'bg-accent-100 text-accent-700';
      case 'pending':
        return 'bg-accent-200 text-accent-800';
      case 'cancelled':
        return 'bg-red-100 text-red-700';
      case 'completed':
        return 'bg-accent-50 text-accent-600';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  // Apply filters
  const filteredBookings = bookings?.filter((booking: any) => {
    const appointmentDate = new Date(booking.appointmentDate);

    // Status filter
    if (statusFilter !== 'all' && booking.status?.toLowerCase() !== statusFilter) {
      return false;
    }

    // Date filter
    if (dateFilter === 'today' && !isToday(appointmentDate)) {
      return false;
    }
    if (dateFilter === 'upcoming' && !isFuture(appointmentDate)) {
      return false;
    }
    if (dateFilter === 'past' && !isPast(appointmentDate)) {
      return false;
    }

    return true;
  }) || [];

  // Navigation handlers
  const handleNextCard = () => {
    setCurrentCardIndex((prev) => (prev + 1) % (filteredBookings?.length || 1));
  };

  const handlePrevCard = () => {
    setCurrentCardIndex((prev) => (prev - 1 + (filteredBookings?.length || 1)) % (filteredBookings?.length || 1));
  };

  if (error) {
    console.error('[Home] Error fetching bookings:', error);
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center px-4">
        <div className="text-center">
          <AlertCircle className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">{t('pleaseSignIn') || 'Please Sign In'}</h2>
          <p className="text-gray-600 mb-6">{t('needToSignInToViewBookings') || 'You need to be signed in to view your bookings'}</p>
          <button
            onClick={() => navigate('/login')}
            className="px-6 py-3 bg-accent-500 text-white rounded-lg hover:bg-accent-600 transition-colors font-medium"
          >
            {t('signIn')}
          </button>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent-500"></div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-white overflow-hidden flex flex-col">
      {/* Header */}
      <div className={`bg-white px-3 py-2 flex-shrink-0 transition-opacity ${sidebarOpen ? 'lg:opacity-100 opacity-75' : 'opacity-100'}`}>
        <div className="max-w-7xl mx-auto flex items-center justify-center">
          <h1 className="text-base sm:text-lg font-bold text-gray-900">{t('myBookings')}</h1>
        </div>
      </div>

      {/* Calendar and Filters Buttons - Fixed Top Right */}
      {filteredBookings && filteredBookings.length > 0 && (
        <div className={`fixed top-[68px] right-3 z-[30] flex items-center gap-2 transition-opacity ${sidebarOpen ? 'lg:opacity-100 lg:pointer-events-auto opacity-75 pointer-events-none' : 'opacity-100'}`}>
          <button
            onClick={() => navigate('/my-bookings')}
            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs rounded-lg bg-accent-500 text-white hover:bg-accent-600 transition-colors font-medium"
            title={t('viewAllBookingsInCalendar') || 'View All Bookings in Calendar'}
          >
            <Calendar className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{t('calendar')}</span>
          </button>
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="p-1.5 transition-colors hover:bg-gray-100 rounded-md"
            aria-label={t('filters')}
            title={t('filters')}
          >
            {menuOpen ? (
              <X className="h-4 w-4 text-gray-700" />
            ) : (
              <Filter className="h-4 w-4 text-gray-700" />
            )}
          </button>
        </div>
      )}

      {/* Retractable Sidebar with Filters */}
      <>
        {/* Sidebar Panel */}
        <div
          className={`fixed top-16 right-0 bottom-0 w-72 sm:w-80 backdrop-blur-md z-[35] transform transition-transform duration-300 ease-in-out ${
            menuOpen ? 'translate-x-0' : 'translate-x-full'
          }`}
          style={{
            background: 'linear-gradient(to left, rgba(255, 255, 255, 0.95), rgba(255, 255, 255, 0.85), rgba(255, 255, 255, 0.75))'
          }}
        >
          <div className="h-full overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900">{t('filters')}</h2>
                <button
                  onClick={() => setMenuOpen(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  aria-label="Close menu"
                >
                  <X className="h-6 w-6 text-gray-700" />
                </button>
              </div>

              <div className="space-y-6">
                {/* Status Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">{t('status')}</label>
                  <select
                    value={statusFilter}
                    onChange={(e) => {
                      setStatusFilter(e.target.value as any);
                      setCurrentCardIndex(0);
                    }}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-accent-500"
                  >
                    <option value="all">{t('all')}</option>
                    <option value="pending">{t('pending')}</option>
                    <option value="confirmed">{t('confirmed')}</option>
                    <option value="completed">{t('completed')}</option>
                    <option value="cancelled">{t('cancelled')}</option>
                  </select>
                </div>

                {/* Date Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">{t('date')}</label>
                  <select
                    value={dateFilter}
                    onChange={(e) => {
                      setDateFilter(e.target.value as any);
                      setCurrentCardIndex(0);
                    }}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-accent-500"
                  >
                    <option value="all">{t('all')}</option>
                    <option value="today">{t('today')}</option>
                    <option value="upcoming">{t('upcoming')}</option>
                    <option value="past">{t('past')}</option>
                  </select>
                </div>

                {/* Active Filters Summary */}
                {(statusFilter !== 'all' || dateFilter !== 'all') && (
                  <div className="pt-4 border-t border-gray-200">
                    <h3 className="text-sm font-medium text-gray-700 mb-2">{t('activeFilters') || 'Active Filters'}</h3>
                    <div className="space-y-2">
                      {statusFilter !== 'all' && (
                        <div className="flex items-center justify-between p-2 bg-gray-100 rounded-lg">
                          <span className="text-sm text-gray-700">
                            {t('status')}: <strong>{statusFilter}</strong>
                          </span>
                          <button
                            onClick={() => setStatusFilter('all')}
                            className="p-1 hover:bg-gray-200 rounded"
                          >
                            <X className="h-4 w-4 text-gray-600" />
                          </button>
                        </div>
                      )}
                      {dateFilter !== 'all' && (
                        <div className="flex items-center justify-between p-2 bg-gray-100 rounded-lg">
                          <span className="text-sm text-gray-700">
                            {t('date')}: <strong>{dateFilter}</strong>
                          </span>
                          <button
                            onClick={() => setDateFilter('all')}
                            className="p-1 hover:bg-gray-200 rounded"
                          >
                            <X className="h-4 w-4 text-gray-600" />
                          </button>
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => {
                        setStatusFilter('all');
                        setDateFilter('all');
                      }}
                      className="w-full mt-3 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors text-sm font-medium"
                    >
                      {t('clearAllFilters') || 'Clear All Filters'}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </>

      {/* Bookings Display */}
      {!bookings || bookings.length === 0 ? (
        <div className={`flex-1 flex items-center justify-center transition-opacity ${sidebarOpen ? 'lg:opacity-100 lg:pointer-events-auto opacity-75 pointer-events-none' : 'opacity-100'}`}>
          <EmptyBookings onCreateBooking={() => navigate('/businesses')} />
        </div>
      ) : filteredBookings.length === 0 ? (
        <div className={`flex-1 flex items-center justify-center text-center transition-opacity ${sidebarOpen ? 'lg:opacity-100 lg:pointer-events-auto opacity-75 pointer-events-none' : 'opacity-100'}`}>
          <div>
            <AlertCircle className="h-10 w-10 sm:h-12 sm:w-12 text-gray-400 mx-auto mb-2" />
            <h2 className="text-base sm:text-lg font-bold text-gray-900 mb-1.5 px-4">{t('noBookingsMatchFilters') || 'No bookings match your filters'}</h2>
            <p className="text-xs sm:text-sm text-gray-600 mb-3 px-4">{t('tryAdjustingFilters') || 'Try adjusting your filters to see more results'}</p>
            <button
              onClick={() => {
                setStatusFilter('all');
                setDateFilter('all');
              }}
              className="px-3 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm bg-accent-500 text-white rounded-lg hover:bg-accent-600 transition-colors font-medium"
            >
              {t('clearFilters') || 'Clear Filters'}
            </button>
          </div>
        </div>
      ) : (
        <div className="flex-1 relative w-full max-w-6xl mx-auto flex items-center justify-center overflow-hidden px-2 sm:px-4">
          {/* Navigation Buttons - Slightly dimmed when sidebar is open on mobile only */}
          <button
            onClick={handlePrevCard}
            className={`absolute left-1 sm:left-2 z-[40] p-1.5 sm:p-2 bg-white rounded-full shadow-lg hover:shadow-xl transition-all hover:scale-110 ${sidebarOpen ? 'lg:opacity-100 lg:pointer-events-auto opacity-75 pointer-events-none' : 'opacity-100'}`}
            aria-label="Previous card"
          >
            <ChevronLeft className="h-4 w-4 sm:h-5 sm:w-5 text-gray-700" />
          </button>

          <button
            onClick={handleNextCard}
            className={`absolute right-1 sm:right-2 z-[40] p-1.5 sm:p-2 bg-white rounded-full shadow-lg hover:shadow-xl transition-all hover:scale-110 ${sidebarOpen ? 'lg:opacity-100 lg:pointer-events-auto opacity-75 pointer-events-none' : 'opacity-100'}`}
            aria-label="Next card"
          >
            <ChevronRight className="h-4 w-4 sm:h-5 sm:w-5 text-gray-700" />
          </button>

          {/* Stacked Cards */}
          <div className="relative w-full h-full flex items-center justify-center">
            {filteredBookings.map((booking: any, index: number) => {
              const offset = index - currentCardIndex;
              const isVisible = Math.abs(offset) <= 4;

              if (!isVisible) return null;

              // Calculate transform and z-index based on position
              let transform = '';
              let zIndex = 0;
              let opacity = 1;
              let scale = 1;

              if (offset === 0) {
                // Front card
                transform = 'translateX(0) translateY(-90px) rotateY(0deg)';
                zIndex = 30;
                opacity = 1;
                scale = 1;
              } else if (offset > 0) {
                // Cards to the right (behind)
                transform = `translateX(${offset * 100}px) translateY(${offset * 50 - 90}px) rotateY(-8deg)`;
                zIndex = 30 - offset * 10;
                opacity = 1;
                scale = 1 - offset * 0.06;
              } else {
                // Cards to the left (behind)
                transform = `translateX(${offset * 100}px) translateY(${Math.abs(offset) * 50 - 90}px) rotateY(8deg)`;
                zIndex = 30 + offset * 10;
                opacity = 1;
                scale = 1 + offset * 0.06;
              }

              return (
                <div
                  key={booking.id}
                  className="absolute transition-all duration-500 ease-out w-[310px] sm:w-[360px] md:w-[400px]"
                  style={{
                    transform: `${transform} scale(${scale})`,
                    zIndex,
                    opacity: opacity,
                    height: 'min(calc(100vh - 220px), 400px)',
                  }}
                >
                  <div
                    onClick={() => navigate('/my-bookings')}
                    className="block h-full bg-white rounded-3xl shadow-2xl overflow-hidden hover:shadow-3xl transition-shadow cursor-pointer"
                  >
                    {/* Booking Header with Image/Gradient */}
                    {booking.business?.images && booking.business.images.length > 0 ? (
                      <div className="relative h-[40%] bg-gray-200 overflow-hidden">
                        <img
                          src={`${booking.business.images[0].startsWith('http') ? '' : API_BASE_URL}${booking.business.images[0]}`}
                          alt={booking.business.name}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            console.error(`Failed to load business image: ${API_BASE_URL}${booking.business.images[0]}`);
                            e.currentTarget.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="300"%3E%3Crect fill="%23f3f4f6" width="400" height="300"/%3E%3C/svg%3E';
                          }}
                        />
                        {/* Status Badge on Image */}
                        <div className="absolute top-2 right-2">
                          <div className={`px-2 py-1 rounded-full text-[10px] sm:text-xs font-semibold shadow-lg ${getStatusColor(booking.status)}`}>
                            {booking.status}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="h-[40%] bg-gradient-to-br from-[#330007] to-[#220005] flex items-center justify-center relative">
                        <Calendar className="h-12 w-12 sm:h-14 sm:w-14 text-white opacity-30" />
                        {/* Status Badge on Gradient */}
                        <div className="absolute top-2 right-2">
                          <div className={`px-2 py-1 rounded-full text-[10px] sm:text-xs font-semibold shadow-lg ${getStatusColor(booking.status)}`}>
                            {booking.status}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Booking Info */}
                    <div className="h-[60%] flex flex-col p-3">
                      <div className="flex items-start justify-between mb-1.5">
                        <div className="flex-1 min-w-0 pr-1.5">
                          <h3 className="text-sm sm:text-base font-bold text-gray-900 mb-0.5 truncate">
                            {booking.service?.name || 'Service'}
                          </h3>
                          <p className="text-[10px] sm:text-xs text-gray-600 font-medium truncate">
                            {booking.business?.name || 'Business'}
                          </p>
                        </div>
                        <div className="text-base sm:text-lg font-bold text-accent-500 flex-shrink-0">
                          ${booking.totalAmount || 0}
                        </div>
                      </div>

                      {/* Date & Time */}
                      <div className="flex items-center text-gray-700 mb-1.5">
                        <Calendar className="h-3.5 w-3.5 mr-1.5 text-accent-500 flex-shrink-0" />
                        <span className="font-medium text-xs truncate">{formatDate(booking.appointmentDate)}</span>
                      </div>

                      {/* Duration */}
                      <div className="flex items-center text-gray-600 mb-1.5">
                        <Clock className="h-3.5 w-3.5 mr-1.5 text-gray-400 flex-shrink-0" />
                        <span className="text-xs">{booking.service?.duration || 0} minutes</span>
                      </div>

                      {/* Location */}
                      {booking.business?.address && (
                        <div className="flex items-start text-gray-600 mb-1.5">
                          <MapPin className="h-3.5 w-3.5 mr-1.5 text-gray-400 mt-0.5 flex-shrink-0" />
                          <span className="flex-1 text-[10px] sm:text-xs line-clamp-1">
                            {booking.business.address}
                            {booking.business.city && `, ${booking.business.city}`}
                          </span>
                        </div>
                      )}

                      {/* Notes */}
                      {booking.notes && (
                        <div className="mt-1 p-1.5 bg-gray-50 rounded-lg">
                          <p className="text-[10px] sm:text-xs text-gray-600 line-clamp-1">
                            <strong>{t('notes')}:</strong> {booking.notes}
                          </p>
                        </div>
                      )}

                      {/* Spacer */}
                      <div className="flex-1"></div>

                      {/* View Details Button */}
                      <div className="mt-1.5 pt-2 border-t border-gray-200">
                        <div className="flex items-center justify-center text-accent-500 text-xs font-semibold hover:text-accent-600 transition-colors">
                          <span>{t('View Full Details') || 'View Full Details'}</span>
                          <ChevronRight className="h-3.5 w-3.5 ml-0.5" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Card Counter */}
          <div className="absolute bottom-24 sm:bottom-28 left-1/2 -translate-x-1/2 bg-white px-2.5 py-1 rounded-full shadow-lg z-[40]">
            <span className="text-[10px] sm:text-xs font-medium text-gray-700">
              {currentCardIndex + 1} / {filteredBookings.length}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default Home;
