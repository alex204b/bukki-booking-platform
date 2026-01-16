import React, { useState } from 'react';
import { X, AlertTriangle } from 'lucide-react';

interface SuspendBusinessModalProps {
  isOpen: boolean;
  businessName: string;
  onConfirm: (reason: string) => void;
  onCancel: () => void;
}

export const SuspendBusinessModal: React.FC<SuspendBusinessModalProps> = ({
  isOpen,
  businessName,
  onConfirm,
  onCancel,
}) => {
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleConfirm = () => {
    const trimmedReason = reason.trim();
    if (!trimmedReason) {
      setError('Reason for suspension is required');
      return;
    }
    setError('');
    onConfirm(trimmedReason);
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
          >
            <X className="h-5 w-5" />
          </button>

          {/* Content */}
          <div className="p-6">
            <div className="flex items-center justify-center w-12 h-12 mx-auto mb-4 rounded-full bg-yellow-100">
              <AlertTriangle className="h-6 w-6 text-yellow-600" />
            </div>
            
            <h3 className="text-lg font-semibold text-gray-900 text-center mb-2">
              Suspend Business
            </h3>
            
            <p className="text-sm text-gray-600 text-center mb-4">
              Are you sure you want to suspend <strong>{businessName}</strong>? This will hide the business from customers.
            </p>

            {/* Reason input */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Reason for suspension <span className="text-red-500">*</span>
              </label>
              <textarea
                value={reason}
                onChange={(e) => {
                  setReason(e.target.value);
                  if (error && e.target.value.trim()) {
                    setError('');
                  }
                }}
                placeholder="Enter the reason for suspending this business..."
                rows={4}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none ${
                  error ? 'border-red-300 focus:ring-red-500' : 'border-gray-300'
                }`}
              />
              {error && (
                <p className="text-xs text-red-600 mt-1">{error}</p>
              )}
              <p className="text-xs text-gray-500 mt-1">
                This reason will be sent to the business owner
              </p>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={handleCancel}
                className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirm}
                disabled={!reason.trim()}
                className="flex-1 px-4 py-2 text-sm font-medium text-white bg-yellow-600 rounded-md hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Suspend Business
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

