import React, { useState } from 'react';
import { useQuery } from 'react-query';
import { bookingService } from '../services/api';
import { Calendar, Clock, MapPin, Phone, X, CheckCircle, AlertCircle } from 'lucide-react';
import { format, isToday, isTomorrow, isPast, isFuture } from 'date-fns';
import toast from 'react-hot-toast';
import { BookingReviewPrompt } from '../components/BookingReviewPrompt';

export const MyBookings: React.FC = () => {
  const [filter, setFilter] = useState<'all' | 'upcoming' | 'past' | 'cancelled'>('all');

  const { data: bookings, isLoading, refetch } = useQuery(
    'my-bookings',
    () => bookingService.getAll(),
    {
      select: (response) => response.data,
    }
  );

  const handleCancelBooking = async (bookingId: string) => {
    if (window.confirm('Are you sure you want to cancel this booking?')) {
      try {
        await bookingService.cancel(bookingId, 'Cancelled by customer');
        toast.success('Booking cancelled successfully');
        refetch();
      } catch (error) {
        toast.error('Failed to cancel booking');
      }
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
        return 'text-gray-600 bg-primary-100';
      default:
        return 'text-gray-600 bg-primary-100';
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
      return `Today, ${format(appointmentDate, 'h:mm a')}`;
    } else if (isTomorrow(appointmentDate)) {
      return `Tomorrow, ${format(appointmentDate, 'h:mm a')}`;
    } else {
      return format(appointmentDate, 'MMM d, yyyy h:mm a');
    }
  };

  const filteredBookings = bookings?.filter((booking: any) => {
    switch (filter) {
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
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">My Bookings</h1>
        <p className="text-gray-600 mt-2">Manage your appointments and bookings</p>
      </div>

      {/* Filter Tabs */}
      <div className="flex space-x-1 bg-primary-100 p-1 rounded-lg w-fit">
        {[
          { key: 'all', label: 'All' },
          { key: 'upcoming', label: 'Upcoming' },
          { key: 'past', label: 'Past' },
          { key: 'cancelled', label: 'Cancelled' },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key as any)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              filter === tab.key
                ? 'bg-white text-primary-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Bookings List */}
      {filteredBookings?.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-gray-400 mb-4">
            <Calendar className="h-12 w-12 mx-auto" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No bookings found</h3>
          <p className="text-gray-600">
            {filter === 'all' 
              ? "You haven't made any bookings yet."
              : `No ${filter} bookings found.`
            }
          </p>
        </div>
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
                      <span>{booking.service.duration} minutes</span>
                    </div>
                    
                    <div className="flex items-center text-gray-600">
                      <span className="mr-2">💰</span>
                      <span>${booking.totalAmount}</span>
                    </div>
                  </div>
                  
                  {booking.notes && (
                    <div className="mt-4 p-3 bg-primary-50 rounded-lg">
                      <p className="text-sm text-gray-600">
                        <strong>Notes:</strong> {booking.notes}
                      </p>
                    </div>
                  )}
                  
                  {booking.cancellationReason && (
                    <div className="mt-4 p-3 bg-red-50 rounded-lg">
                      <p className="text-sm text-red-600">
                        <strong>Cancellation Reason:</strong> {booking.cancellationReason}
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
                      Cancel Booking
                    </button>
                  )}
                  
                  {booking.business.phone && (
                    <a
                      href={`tel:${booking.business.phone}`}
                      className="btn btn-outline btn-sm flex items-center justify-center"
                    >
                      <Phone className="h-4 w-4 mr-1" />
                      Call Business
                    </a>
                  )}
                  
                  {booking.qrCode && (
                    <button
                      onClick={() => {
                        // In a real app, you'd show the QR code in a modal
                        alert('QR Code: ' + booking.qrCode);
                      }}
                      className="btn btn-primary btn-sm"
                    >
                      Show QR Code
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Review Prompts for Completed Bookings */}
      {bookings?.map((booking: any) => (
        <BookingReviewPrompt
          key={booking.id}
          bookingId={booking.id}
          onReviewSubmitted={() => refetch()}
        />
      ))}
    </div>
  );
};
