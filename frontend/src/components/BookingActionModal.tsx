import React, { useState } from 'react';
import { X, CheckCircle, XCircle, AlertCircle } from 'lucide-react';

interface BookingActionModalProps {
  isOpen: boolean;
  booking: {
    id: string;
    customerName: string;
    serviceName: string;
    appointmentDate: string;
  } | null;
  action: 'accept' | 'reject';
  onConfirm: (reason?: string) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export const BookingActionModal: React.FC<BookingActionModalProps> = ({
  isOpen,
  booking,
  action,
  onConfirm,
  onCancel,
  isLoading = false,
}) => {
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');

  if (!isOpen || !booking) return null;

  const isAccept = action === 'accept';
  const isReject = action === 'reject';

  const handleConfirm = () => {
    if (isReject && !reason.trim()) {
      setError('Reason for rejection is required');
      return;
    }
    setError('');
    onConfirm(isReject ? reason.trim() : undefined);
    setReason(''); // Reset on confirm
  };

  const handleCancel = () => {
    setReason(''); // Reset on cancel
    setError('');
    onCancel();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={handleCancel}
      />
      
      {/* Dialog */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full transform transition-all">
          {/* Close button */}
          <button
            onClick={handleCancel}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
            disabled={isLoading}
          >
            <X className="h-5 w-5" />
          </button>

          {/* Content */}
          <div className="p-6">
            {/* Icon */}
            <div className={`flex items-center justify-center w-12 h-12 mx-auto mb-4 rounded-full ${
              isAccept ? 'bg-green-100' : 'bg-red-100'
            }`}>
              {isAccept ? (
                <CheckCircle className="h-6 w-6 text-green-600" />
              ) : (
                <XCircle className="h-6 w-6 text-red-600" />
              )}
            </div>
            
            <h3 className="text-lg font-semibold text-gray-900 text-center mb-2">
              {isAccept ? 'Accept Booking' : 'Reject Booking'}
            </h3>
            
            <p className="text-sm text-gray-600 text-center mb-4">
              {isAccept ? (
                <>
                  Are you sure you want to accept the booking for <strong>{booking.serviceName}</strong> by <strong>{booking.customerName}</strong>?
                </>
              ) : (
                <>
                  Are you sure you want to reject the booking for <strong>{booking.serviceName}</strong> by <strong>{booking.customerName}</strong>?
                </>
              )}
            </p>

            {/* Booking details */}
            <div className="bg-gray-50 rounded-lg p-4 mb-4">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Service:</span>
                  <span className="font-medium text-gray-900">{booking.serviceName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Customer:</span>
                  <span className="font-medium text-gray-900">{booking.customerName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Date & Time:</span>
                  <span className="font-medium text-gray-900">
                    {new Date(booking.appointmentDate).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>

            {/* Reason input - only for reject */}
            {isReject && (
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Reason for rejection <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={reason}
                  onChange={(e) => {
                    setReason(e.target.value);
                    if (error && e.target.value.trim()) {
                      setError('');
                    }
                  }}
                  placeholder="Enter the reason for rejecting this booking..."
                  rows={4}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none ${
                    error ? 'border-red-300 focus:ring-red-500' : 'border-gray-300'
                  }`}
                  disabled={isLoading}
                />
                {error && (
                  <p className="text-xs text-red-600 mt-1">{error}</p>
                )}
                <p className="text-xs text-gray-500 mt-1">
                  This reason will be sent to the customer
                </p>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={handleCancel}
                disabled={isLoading}
                className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirm}
                disabled={isLoading || (isReject && !reason.trim())}
                className={`flex-1 px-4 py-2 text-sm font-medium text-white rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 ${
                  isAccept 
                    ? 'bg-green-600 hover:bg-green-700 focus:ring-green-500' 
                    : 'bg-red-600 hover:bg-red-700 focus:ring-red-500'
                }`}
              >
                {isLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    {isAccept ? 'Accepting...' : 'Rejecting...'}
                  </>
                ) : (
                  <>
                    {isAccept ? (
                      <>
                        <CheckCircle className="h-4 w-4" />
                        Accept Booking
                      </>
                    ) : (
                      <>
                        <XCircle className="h-4 w-4" />
                        Reject Booking
                      </>
                    )}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

