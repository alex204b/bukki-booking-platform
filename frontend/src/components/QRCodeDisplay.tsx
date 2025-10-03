import React from 'react';
import QRCode from 'qrcode.react';
import { X } from 'lucide-react';

interface QRCodeDisplayProps {
  value: string;
  isOpen: boolean;
  onClose: () => void;
  title?: string;
}

export const QRCodeDisplay: React.FC<QRCodeDisplayProps> = ({
  value,
  isOpen,
  onClose,
  title = 'QR Code'
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-sm w-full mx-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-6 w-6" />
          </button>
        </div>
        
        <div className="flex justify-center mb-4">
          <QRCode
            value={value}
            size={200}
            level="M"
            includeMargin={true}
          />
        </div>
        
        <p className="text-sm text-gray-600 text-center">
          Show this QR code at the business for check-in
        </p>
        
        <div className="mt-4 flex justify-center">
          <button
            onClick={onClose}
            className="btn btn-primary"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
