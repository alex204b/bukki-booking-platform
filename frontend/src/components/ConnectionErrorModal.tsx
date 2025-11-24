import React, { useState, useEffect } from 'react';
import { X, Check, XCircle, RefreshCw } from 'lucide-react';

interface ConnectionErrorModalProps {
  isOpen: boolean;
  onClose: () => void;
  baseURL: string;
  isMobile: boolean;
}

export const ConnectionErrorModal: React.FC<ConnectionErrorModalProps> = ({
  isOpen,
  onClose,
  baseURL,
  isMobile,
}) => {
  const [checks, setChecks] = useState({
    backendRunning: false,
    adbReverse: false,
    phoneConnected: false,
  });

  // Auto-check status (simplified - in real app, you'd ping the backend)
  useEffect(() => {
    if (isOpen) {
      // Reset checks when modal opens
      setChecks({
        backendRunning: false,
        adbReverse: false,
        phoneConnected: false,
      });

      // Try to check backend status
      // Extract base URL (remove any path)
      const baseUrl = baseURL.split('/auth')[0] || baseURL.split('/api')[0] || baseURL;
      const healthUrl = `${baseUrl}/health`;
      
      // Create abort controller for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);
      
      fetch(healthUrl, { method: 'GET', signal: controller.signal })
        .then(() => {
          clearTimeout(timeoutId);
          setChecks(prev => ({ ...prev, backendRunning: true }));
        })
        .catch(() => {
          clearTimeout(timeoutId);
          setChecks(prev => ({ ...prev, backendRunning: false }));
        });
    }
  }, [isOpen, baseURL]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-gray-800 rounded-lg shadow-2xl max-w-md w-full p-6 relative">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Header */}
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-white mb-2">
            Cannot connect to server at {baseURL}
          </h3>
          <p className="text-sm text-gray-400">Make sure:</p>
        </div>

        {/* Checklist */}
        <div className="space-y-3 mb-6">
          {isMobile ? (
            <>
              <div className="flex items-start gap-3">
                <div className="mt-0.5">
                  {checks.backendRunning ? (
                    <Check className="h-5 w-5 text-green-500" />
                  ) : (
                    <XCircle className="h-5 w-5 text-gray-500" />
                  )}
                </div>
                <div className="flex-1">
                  <p className="text-sm text-gray-300">
                    Backend is running on port 3000
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="mt-0.5">
                  {checks.adbReverse ? (
                    <Check className="h-5 w-5 text-green-500" />
                  ) : (
                    <XCircle className="h-5 w-5 text-red-500" />
                  )}
                </div>
                <div className="flex-1">
                  <p className="text-sm text-gray-300">
                    ADB reverse is set: <code className="text-orange-400 bg-gray-900 px-1 py-0.5 rounded text-xs">adb reverse tcp:3000 tcp:3000</code>
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="mt-0.5">
                  {checks.phoneConnected ? (
                    <Check className="h-5 w-5 text-green-500" />
                  ) : (
                    <XCircle className="h-5 w-5 text-gray-500" />
                  )}
                </div>
                <div className="flex-1">
                  <p className="text-sm text-gray-300">
                    Phone is connected via USB
                  </p>
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="flex items-start gap-3">
                <div className="mt-0.5">
                  {checks.backendRunning ? (
                    <Check className="h-5 w-5 text-green-500" />
                  ) : (
                    <XCircle className="h-5 w-5 text-gray-500" />
                  )}
                </div>
                <div className="flex-1">
                  <p className="text-sm text-gray-300">
                    Backend is running (npm start in backend folder)
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="mt-0.5">
                  <XCircle className="h-5 w-5 text-gray-500" />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-gray-300">
                    Backend is accessible at {baseURL}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="mt-0.5">
                  <XCircle className="h-5 w-5 text-gray-500" />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-gray-300">
                    No firewall is blocking the connection
                  </p>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={() => {
              // Try to reconnect
              window.location.reload();
            }}
            className="flex-1 flex items-center justify-center gap-2 bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg transition-colors text-sm font-medium"
          >
            <RefreshCw className="h-4 w-4" />
            Retry Connection
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors text-sm font-medium"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

