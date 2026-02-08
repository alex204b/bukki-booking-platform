import React, { useState } from 'react';
import { X, AlertCircle } from 'lucide-react';
import { useI18n } from '../contexts/I18nContext';

interface RejectBookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void | Promise<void>;
  customerName?: string;
  serviceName?: string;
  isLoading?: boolean;
}

export const RejectBookingModal: React.FC<RejectBookingModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  customerName,
  serviceName,
  isLoading = false,
}) => {
  const { t } = useI18n();
  const [reason, setReason] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) return;
    await onConfirm(reason.trim());
    setReason('');
    onClose();
  };

  const handleCancel = () => {
    setReason('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
        <div className="p-5 border-b border-gray-200 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center">
              <AlertCircle className="h-5 w-5 text-[#E7001E]" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900">
              {t('rejectBooking') || 'Reject booking'}
            </h2>
          </div>
          <button
            type="button"
            onClick={handleCancel}
            className="p-2 rounded-lg text-gray-500 hover:bg-gray-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {(customerName || serviceName) && (
            <p className="text-sm text-gray-600">
              {serviceName && customerName && (
                <span>
                  {t('bookingFor') || 'Booking for'} <strong>{serviceName}</strong> {t('by') || 'by'} <strong>{customerName}</strong>
                </span>
              )}
              {serviceName && !customerName && (
                <span>{t('bookingFor') || 'Booking for'} <strong>{serviceName}</strong></span>
              )}
              {customerName && !serviceName && (
                <span>{t('by') || 'By'} <strong>{customerName}</strong></span>
              )}
            </p>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('rejectionReason') || 'Please provide a reason for rejection'} *
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={t('rejectionReasonPlaceholder') || 'e.g. No availability at that time...'}
              rows={3}
              required
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-[#E7001E] focus:border-[#E7001E] resize-none"
            />
            <p className="text-xs text-gray-500 mt-1">
              {t('rejectionReasonSentToClient') || 'This message will be sent to the client in their conversation.'}
            </p>
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={handleCancel}
              className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg"
            >
              {t('cancel') || 'Cancel'}
            </button>
            <button
              type="submit"
              disabled={!reason.trim() || isLoading}
              className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-[#E7001E] hover:bg-[#c50018] rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? '...' : (t('reject') || 'Reject')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
