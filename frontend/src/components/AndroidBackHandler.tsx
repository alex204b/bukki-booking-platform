import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

/**
 * Handles the Android hardware/gesture back button in Capacitor apps.
 * When the user presses back on a "deep" route, navigates to the parent route
 * instead of exiting the app.
 */
export const AndroidBackHandler: React.FC = () => {
  const navigate = useNavigate();

  useEffect(() => {
    let isCapacitor = false;
    try {
      isCapacitor = !!(window as any).Capacitor || window.location.protocol === 'capacitor:';
    } catch {
      // ignore
    }
    if (!isCapacitor) return;

    const handleBackButton = () => {
      const path = window.location.pathname;

      // Define routes where back should navigate in-app instead of exiting
      if (path.match(/^\/chat\/[^/]+$/)) {
        // In a chat conversation -> go to chat list
        navigate('/chat', { replace: true });
        return;
      }
      if (path.match(/^\/business\/[^/]+$/)) {
        // On business detail -> go to home or business list
        navigate('/', { replace: true });
        return;
      }
      if (path.match(/^\/booking-form\/[^/]+$/)) {
        navigate(-1);
        return;
      }
      if (path.match(/^\/booking-confirmation\/[^/]+$/)) {
        navigate('/my-bookings', { replace: true });
        return;
      }

      // For other routes, use browser history if available
      if (window.history.length > 1) {
        navigate(-1);
      } else {
        // No history - go to home to avoid exit
        navigate('/', { replace: true });
      }
    };

    let listener: { remove: () => Promise<void> } | null = null;
    let cancelled = false;

    import('@capacitor/app').then(({ App }) => {
      if (cancelled) return;
      return App.addListener('backButton', handleBackButton);
    }).then((l) => {
      if (l && !cancelled) listener = l;
    }).catch((err) => {
      console.warn('[AndroidBackHandler] Could not setup back button listener:', err);
    });

    return () => {
      cancelled = true;
      listener?.remove();
    };
  }, [navigate]);

  return null;
};
