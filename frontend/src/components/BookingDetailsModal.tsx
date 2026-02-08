import React from 'react';
import { X, Calendar, Clock, MapPin, Phone, User, CheckCircle, XCircle, AlertCircle, FileText, MessageCircle } from 'lucide-react';
import { format } from 'date-fns';
import { useI18n } from '../contexts/I18nContext';
import { useCurrency } from '../contexts/CurrencyContext';
import { QRCodeSVG } from 'qrcode.react';
import { useNavigate } from 'react-router-dom';

interface BookingDetailsModalProps {
  booking: {
    id: string;
    appointmentDate: string;
    status: string;
    notes?: string;
    business: {
      id?: string;
      name: string;
      address?: string;
      phone?: string;
      category?: string;
    };
    service: {
      name: string;
      duration: number;
    };
    customer?: {
      id?: string;
      firstName: string;
      lastName: string;
      email?: string;
    };
    totalAmount?: number;
  };
  onClose: () => void;
  onCancel?: () => void;
  onShowQR?: () => void;
  isBusinessOwner?: boolean;
  currentUserId?: string; // Add current user ID to check if user is the customer
}

export const BookingDetailsModal: React.FC<BookingDetailsModalProps> = ({
  booking,
  onClose,
  onCancel,
  onShowQR,
  isBusinessOwner = false,
  currentUserId,
}) => {
  const { t } = useI18n();
  const { formatPrice } = useCurrency();
  const navigate = useNavigate();

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'confirmed':
        return {
          color: 'bg-green-100 text-green-800 border-green-200',
          icon: <CheckCircle className="h-5 w-5" />,
          label: t('confirmed') || 'Confirmed',
        };
      case 'pending':
        return {
          color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
          icon: <AlertCircle className="h-5 w-5" />,
          label: t('pending') || 'Pending',
        };
      case 'cancelled':
        return {
          color: 'bg-red-100 text-red-800 border-red-200',
          icon: <XCircle className="h-5 w-5" />,
          label: t('cancelled') || 'Cancelled',
        };
      case 'completed':
        return {
          color: 'bg-blue-100 text-blue-800 border-blue-200',
          icon: <CheckCircle className="h-5 w-5" />,
          label: t('completed') || 'Completed',
        };
      default:
        return {
          color: 'bg-gray-100 text-gray-800 border-gray-200',
          icon: <AlertCircle className="h-5 w-5" />,
          label: status,
        };
    }
  };

  const statusConfig = getStatusConfig(booking.status);
  const appointmentDate = new Date(booking.appointmentDate);
  const endDate = new Date(appointmentDate.getTime() + booking.service.duration * 60000);

  // Generate QR code data (same format as backend)
  const qrData = JSON.stringify({
    bookingId: booking.id,
    type: 'booking_checkin',
    timestamp: new Date().toISOString(),
  });

  // Show QR code if:
  // 1. The current user is the customer for this booking (regardless of their role)
  // 2. The booking status is confirmed (only confirmed bookings show QR codes)
  // Business owners/employees viewing their own business bookings should NOT see QR codes
  // But if they made a booking as a customer at another business, they SHOULD see the QR code
  const bookingStatus = (booking.status || '').toLowerCase();
  const isConfirmed = bookingStatus === 'confirmed';
  
  // Check if current user is the customer - try multiple ways to match
  const customerId = booking.customer?.id;
  const isCurrentUserTheCustomer = currentUserId && customerId && currentUserId === customerId;
  
  // Fallback: If customer ID is not available but user is NOT a business owner, assume they're the customer
  // This handles cases where customer ID might not be in the booking data
  const showQRCode = isConfirmed && (isCurrentUserTheCustomer || (!isBusinessOwner && !customerId));
  
  // Debug logging
  console.log('[BookingDetailsModal] QR Code visibility check:', {
    isBusinessOwner,
    currentUserId,
    customerId: booking.customer?.id,
    hasCustomerId: !!customerId,
    isCurrentUserTheCustomer,
    bookingStatus: booking.status,
    normalizedStatus: bookingStatus,
    isConfirmed,
    showQRCode,
    fallbackUsed: !customerId && !isBusinessOwner,
  });

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={onClose}
      />
      
      {/* Dialog */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full transform transition-all">
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>

          {/* Content */}
          <div className="p-6">
            {/* Icon and Title */}
            <div className="flex items-center justify-center w-12 h-12 mx-auto mb-4 rounded-full bg-red-100">
              {React.cloneElement(statusConfig.icon, { className: 'h-6 w-6 text-[#E7001E]' })}
            </div>
            
            <h3 className="text-lg font-semibold text-gray-900 text-center mb-2">
              {booking.service.name}
            </h3>
            
            <p className="text-sm text-gray-600 text-center mb-4">
              {booking.business.name}
            </p>

            {/* Status Badge */}
            <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm mb-4 mx-auto ${statusConfig.color}`}>
              {statusConfig.icon}
              <span className="font-medium">{statusConfig.label}</span>
            </div>

            {/* Booking Details */}
            <div className="space-y-3 mb-4">
              {/* Date & Time */}
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="h-4 w-4 text-gray-500" />
                <span className="text-gray-700">
                  {format(appointmentDate, 'MMM d, yyyy')} at {format(appointmentDate, 'h:mm a')} - {format(endDate, 'h:mm a')}
                </span>
              </div>

              {/* Duration */}
              <div className="flex items-center gap-2 text-sm">
                <Clock className="h-4 w-4 text-gray-500" />
                <span className="text-gray-700">{booking.service.duration} {t('minutes')}</span>
              </div>

              {/* Business Address */}
              {booking.business.address && (
                <div className="flex items-center gap-2 text-sm">
                  <MapPin className="h-4 w-4 text-gray-500" />
                  <span className="text-gray-700">{booking.business.address}</span>
                </div>
              )}

              {/* Customer Info (for business owners) */}
              {isBusinessOwner && booking.customer && (
                <div className="flex items-center gap-2 text-sm">
                  <User className="h-4 w-4 text-gray-500" />
                  <span className="text-gray-700">
                    {booking.customer.firstName} {booking.customer.lastName}
                    {booking.customer.email && ` (${booking.customer.email})`}
                  </span>
                </div>
              )}

              {/* Phone */}
              {booking.business.phone && (
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="h-4 w-4 text-gray-500" />
                  <a href={`tel:${booking.business.phone}`} className="text-primary-600 hover:text-primary-700">
                    {booking.business.phone}
                  </a>
                </div>
              )}

              {/* Total Amount */}
              {booking.totalAmount && (
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <span className="text-gray-700">Total: {formatPrice(Number(booking.totalAmount || 0))}</span>
                </div>
              )}
            </div>

            {/* Notes */}
            {booking.notes && (
              <div className="mb-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
                <div className="flex items-start gap-2">
                  <FileText className="h-4 w-4 text-gray-500 mt-0.5" />
                  <p className="text-sm text-gray-800">{booking.notes}</p>
                </div>
              </div>
            )}

            {/* QR Code */}
            {showQRCode && (
              <div className="mb-4 flex flex-col items-center">
                <p className="text-xs text-gray-600 mb-2 text-center">
                  {t('showQRCodeToBusiness') || 'Show this QR code at the business for check-in'}
                </p>
                <div className="bg-white p-3 rounded-lg border-2 border-gray-200">
                  <QRCodeSVG
                    value={qrData}
                    size={200}
                    level="H"
                    includeMargin={true}
                  />
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex flex-col gap-3 mt-6">
              {/* Message Business Button - Show for customers and employees (when viewing their personal bookings) */}
              {/* Hide for business owners viewing bookings for their own business */}
              {booking.business.id && (
                (() => {
                  // Show message button if:
                  // 1. User is NOT a business owner (customers can always message)
                  // 2. OR user is viewing their personal booking (they made it as a customer)
                  const isPersonalBooking = currentUserId && booking.customer?.id && currentUserId === booking.customer.id;
                  const shouldShowMessage = !isBusinessOwner || isPersonalBooking;
                  
                  return shouldShowMessage ? (
                    <button
                      onClick={() => {
                        onClose();
                        navigate(`/chat/${booking.business.id}`);
                      }}
                      className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white bg-[#E7001E] border border-[#E7001E] rounded-md hover:bg-[#c50018] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#E7001E] transition-colors"
                    >
                      <MessageCircle className="h-4 w-4" />
                      {t('messageBusiness')}
                    </button>
                  ) : null;
                })()
              )}
              
              {/* Other Actions */}
              <div className="flex gap-3">
                {onCancel && booking.status !== 'cancelled' && (
                  <button
                    onClick={onCancel}
                    className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors"
                  >
                    {t('cancelBooking')}
                  </button>
                )}
                <button
                  onClick={onClose}
                  className="flex-1 px-4 py-2 text-sm font-medium text-white bg-[#E7001E] rounded-md hover:bg-[#c50018] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#E7001E] transition-colors"
                >
                  {t('close')}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

