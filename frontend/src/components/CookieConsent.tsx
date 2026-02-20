import React, { useState, useEffect } from 'react';
import { useI18n } from '../contexts/I18nContext';

export const CookieConsent: React.FC = () => {
  const { t } = useI18n();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem('cookie_consent');
    if (!consent) {
      setVisible(true);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem('cookie_consent', 'accepted');
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[9999] bg-[#330007]/95 backdrop-blur-sm border-t border-white/10 px-4 py-4 sm:py-3">
      <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
        <p className="text-white/90 text-sm text-center sm:text-left">
          {t('cookieConsentText')}{' '}
          <a href="/privacy" className="underline text-white hover:text-white/80 font-medium">
            {t('cookiePrivacyLink')}
          </a>
        </p>
        <button
          onClick={handleAccept}
          className="flex-shrink-0 px-6 py-2 bg-[#E7001E] hover:bg-red-700 text-white text-sm font-semibold rounded-full transition-colors shadow-lg"
        >
          {t('cookieAccept')}
        </button>
      </div>
    </div>
  );
};
