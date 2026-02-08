import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { X, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { bookingService } from '../services/api';
import toast from 'react-hot-toast';
import { useI18n } from '../contexts/I18nContext';

// Check if we're in Capacitor (mobile app)
const isCapacitor = () => {
  return !!(window as any).Capacitor || window.location.protocol === 'capacitor:';
};

// Request camera permission for mobile
// On Android, trying to access the camera will automatically trigger the permission prompt
// if the permission is declared in AndroidManifest.xml (which we've added)
const requestCameraPermission = async (): Promise<boolean> => {
  if (!isCapacitor()) {
    // For web, browser will handle permissions automatically
    return true;
  }

  // For Capacitor/mobile, try to access camera directly
  // This will trigger Android's permission prompt if not already granted
  // The permission is declared in AndroidManifest.xml
  try {
    const devices = await Html5Qrcode.getCameras();
    console.log('[QRScanner] Camera permission check - found devices:', devices.length);
    return devices.length > 0;
  } catch (err: any) {
    console.warn('[QRScanner] Camera permission check failed:', err);
    // If it's a permission error, Android should have shown a prompt
    // Return true to proceed - the actual start() call will handle the error
    return true;
  }
};

interface QRCodeScannerProps {
  onClose: () => void;
  onSuccess?: (booking: any) => void;
}

export const QRCodeScanner: React.FC<QRCodeScannerProps> = ({ onClose, onSuccess }) => {
  const { t } = useI18n();
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string; booking?: any } | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const scannerStartedRef = useRef(false); // Track if scanner was successfully started
  const hasScannedRef = useRef(false); // Track if we've already scanned a code
  const lastScannedCodeRef = useRef<string | null>(null); // Track last scanned code to prevent duplicates

  useEffect(() => {
    let isMounted = true;
    const startScanning = async () => {
      try {
        // Request camera permission first (especially important for mobile)
        const hasPermission = await requestCameraPermission();
        if (!hasPermission) {
          if (isMounted) {
            setCameraError('Camera permission denied. Please enable camera access in your device settings.');
            toast.error('Camera permission denied. Please enable camera access in device settings.');
          }
          return;
        }

        const html5QrCode = new Html5Qrcode('qr-reader');
        scannerRef.current = html5QrCode;

        // Try to get camera devices
        let devices: any[] = [];
        try {
          devices = await Html5Qrcode.getCameras();
          if (devices.length === 0) {
            throw new Error('No cameras found');
          }
          console.log('[QRScanner] Available cameras:', devices.length);
        } catch (permErr: any) {
          console.error('[QRScanner] Camera access error:', permErr);
          if (isMounted) {
            let errorMsg = 'Camera access denied.';
            if (isCapacitor()) {
              errorMsg = 'Camera permission required. Please enable camera access in your device settings (Settings > Apps > BUKKi > Permissions > Camera).';
            } else {
              errorMsg = 'Camera access denied. Please allow camera permissions in your browser settings.';
            }
            setCameraError(errorMsg);
            toast.error(errorMsg);
          }
          return;
        }

        await html5QrCode.start(
          { facingMode: 'environment' }, // Use back camera
          {
            fps: 10,
            qrbox: { width: 250, height: 250 },
            aspectRatio: 1.0,
          },
          (decodedText) => {
            // QR code scanned successfully
            // Prevent multiple scans of the same code or while processing
            if (isMounted && !isProcessing && !hasScannedRef.current && lastScannedCodeRef.current !== decodedText) {
              hasScannedRef.current = true; // Mark as scanned immediately
              lastScannedCodeRef.current = decodedText;
              handleScan(decodedText);
            }
          },
          (errorMessage) => {
            // Ignore scanning errors (they're frequent during scanning)
            // Only log if it's not a common scanning error
            if (!errorMessage.includes('NotFoundException') && !errorMessage.includes('No QR code')) {
              console.debug('[QRScanner] Scanning error:', errorMessage);
            }
          }
        );

        if (isMounted) {
          scannerStartedRef.current = true;
          setScanning(true);
          setCameraError(null);
        }
      } catch (err: any) {
        console.error('[QRScanner] Error starting scanner:', err);
        if (isMounted) {
          scannerStartedRef.current = false;
          setScanning(false);
          
          let errorMessage = t('failedToStartCamera') || 'Failed to start camera.';
          if (err.message?.includes('NotAllowedError') || err.name === 'NotAllowedError') {
            errorMessage = 'Camera permission denied. Please allow camera access in your browser settings.';
          } else if (err.message?.includes('NotFoundError') || err.name === 'NotFoundError') {
            errorMessage = 'No camera found. Please connect a camera device.';
          } else if (err.message?.includes('NotReadableError') || err.name === 'NotReadableError') {
            errorMessage = 'Camera is already in use by another application.';
          }
          
          setCameraError(errorMessage);
          toast.error(errorMessage);
        }
      }
    };

    startScanning();

    return () => {
      isMounted = false;
      // Only try to stop if scanner was actually started
      if (scannerRef.current && scannerStartedRef.current) {
        scannerRef.current.stop()
          .then(() => {
            console.log('[QRScanner] Scanner stopped successfully');
            scannerRef.current = null;
            scannerStartedRef.current = false;
          })
          .catch((err: any) => {
            // Ignore stop errors - scanner might already be stopped
            console.debug('[QRScanner] Error stopping scanner (ignored):', err.message);
            scannerRef.current = null;
            scannerStartedRef.current = false;
          });
      } else {
        scannerRef.current = null;
        scannerStartedRef.current = false;
      }
    };
  }, []);

  const handleScan = async (qrData: string) => {
    if (isProcessing || hasScannedRef.current) return; // Prevent multiple simultaneous scans

    setIsProcessing(true);

    // Stop scanning IMMEDIATELY - only if scanner is actually running
    if (scannerRef.current && scanning && scannerStartedRef.current) {
      try {
        await scannerRef.current.stop();
        setScanning(false);
        scannerStartedRef.current = false;
      } catch (err: any) {
        // Ignore stop errors - scanner might already be stopped
        console.debug('[QRScanner] Error stopping scanner in handleScan (ignored):', err.message);
        scannerStartedRef.current = false;
      }
    }

    try {
      const response = await bookingService.validateQR(qrData);
      const data = response.data;

      setResult(data);

      if (data.success) {
        toast.success(data.message);
        if (onSuccess) {
          onSuccess(data.booking);
        }
        // Auto-close after 3 seconds on success
        setTimeout(() => {
          onClose();
        }, 3000);
      } else {
        // Show error but DON'T auto-resume - let user manually retry
        toast.error(data.message, { duration: 4000 });
        // Reset flags so user can scan again manually
        hasScannedRef.current = false;
        lastScannedCodeRef.current = null;
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || t('invalidQRCode') || 'Invalid QR code';
      setResult({
        success: false,
        message: errorMessage,
      });
      toast.error(errorMessage, { duration: 4000 });
      // Reset flags so user can scan again manually
      hasScannedRef.current = false;
      lastScannedCodeRef.current = null;
    } finally {
      setIsProcessing(false);
    }
  };

  const resumeScanning = async () => {
    // Reset scanning flags
    hasScannedRef.current = false;
    lastScannedCodeRef.current = null;
    setIsProcessing(false);

    if (!scannerRef.current) {
      // Recreate scanner if it was destroyed
      try {
        scannerRef.current = new Html5Qrcode('qr-reader');
      } catch (err) {
        console.error('[QRScanner] Error recreating scanner:', err);
        toast.error('Failed to restart scanner. Please close and try again.');
        return;
      }
    }

    try {
      await scannerRef.current.start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0,
        },
        (decodedText) => {
          // Prevent multiple scans
          if (!isProcessing && !hasScannedRef.current && lastScannedCodeRef.current !== decodedText) {
            hasScannedRef.current = true;
            lastScannedCodeRef.current = decodedText;
            handleScan(decodedText);
          }
        },
        () => {
          // Ignore scanning errors
        }
      );
      scannerStartedRef.current = true;
      setScanning(true);
      setResult(null);
      setCameraError(null);
    } catch (err: any) {
      console.error('[QRScanner] Error resuming scanner:', err);
      scannerStartedRef.current = false;
      setScanning(false);
      let errorMessage = 'Failed to restart camera.';
      if (err.message?.includes('NotAllowedError') || err.name === 'NotAllowedError') {
        errorMessage = 'Camera permission denied. Please allow camera access.';
      }
      setCameraError(errorMessage);
      toast.error(errorMessage, { duration: 3000 });
    }
  };

  const handleClose = async () => {
    // Only try to stop if scanner was actually started
    if (scannerRef.current && scannerStartedRef.current) {
      try {
        await scannerRef.current.stop();
        scannerStartedRef.current = false;
      } catch (err: any) {
        // Ignore stop errors - scanner might already be stopped
        console.debug('[QRScanner] Error stopping scanner in handleClose (ignored):', err.message);
        scannerStartedRef.current = false;
      }
      scannerRef.current = null;
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 relative">
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 text-white bg-black bg-opacity-50 rounded-full p-2 hover:bg-opacity-70 transition-colors z-10"
        >
          <X className="h-6 w-6" />
        </button>

        <div className="mb-4">
          <h3 className="text-xl font-bold text-gray-900 mb-2">{t('scanQRCode')}</h3>
          <p className="text-sm text-gray-600">{t('pointCameraAtQRCode')}</p>
        </div>

        <div className="relative">
          <div id="qr-reader" className="w-full rounded-lg overflow-hidden bg-black min-h-[300px]"></div>
          
          {!scanning && !result && !cameraError && (
            <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 rounded-lg">
              <div className="text-white text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-2"></div>
                <p>{t('startingCamera') || 'Starting camera...'}</p>
              </div>
            </div>
          )}

          {cameraError && (
            <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-75 rounded-lg">
              <div className="text-white text-center p-4 max-w-sm">
                <AlertCircle className="h-12 w-12 mx-auto mb-4 text-red-400" />
                <p className="text-lg font-semibold mb-2">Camera Error</p>
                <p className="text-sm mb-4">{cameraError}</p>
                {isCapacitor() && (
                  <div className="mb-4 p-3 bg-yellow-900 bg-opacity-50 rounded-lg text-xs text-left">
                    <p className="font-semibold mb-2">To enable camera on Android:</p>
                    <ol className="list-decimal list-inside space-y-1 text-left">
                      <li>Go to Settings on your phone</li>
                      <li>Apps → BUKKi</li>
                      <li>Permissions → Camera</li>
                      <li>Select "Allow"</li>
                      <li>Return to the app and try again</li>
                    </ol>
                  </div>
                )}
                <div className="flex gap-2">
                  <button
                    onClick={resumeScanning}
                    className="flex-1 btn btn-primary"
                  >
                    {t('scanAgain') || 'Try Again'}
                  </button>
                  <button
                    onClick={onClose}
                    className="flex-1 btn btn-outline bg-white text-gray-900"
                  >
                    {t('close') || 'Close'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {result && (
            <div className={`mt-4 p-4 rounded-lg ${
              result.success 
                ? 'bg-green-50 border border-green-200' 
                : 'bg-red-50 border border-red-200'
            }`}>
              <div className="flex items-start space-x-3">
                {result.success ? (
                  <CheckCircle className="h-6 w-6 text-green-600 flex-shrink-0 mt-0.5" />
                ) : (
                  <XCircle className="h-6 w-6 text-red-600 flex-shrink-0 mt-0.5" />
                )}
                <div className="flex-1">
                  <p className={`font-medium ${
                    result.success ? 'text-green-800' : 'text-red-800'
                  }`}>
                    {result.message}
                  </p>
                  {result.booking && result.success && (
                    <div className="mt-2 text-sm text-green-700">
                      <p><strong>{t('customer')}:</strong> {result.booking.customer?.firstName} {result.booking.customer?.lastName}</p>
                      <p><strong>{t('serviceName')}:</strong> {result.booking.service?.name}</p>
                      <p><strong>{t('date')}:</strong> {new Date(result.booking.appointmentDate).toLocaleString()}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {result && !result.success && (
          <button
            onClick={resumeScanning}
            className="mt-4 w-full btn btn-primary"
          >
            {t('scanAgain')}
          </button>
        )}
      </div>
    </div>
  );
};
