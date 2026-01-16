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
      toast.error(t('calendarUrlNotAvailable'));
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
      toast.success(t('calendarFileDownloaded'));
    } catch (error: any) {
      toast.error(t('failedToDownloadCalendar'));
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
      toast.success(t('bookingLinkCopied'));
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
          <h2 className="text-2xl font-bold text-gray-900 mb-4">{t('bookingNotFound')}</h2>
          <p className="text-gray-600 mb-6">{t('bookingNotFoundMessage')}</p>
          <Link to="/my-bookings" className="btn btn-primary">
            {t('viewMyBookings')}
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
        <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-green-100 to-green-50 rounded-full mb-4 shadow-lg">
          <CheckCircle className="h-10 w-10 text-green-600" />
        </div>
        <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent mb-2">
          {isConfirmed ? t('bookingConfirmed') : isPending ? t('bookingRequested') : t('bookingDetails')}
        </h1>
        <p className="text-gray-600">
          {isConfirmed 
            ? t('bookingConfirmedMessage')
            : isPending
            ? t('bookingRequestedMessage')
            : t('viewBookingDetailsMessage')}
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Booking Details Card */}
        <div className="card p-6 space-y-6 border-2 border-[#330007] shadow-sm hover:shadow-md transition-shadow">
          <h2 className="text-xl font-semibold text-gray-900">{t('bookingDetails')}</h2>
          
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-gradient-to-br from-orange-100 to-orange-50 rounded-lg">
                <Calendar className="h-5 w-5 text-[#E7001E]" />
              </div>
              <div>
                <p className="text-sm text-gray-600">{t('dateAndTime')}</p>
                <p className="font-medium text-gray-900">
                  {new Date(booking.appointmentDate).toLocaleString()}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="p-2 bg-gradient-to-br from-orange-100 to-orange-50 rounded-lg">
                <Clock className="h-5 w-5 text-[#E7001E]" />
              </div>
              <div>
                <p className="text-sm text-gray-600">{t('duration')}</p>
                <p className="font-medium text-gray-900">
                  {booking.service?.duration || 30} {t('minutes')}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="p-2 bg-gradient-to-br from-orange-100 to-orange-50 rounded-lg">
                <User className="h-5 w-5 text-[#E7001E]" />
              </div>
              <div>
                <p className="text-sm text-gray-600">{t('service')}</p>
                <p className="font-medium text-gray-900">{booking.service?.name}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="p-2 bg-gradient-to-br from-orange-100 to-orange-50 rounded-lg">
                <MapPin className="h-5 w-5 text-[#E7001E]" />
              </div>
              <div>
                <p className="text-sm text-gray-600">{t('business')}</p>
                <p className="font-medium text-gray-900">{booking.business?.name}</p>
                {booking.business?.address && (
                  <p className="text-sm text-gray-600 mt-1">{booking.business.address}</p>
                )}
              </div>
            </div>

            {booking.business?.phone && (
              <div className="flex items-start gap-3">
                <div className="p-2 bg-gradient-to-br from-orange-100 to-orange-50 rounded-lg">
                  <Phone className="h-5 w-5 text-[#E7001E]" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">{t('phone')}</p>
                  <a href={`tel:${booking.business.phone}`} className="font-medium text-[#E7001E] hover:underline">
                    {booking.business.phone}
                  </a>
                </div>
              </div>
            )}

            <div className="pt-4 border-t-2 border-[#330007]">
              <p className="text-sm text-gray-600 mb-2">{t('status')}</p>
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
        <div className="card p-6 space-y-4 border-2 border-[#330007] shadow-sm hover:shadow-md transition-shadow">
          <h2 className="text-xl font-semibold text-gray-900">{t('quickActions')}</h2>
          
          <div className="space-y-3">
            {canShowQR && (
              <button
                onClick={() => setShowQRCode(!showQRCode)}
                className="w-full px-4 py-2.5 border-2 border-[#330007] rounded-lg hover:border-[#E7001E] hover:bg-red-50 transition-all flex items-center justify-center gap-2 text-gray-700 hover:text-[#E7001E] font-medium"
              >
                <QrCode className="h-5 w-5" />
                {showQRCode ? t('hide') : t('show')} {t('qrCode')}
              </button>
            )}

            <button
              onClick={handleAddToCalendar}
              className="w-full px-4 py-2.5 border-2 border-[#330007] rounded-lg hover:border-[#E7001E] hover:bg-red-50 transition-all flex items-center justify-center gap-2 text-gray-700 hover:text-[#E7001E] font-medium"
            >
              <Calendar className="h-5 w-5" />
              {t('addToGoogleCalendar')}
            </button>

            <button
              onClick={handleDownloadICal}
              className="w-full px-4 py-2.5 border-2 border-[#330007] rounded-lg hover:border-[#E7001E] hover:bg-red-50 transition-all flex items-center justify-center gap-2 text-gray-700 hover:text-[#E7001E] font-medium"
            >
              <Download className="h-5 w-5" />
              {t('downloadCalendarFile')}
            </button>

            <button
              onClick={handleShare}
              className="w-full px-4 py-2.5 border-2 border-[#330007] rounded-lg hover:border-[#E7001E] hover:bg-red-50 transition-all flex items-center justify-center gap-2 text-gray-700 hover:text-[#E7001E] font-medium"
            >
              <Share2 className="h-5 w-5" />
              {t('shareBooking')}
            </button>

            {booking.business?.id && (
              <Link
                to={`/chat/${booking.business.id}`}
                className="w-full px-4 py-2.5 border-2 border-[#330007] rounded-lg hover:border-[#E7001E] hover:bg-red-50 transition-all flex items-center justify-center gap-2 text-gray-700 hover:text-[#E7001E] font-medium"
              >
                <MessageCircle className="h-5 w-5" />
                {t('messageBusiness')}
              </Link>
            )}

            <Link
              to="/my-bookings"
              className="w-full px-4 py-2.5 bg-[#E7001E] text-white rounded-lg hover:bg-[#c70019] transition-colors flex items-center justify-center gap-2 font-medium shadow-sm"
            >
              {t('viewAllBookings')}
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
                  {t('showQRCodeMessage')}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Important Notes */}
      <div className="card p-6 mt-6 bg-gradient-to-br from-orange-50 via-red-50 to-pink-50 border-2 border-[#330007] shadow-sm">
        <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
          <div className="p-1.5 bg-gradient-to-br from-orange-100 to-red-100 rounded-lg">
            <svg className="w-5 h-5 text-[#E7001E]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          {t('importantInformation')}
        </h3>
        <ul className="space-y-2.5 text-sm text-gray-700">
          <li className="flex items-start gap-2">
            <span className="text-[#E7001E] font-bold mt-0.5">•</span>
            <span>{t('importantNote1')}</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-[#E7001E] font-bold mt-0.5">•</span>
            <span>{t('importantNote2')}</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-[#E7001E] font-bold mt-0.5">•</span>
            <span>{t('importantNote3')}</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-[#E7001E] font-bold mt-0.5">•</span>
            <span>{t('importantNote4')}</span>
          </li>
        </ul>
      </div>
    </div>
  );
};

