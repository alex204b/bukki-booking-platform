import React, { useState } from 'react';
import { useQuery, useQueryClient } from 'react-query';
import { bookingService, api } from '../services/api';
import { Calendar, Clock, MapPin, Phone, X, CheckCircle, AlertCircle, Grid, List, User, Check, XCircle, QrCode, MessageCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { format, isToday, isTomorrow, isPast, isFuture } from 'date-fns';
import toast from 'react-hot-toast';
import { BookingReviewPrompt } from '../components/BookingReviewPrompt';
import { EnhancedCalendarView } from '../components/EnhancedCalendarView';
import { QRCodeDisplay } from '../components/QRCodeDisplay';
import { BookingDetailsModal } from '../components/BookingDetailsModal';
import { EmptyBookings } from '../components/EmptyState';
import { useI18n } from '../contexts/I18nContext';
import { useAuth } from '../contexts/AuthContext';

export const MyBookings: React.FC = () => {
  const { t } = useI18n();
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<'all' | 'upcoming' | 'past' | 'cancelled' | 'pending'>('all');
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('calendar');
  const [showQRCode, setShowQRCode] = useState<string | null>(null);
  const [selectedBooking, setSelectedBooking] = useState<any | null>(null);
  
  // Debug: Log when booking is selected
  React.useEffect(() => {
    if (selectedBooking) {
      console.log('[MyBookings] Selected booking:', selectedBooking.id);
    }
  }, [selectedBooking]);
  
  const isBusinessOwner = user?.role === 'business_owner';
  const isEmployee = user?.role === 'employee';
  
  // Debug: Log user role
  React.useEffect(() => {
    console.log('[MyBookings] User role check:', {
      userRole: user?.role,
      isBusinessOwner,
      isEmployee,
      userId: user?.id,
    });
  }, [user, isBusinessOwner, isEmployee]);

  // Get bookings based on user role
  const { data: bookings, isLoading, refetch } = useQuery(
    ['my-bookings', isBusinessOwner, isEmployee, user?.id],
    async () => {
      // Get all bookings - handle paginated response
      const allBookingsRes = await bookingService.getAll();
      
      // Handle paginated response structure
      let allBookings: any[] = [];
      if (Array.isArray(allBookingsRes.data)) {
        allBookings = allBookingsRes.data;
      } else if (allBookingsRes.data?.data && Array.isArray(allBookingsRes.data.data)) {
        allBookings = allBookingsRes.data.data;
      } else {
        console.warn('[MyBookings] Unexpected bookings response format:', allBookingsRes.data);
        allBookings = [];
      }
      
      console.log('[MyBookings] All bookings received:', allBookings.length);
      
      if (isBusinessOwner) {
        // For business owners, show BOTH:
        // 1. Bookings for their business (work bookings)
        // 2. Bookings they made as customers (personal bookings)
        try {
          const businessRes = await api.get('/businesses/my-business');
          const business = businessRes.data;

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
          const combinedBookings = [...businessBookings, ...personalBookings];
          const uniqueBookings = combinedBookings.filter((booking, index, self) =>
            index === self.findIndex((b) => b.id === booking.id)
          );

          console.log('[MyBookings] Business owner bookings:', {
            businessId: business?.id,
            businessBookings: businessBookings.length,
            personalBookings: personalBookings.length,
            totalBookings: uniqueBookings.length,
          });

          return uniqueBookings;
        } catch (error) {
          console.error('[MyBookings] Error fetching business bookings:', error);
          // Fallback: return personal bookings only
          return allBookings.filter((b: any) =>
            b.customer?.id === user?.id || b.customerId === user?.id
          );
        }
      } else if (isEmployee) {
        // For employees, show BOTH:
        // 1. Bookings for their business (work bookings)
        // 2. Bookings they made as customers (personal bookings)
        try {
          const businessRes = await api.get('/businesses/my-business');
          const business = businessRes.data;
          
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
          const combinedBookings = [...businessBookings, ...personalBookings];
          const uniqueBookings = combinedBookings.filter((booking, index, self) =>
            index === self.findIndex((b) => b.id === booking.id)
          );
          
          console.log('[MyBookings] Employee bookings:', {
            businessId: business?.id,
            businessBookings: businessBookings.length,
            personalBookings: personalBookings.length,
            totalBookings: uniqueBookings.length,
          });
          
          return uniqueBookings;
        } catch (error) {
          console.error('Error fetching employee bookings:', error);
          // Fallback: return personal bookings only
          return allBookings.filter((b: any) => 
            b.customer?.id === user?.id || b.customerId === user?.id
          );
        }
      }
      
      // For customers, get their own bookings
      return allBookings.filter((b: any) => 
        b.customer?.id === user?.id || b.customerId === user?.id
      );
    },
    {
      enabled: true,
      refetchOnWindowFocus: true,
      refetchInterval: 10000, // Refetch every 10 seconds to get status updates
    }
  );

  const handleCancelBooking = async (bookingId: string) => {
    if (window.confirm(t('areYouSureCancel'))) {
      try {
        await bookingService.cancel(bookingId, 'Cancelled by customer');
        toast.success(t('bookingCancelledSuccessfully'));
        refetch();
      } catch (error) {
        toast.error(t('failedToCancelBooking'));
      }
    }
  };

  const handleAcceptBooking = async (bookingId: string) => {
    try {
      await bookingService.updateStatus(bookingId, 'confirmed');
      toast.success(t('bookingAccepted') || 'Booking accepted successfully');
      // Force a refetch to get updated data
      await refetch();
      // Also invalidate the query cache to ensure fresh data
      queryClient.invalidateQueries(['my-bookings', isBusinessOwner]);
    } catch (error: any) {
      toast.error(error.response?.data?.message || t('failedToAcceptBooking') || 'Failed to accept booking');
    }
  };

  const handleRejectBooking = async (bookingId: string) => {
    const reason = window.prompt(t('rejectionReason') || 'Please provide a reason for rejection:');
    if (reason === null) return; // User cancelled
    
    try {
      await bookingService.updateStatus(bookingId, 'cancelled', reason);
      toast.success(t('bookingRejected') || 'Booking rejected');
      refetch();
    } catch (error: any) {
      toast.error(error.response?.data?.message || t('failedToRejectBooking') || 'Failed to reject booking');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'text-green-600 bg-green-100';
      case 'pending':
        return 'text-yellow-600 bg-yellow-100';
      case 'cancelled':
        return 'text-red-600 bg-red-100';
      case 'completed':
        return 'text-blue-600 bg-blue-100';
      case 'no_show':
        return 'text-gray-600 bg-accent-100';
      default:
        return 'text-gray-600 bg-accent-100';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'confirmed':
        return <CheckCircle className="h-4 w-4" />;
      case 'pending':
        return <Clock className="h-4 w-4" />;
      case 'cancelled':
        return <X className="h-4 w-4" />;
      case 'completed':
        return <CheckCircle className="h-4 w-4" />;
      case 'no_show':
        return <AlertCircle className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const formatDate = (date: string) => {
    const appointmentDate = new Date(date);
    if (isToday(appointmentDate)) {
      return `${t('today')}, ${format(appointmentDate, 'h:mm a')}`;
    } else if (isTomorrow(appointmentDate)) {
      return `${t('tomorrow')}, ${format(appointmentDate, 'h:mm a')}`;
    } else {
      return format(appointmentDate, 'MMM d, yyyy h:mm a');
    }
  };

  // Separate pending bookings for business owners
  const pendingBookings = isBusinessOwner && bookings
    ? bookings.filter((b: any) => {
        const isPending = b.status === 'pending' || b.status === 'PENDING';
        const appointmentDate = new Date(b.appointmentDate);
        const isUpcoming = isFuture(appointmentDate) || !isPast(appointmentDate);
        return isPending && isUpcoming;
      })
    : [];
  
  console.log('[MyBookings] Pending bookings:', {
    isBusinessOwner,
    totalBookings: bookings?.length || 0,
    pendingCount: pendingBookings.length,
    pendingBookings: pendingBookings.map((b: any) => ({
      id: b.id,
      status: b.status,
      service: b.service?.name,
      customer: `${b.customer?.firstName} ${b.customer?.lastName}`,
    })),
  });

  const filteredBookings = bookings?.filter((booking: any) => {
    switch (filter) {
      case 'pending':
        return booking.status === 'pending' || booking.status === 'PENDING';
      case 'upcoming':
        return isFuture(new Date(booking.appointmentDate)) && booking.status !== 'cancelled';
      case 'past':
        return isPast(new Date(booking.appointmentDate)) && booking.status !== 'cancelled';
      case 'cancelled':
        return booking.status === 'cancelled';
      default:
        return true;
    }
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent-500"></div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col space-y-2">
      <div className="flex items-center justify-between flex-shrink-0">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">{t('myBookings')}</h1>
        </div>
        
        {/* View Toggle */}
        <div className="flex items-center space-x-2">
          <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
            <button
              onClick={() => setViewMode('calendar')}
              className={`p-1.5 rounded-md transition-colors ${
                viewMode === 'calendar'
                  ? 'bg-white text-[#E7001E] shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
              title={t('calendarView')}
            >
              <Grid className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-md transition-colors ${
                viewMode === 'list'
                  ? 'bg-white text-[#E7001E] shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
              title={t('listView')}
            >
              <List className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Pending Requests Section for Business Owners */}
      {isBusinessOwner && (
        <div className={`${pendingBookings.length > 0 ? 'bg-yellow-50 border-2 border-yellow-200' : 'bg-gray-50 border border-gray-200'} rounded-lg p-2 sm:p-3 flex-shrink-0`}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <AlertCircle className={`h-5 w-5 sm:h-6 sm:w-6 ${pendingBookings.length > 0 ? 'text-yellow-600' : 'text-gray-400'}`} />
              <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900">
                {t('pendingRequests') || 'Pending Booking Requests'}
              </h2>
              {pendingBookings.length > 0 && (
                <span className="bg-yellow-600 text-white text-xs sm:text-sm font-bold px-2 sm:px-3 py-1 rounded-full">
                  {pendingBookings.length}
                </span>
              )}
            </div>
          </div>
          {pendingBookings.length > 0 ? (
            <>
              <p className="text-sm sm:text-base text-gray-600 mb-4">
                {t('pendingRequestsDescription') || 'You have booking requests waiting for your approval'}
              </p>
              <div className="space-y-3 sm:space-y-4">
                {pendingBookings.map((booking: any) => (
              <div key={booking.id} className="bg-white rounded-lg p-3 sm:p-4 border border-yellow-300 shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-1">
                          {booking.service?.name || t('serviceName')}
                        </h3>
                        <div className="flex items-center text-xs sm:text-sm text-gray-600 mb-1">
                          <User className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                          <span>
                            {booking.customer?.firstName} {booking.customer?.lastName}
                          </span>
                        </div>
                        <div className="flex items-center text-xs sm:text-sm text-gray-500">
                          <Calendar className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                          <span>{formatDate(booking.appointmentDate)}</span>
                        </div>
                        {booking.notes && (
                          <p className="text-xs sm:text-sm text-gray-600 mt-2 italic">
                            "{booking.notes}"
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2 sm:gap-3">
                    <button
                      onClick={() => handleAcceptBooking(booking.id)}
                      className="btn btn-primary btn-sm flex items-center gap-1 sm:gap-2 px-3 sm:px-4"
                    >
                      <Check className="h-3 w-3 sm:h-4 sm:w-4" />
                      <span className="text-xs sm:text-sm">{t('accept') || 'Accept'}</span>
                    </button>
                    <button
                      onClick={() => handleRejectBooking(booking.id)}
                      className="btn btn-outline btn-sm flex items-center gap-1 sm:gap-2 px-3 sm:px-4 border-red-600 text-red-600 hover:bg-red-50"
                    >
                      <XCircle className="h-3 w-3 sm:h-4 sm:w-4" />
                      <span className="text-xs sm:text-sm">{t('reject') || 'Reject'}</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
              </div>
            </>
          ) : (
            <p className="text-sm sm:text-base text-gray-500 italic">
              {t('noPendingBookings') || 'No pending booking requests at this time.'}
            </p>
          )}
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex space-x-1 bg-red-100 p-1 rounded-lg w-fit flex-wrap flex-shrink-0">
        {[
          { key: 'all', label: t('all') },
          ...(isBusinessOwner ? [{ key: 'pending', label: t('pending') }] : []),
          { key: 'upcoming', label: t('upcoming') },
          { key: 'past', label: t('past') },
          { key: 'cancelled', label: t('cancelled') },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key as any)}
            className={`px-2 sm:px-3 py-1 sm:py-1.5 rounded-md text-xs sm:text-sm font-medium transition-colors ${
              filter === tab.key
                ? 'bg-white text-red-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 min-h-0">
        {viewMode === 'calendar' ? (
          <EnhancedCalendarView
            bookings={filteredBookings || []}
            onCancelBooking={handleCancelBooking}
            onBookingClick={(booking) => setSelectedBooking(booking)}
            onReschedule={async (bookingId: string, newDate: string) => {
              // TODO: Implement reschedule API call
              await bookingService.update(bookingId, { appointmentDate: newDate });
            }}
          />
        ) : (
        /* Bookings List */
        filteredBookings?.length === 0 ? (
          <EmptyBookings onCreateBooking={() => navigate('/businesses')} />
        ) : (
          <div className="space-y-4">
            {filteredBookings?.map((booking: any) => (
            <div key={booking.id} className="card p-6">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                <div className="flex-1">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-xl font-semibold text-gray-900 mb-1">
                        {booking.service.name}
                      </h3>
                      <p className="text-gray-600 mb-2">{booking.business.name}</p>
                      <div className="flex items-center text-sm text-gray-500 mb-2">
                        <MapPin className="h-4 w-4 mr-1" />
                        <span>{booking.business.address}</span>
                      </div>
                    </div>
                    <div className={`flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(booking.status)}`}>
                      {getStatusIcon(booking.status)}
                      <span className="ml-1 capitalize">{booking.status}</span>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div className="flex items-center text-gray-600">
                      <Calendar className="h-4 w-4 mr-2" />
                      <span>{formatDate(booking.appointmentDate)}</span>
                    </div>
                    
                    <div className="flex items-center text-gray-600">
                      <Clock className="h-4 w-4 mr-2" />
                      <span>{booking.service.duration} {t('minutes')}</span>
                    </div>
                    
                    <div className="flex items-center text-gray-600">
                      <span className="mr-2">💰</span>
                      <span>${booking.totalAmount}</span>
                    </div>
                  </div>
                  
                  {booking.notes && (
                    <div className="mt-4 p-3 bg-accent-50 rounded-lg">
                      <p className="text-sm text-gray-600">
                        <strong>{t('notes')}:</strong> {booking.notes}
                      </p>
                    </div>
                  )}
                  
                  {booking.cancellationReason && (
                    <div className="mt-4 p-3 bg-red-50 rounded-lg">
                      <p className="text-sm text-red-600">
                        <strong>{t('cancellationReason')}:</strong> {booking.cancellationReason}
                      </p>
                    </div>
                  )}
                </div>
                
                <div className="mt-4 md:mt-0 md:ml-6 flex flex-col space-y-2">
                  {booking.status === 'confirmed' && isFuture(new Date(booking.appointmentDate)) && (
                    <button
                      onClick={() => handleCancelBooking(booking.id)}
                      className="btn btn-outline btn-sm text-red-600 border-red-600 hover:bg-red-50"
                    >
                      {t('cancelBooking')}
                    </button>
                  )}
                  
                  {booking.business.phone && (
                    <a
                      href={`tel:${booking.business.phone}`}
                      className="btn btn-outline btn-sm flex items-center justify-center"
                    >
                      <Phone className="h-4 w-4 mr-1" />
                      {t('callBusiness')}
                    </a>
                  )}
                  
                  {/* Chat with business button */}
                  {booking.business?.id && (
                    <button
                      onClick={() => navigate(`/chat/${booking.business.id}`)}
                      className="btn btn-outline btn-sm flex items-center gap-2"
                    >
                      <MessageCircle className="h-4 w-4" />
                      {t('messageBusiness') || 'Message Business'}
                    </button>
                  )}
                  
                  {/* Only show QR code for confirmed bookings */}
                  {booking.status === 'confirmed' && isFuture(new Date(booking.appointmentDate)) && (
                    <button
                      onClick={() => setShowQRCode(booking.id)}
                      className="btn btn-primary btn-sm flex items-center gap-2"
                    >
                      <QrCode className="h-4 w-4" />
                      {t('showQrCode')}
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
        )
        )}
      </div>

      {/* Review Prompts for Completed Bookings */}
      {bookings?.map((booking: any) => (
        <BookingReviewPrompt
          key={booking.id}
          bookingId={booking.id}
          onReviewSubmitted={() => refetch()}
        />
      ))}

      {/* Booking Details Modal */}
      {selectedBooking && (() => {
        // Find the full booking data from the bookings array
        const fullBooking = bookings?.find((b: any) => b.id === selectedBooking.id);
        const bookingData = fullBooking || selectedBooking;
        
        return (
          <BookingDetailsModal
            booking={{
              id: bookingData.id,
              appointmentDate: bookingData.appointmentDate,
              status: bookingData.status,
              notes: bookingData.notes,
              business: {
                id: bookingData.business?.id || bookingData.businessId, // Ensure business ID is included
                name: bookingData.business?.name || bookingData.businessName || 'Unknown',
                address: bookingData.business?.address,
                phone: bookingData.business?.phone,
                category: bookingData.business?.category,
              },
              service: {
                name: bookingData.service?.name || bookingData.serviceName || 'Unknown',
                duration: bookingData.service?.duration || 0,
              },
              customer: bookingData.customer ? {
                id: bookingData.customer.id, // Make sure customer ID is included
                firstName: bookingData.customer.firstName,
                lastName: bookingData.customer.lastName,
                email: bookingData.customer.email,
              } : undefined,
              totalAmount: Number(bookingData.totalAmount || bookingData.service?.price || 0),
            }}
            onClose={() => setSelectedBooking(null)}
            onCancel={() => {
              if (window.confirm(t('areYouSureCancel'))) {
                handleCancelBooking(selectedBooking.id);
                setSelectedBooking(null);
              }
            }}
            onShowQR={() => {
              setShowQRCode(selectedBooking.id);
              setSelectedBooking(null);
            }}
            isBusinessOwner={isBusinessOwner}
            currentUserId={user?.id}
          />
        );
      })()}

      {/* QR Code Display Modal */}
      {showQRCode && (
        <QRCodeDisplay
          bookingId={showQRCode}
          onClose={() => setShowQRCode(null)}
        />
      )}
    </div>
  );
};
