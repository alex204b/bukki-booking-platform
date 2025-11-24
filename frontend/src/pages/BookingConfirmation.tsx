import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery } from 'react-query';
import { bookingService, calendarService } from '../services/api';
import { CheckCircle, Calendar, Clock, MapPin, User, Phone, Mail, QrCode, Download, Share2, MessageCircle } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { useI18n } from '../contexts/I18nContext';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';

export const BookingConfirmation: React.FC = () => {
  const { bookingId } = useParams<{ bookingId: string }>();
  const navigate = useNavigate();
  const { t } = useI18n();
  const { user } = useAuth();
  const [showQRCode, setShowQRCode] = useState(false);
  const [calendarUrl, setCalendarUrl] = useState('');

  const { data: booking, isLoading } = useQuery(
    ['booking', bookingId],
    () => bookingService.getById(bookingId!),
    {
      enabled: !!bookingId,
      select: (response) => response.data,
      onSuccess: (data) => {
        // Generate calendar URL
        if (data?.appointmentDate && data?.service && data?.business) {
          const start = new Date(data.appointmentDate).toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
          const end = new Date(data.appointmentEndDate || new Date(new Date(data.appointmentDate).getTime() + (data.service.duration || 30) * 60000)).toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
          const title = encodeURIComponent(`${data.service.name} at ${data.business.name}`);
          const details = encodeURIComponent(`Service: ${data.service.name}\nBusiness: ${data.business.name}`);
          const location = encodeURIComponent(data.business.address || '');
          setCalendarUrl(`https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${start}/${end}&details=${details}&location=${location}`);
        }
      },
    }
  );

  const handleAddToCalendar = () => {
    if (calendarUrl) {
      window.open(calendarUrl, '_blank');
    } else {
      toast.error('Calendar URL not available');
    }
  };

  const handleDownloadICal = async () => {
    try {
      const response = await calendarService.downloadICal(bookingId!);
      const blob = new Blob([response.data], { type: 'text/calendar' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `booking-${bookingId}.ics`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      toast.success('Calendar file downloaded');
    } catch (error: any) {
      toast.error('Failed to download calendar file');
    }
  };

  const handleShare = async () => {
    if (navigator.share && booking) {
      try {
        await navigator.share({
          title: `Booking at ${booking.business?.name}`,
          text: `I have a booking for ${booking.service?.name} on ${new Date(booking.appointmentDate).toLocaleString()}`,
          url: window.location.href,
        });
      } catch (error) {
        // User cancelled or error
      }
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(window.location.href);
      toast.success('Booking link copied to clipboard');
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="card p-8 text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Booking Not Found</h2>
          <p className="text-gray-600 mb-6">The booking you're looking for doesn't exist or has been removed.</p>
          <Link to="/my-bookings" className="btn btn-primary">
            View My Bookings
          </Link>
        </div>
      </div>
    );
  }

  const isConfirmed = booking.status === 'confirmed';
  const isPending = booking.status === 'pending';
  // Only show QR code for confirmed bookings
  const canShowQR = isConfirmed;

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* Success Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 rounded-full mb-4">
          <CheckCircle className="h-10 w-10 text-green-600" />
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          {isConfirmed ? 'Booking Confirmed!' : isPending ? 'Booking Requested!' : 'Booking Details'}
        </h1>
        <p className="text-gray-600">
          {isConfirmed 
            ? 'Your booking has been confirmed. We look forward to seeing you!'
            : isPending
            ? 'Your booking request has been submitted. You\'ll be notified once it\'s confirmed.'
            : 'View your booking details below.'}
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Booking Details Card */}
        <div className="card p-6 space-y-6">
          <h2 className="text-xl font-semibold text-gray-900">Booking Details</h2>
          
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <Calendar className="h-5 w-5 text-primary-600 mt-0.5" />
              <div>
                <p className="text-sm text-gray-600">Date & Time</p>
                <p className="font-medium text-gray-900">
                  {new Date(booking.appointmentDate).toLocaleString()}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Clock className="h-5 w-5 text-primary-600 mt-0.5" />
              <div>
                <p className="text-sm text-gray-600">Duration</p>
                <p className="font-medium text-gray-900">
                  {booking.service?.duration || 30} minutes
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <User className="h-5 w-5 text-primary-600 mt-0.5" />
              <div>
                <p className="text-sm text-gray-600">Service</p>
                <p className="font-medium text-gray-900">{booking.service?.name}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <MapPin className="h-5 w-5 text-primary-600 mt-0.5" />
              <div>
                <p className="text-sm text-gray-600">Business</p>
                <p className="font-medium text-gray-900">{booking.business?.name}</p>
                {booking.business?.address && (
                  <p className="text-sm text-gray-600 mt-1">{booking.business.address}</p>
                )}
              </div>
            </div>

            {booking.business?.phone && (
              <div className="flex items-start gap-3">
                <Phone className="h-5 w-5 text-primary-600 mt-0.5" />
                <div>
                  <p className="text-sm text-gray-600">Phone</p>
                  <a href={`tel:${booking.business.phone}`} className="font-medium text-primary-600 hover:underline">
                    {booking.business.phone}
                  </a>
                </div>
              </div>
            )}

            <div className="pt-4 border-t">
              <p className="text-sm text-gray-600 mb-2">Status</p>
              <span className={`inline-flex px-3 py-1 rounded-full text-sm font-medium ${
                isConfirmed 
                  ? 'bg-green-100 text-green-800'
                  : isPending
                  ? 'bg-yellow-100 text-yellow-800'
                  : 'bg-gray-100 text-gray-800'
              }`}>
                {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
              </span>
            </div>
          </div>
        </div>

        {/* Actions Card */}
        <div className="card p-6 space-y-4">
          <h2 className="text-xl font-semibold text-gray-900">Quick Actions</h2>
          
          <div className="space-y-3">
            {canShowQR && (
              <button
                onClick={() => setShowQRCode(!showQRCode)}
                className="w-full btn btn-outline flex items-center justify-center gap-2"
              >
                <QrCode className="h-5 w-5" />
                {showQRCode ? 'Hide' : 'Show'} QR Code
              </button>
            )}

            <button
              onClick={handleAddToCalendar}
              className="w-full btn btn-outline flex items-center justify-center gap-2"
            >
              <Calendar className="h-5 w-5" />
              Add to Google Calendar
            </button>

            <button
              onClick={handleDownloadICal}
              className="w-full btn btn-outline flex items-center justify-center gap-2"
            >
              <Download className="h-5 w-5" />
              Download Calendar File
            </button>

            <button
              onClick={handleShare}
              className="w-full btn btn-outline flex items-center justify-center gap-2"
            >
              <Share2 className="h-5 w-5" />
              Share Booking
            </button>

            {booking.business?.id && (
              <Link
                to={`/chat/${booking.business.id}`}
                className="w-full btn btn-outline flex items-center justify-center gap-2"
              >
                <MessageCircle className="h-5 w-5" />
                Message Business
              </Link>
            )}

            <Link
              to="/my-bookings"
              className="w-full btn btn-primary"
            >
              View All Bookings
            </Link>
          </div>

          {/* QR Code Display */}
          {showQRCode && canShowQR && (
            <div className="pt-4 border-t">
              <div className="bg-white p-4 rounded-lg border-2 border-gray-200 flex flex-col items-center space-y-2">
                {booking.qrCode ? (
                  <img src={booking.qrCode} alt="QR Code" className="w-48 h-48" />
                ) : (
                  <QRCodeSVG
                    value={JSON.stringify({
                      bookingId: booking.id,
                      type: 'booking_checkin',
                      timestamp: new Date().toISOString(),
                    })}
                    size={192}
                    level="H"
                    includeMargin={true}
                  />
                )}
                <p className="text-sm text-gray-600 text-center">
                  Show this QR code to the business when you arrive
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Important Notes */}
      <div className="card p-6 mt-6 bg-blue-50 border border-blue-200">
        <h3 className="font-semibold text-gray-900 mb-2">Important Information</h3>
        <ul className="space-y-2 text-sm text-gray-700">
          <li>• Please arrive 5 minutes before your appointment time</li>
          <li>• Bring your QR code or booking confirmation</li>
          <li>• If you need to cancel or reschedule, please do so at least 24 hours in advance</li>
          <li>• Contact the business directly if you have any questions</li>
        </ul>
      </div>
    </div>
  );
};

