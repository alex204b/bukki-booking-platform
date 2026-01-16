import React from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { X } from 'lucide-react';
import { useI18n } from '../contexts/I18nContext';

interface QRCodeDisplayProps {
  bookingId: string;
  onClose: () => void;
}

export const QRCodeDisplay: React.FC<QRCodeDisplayProps> = ({ bookingId, onClose }) => {
  const { t } = useI18n();
  
  // Generate QR code data (same format as backend)
  const qrData = JSON.stringify({
    bookingId,
    type: 'booking_checkin',
    timestamp: new Date().toISOString(),
  });

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg p-6 max-w-md w-full">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold text-gray-900">{t('bookingQRCode')}</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>
        
        <div className="flex flex-col items-center space-y-4">
          <div className="bg-white p-4 rounded-lg border-2 border-gray-200">
            <QRCodeSVG
              value={qrData}
              size={256}
              level="H"
              includeMargin={true}
            />
          </div>
          
          <p className="text-sm text-gray-600 text-center">
            {t('showQRCodeToBusiness')}
          </p>
        </div>
        
        <button
          onClick={onClose}
          className="mt-6 w-full px-4 py-2 text-sm font-medium text-white bg-[#E7001E] rounded-md hover:bg-[#c50018] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#E7001E] transition-colors"
        >
          {t('close')}
        </button>
      </div>
    </div>
  );
};
