import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useI18n } from '../contexts/I18nContext';
import { authApi } from '../services/api';
import { ArrowLeft, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';

export const EmailVerification: React.FC = () => {
  const [verificationCode, setVerificationCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [resending, setResending] = useState(false);
  const [emailInput, setEmailInput] = useState('');

  const { user } = useAuth();
  const { t, lang, setLang } = useI18n();
  const navigate = useNavigate();
  const location = useLocation();

  // Prioritize email from signup/login flow - NOT from user (may be stale from previous session)
  const email = location.state?.email || localStorage.getItem('pendingVerificationEmail') || user?.email || emailInput;

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      console.log('Verifying email:', email, 'with code:', verificationCode);
      const { data } = await authApi.post('/auth/verify-email', {
        email,
        verificationCode,
      });

      if (data.success) {
        setSuccess(true);
        localStorage.removeItem('pendingVerificationEmail');
        toast.success(t('emailVerifiedSuccess'));
        setTimeout(() => {
          navigate('/login', {
            state: { message: t('emailVerifiedRedirecting') }
          });
        }, 2000);
      } else {
        toast.error(data.message || t('verificationFailed'));
      }
    } catch (error: any) {
      console.error('Verification error:', error);
      if (error.response?.data?.message) {
        toast.error(error.response.data.message);
      } else {
        toast.error(t('networkErrorTryAgain'));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    setResending(true);

    try {
      const { data } = await authApi.post('/auth/resend-verification', { email });

      if (data.success) {
        toast.success(t('verificationCodeSentSuccess'));
      } else {
        toast.error(data.message || t('failedToResendCode'));
      }
    } catch (error: any) {
      console.error('Resend error:', error);
      if (error.response?.data?.message) {
        toast.error(error.response.data.message);
      } else {
        toast.error(t('failedToResendCode'));
      }
    } finally {
      setResending(false);
    }
  };

  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 6);
    setVerificationCode(value);
  };

  const LanguageSwitcher = () => (
    <div
      className="absolute right-2 sm:right-3 md:right-4 z-30 text-sm sm:text-sm select-none touch-manipulation language-switcher-safe-area"
    >
      <button
        type="button"
        className={`px-2 sm:px-2.5 py-1 transition-colors ${lang === 'ro' ? 'text-red-600 font-bold' : 'text-red-500 hover:text-red-600 active:text-red-600'}`}
        onClick={() => setLang('ro')}
      >
        RO
      </button>
      <span className="px-0.5 sm:px-1 text-red-500/70">|</span>
      <button
        type="button"
        className={`px-2 sm:px-2.5 py-1 transition-colors ${lang === 'en' ? 'text-red-600 font-bold' : 'text-red-500 hover:text-red-600 active:text-red-600'}`}
        onClick={() => setLang('en')}
      >
        EN
      </button>
      <span className="px-0.5 sm:px-1 text-red-500/70">|</span>
      <button
        type="button"
        className={`px-2 sm:px-2.5 py-1 transition-colors ${lang === 'ru' ? 'text-red-600 font-bold' : 'text-red-500 hover:text-red-600 active:text-red-600'}`}
        onClick={() => setLang('ru')}
      >
        RU
      </button>
    </div>
  );

  if (success) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-start p-0 relative overflow-hidden" style={{ backgroundColor: '#330007' }}>
        {/* Precision Diagonal White Section */}
        <div
          className="absolute bg-white"
          style={{
            width: '200vw',
            height: '200vh',
            left: 'calc(50% - 15.2rem - 22px)',
            bottom: 'calc(100% + 70px)',
            transform: 'rotate(46deg)',
            transformOrigin: 'bottom left',
          }}
        />

        <LanguageSwitcher />

        {/* Content Card */}
        <div className="relative w-full max-w-2xl z-10">
          <div className="relative">
            {/* Content */}
            <div className="relative z-10">
              {/* Logo */}
              <div className="text-center" style={{ marginTop: 'calc(5rem - 70px)', marginBottom: '2rem' }}>
                <img
                  src="/bukki-text.png"
                  alt="BUKKi"
                  className="w-[24rem] max-w-[80vw] h-auto mx-auto"
                  style={{ mixBlendMode: 'screen' }}
                />
              </div>

              {/* Success Message */}
              <div className="relative mx-auto space-y-5" style={{ width: '60%', fontSize: '0.9rem', marginTop: 'calc(-4rem - 90px)' }}>
                <div className="bg-green-500/20 border border-green-500 rounded-2xl p-6 text-center">
                  <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-500/30 mb-4">
                    <svg className="h-6 w-6 text-green-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-medium text-white mb-2">
                    {t('emailVerifiedSuccess')}
                  </h3>
                  <p className="text-sm text-white/70">
                    {t('emailVerifiedRedirecting')}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-start p-0 relative overflow-hidden" style={{ backgroundColor: '#330007' }}>
      {/* Precision Diagonal White Section */}
      <div
        className="absolute bg-white"
        style={{
          width: '200vw',
          height: '200vh',
          left: 'calc(50% - 15.2rem - 22px)',
          bottom: 'calc(100% + 70px)',
          transform: 'rotate(46deg)',
          transformOrigin: 'bottom left',
        }}
      />

      <LanguageSwitcher />

      {/* Verification Card */}
      <div className="relative w-full max-w-2xl z-10">
        <div className="relative">
          {/* Content */}
          <div className="relative z-10">
            {/* Logo */}
            <div className="text-center" style={{ marginTop: 'calc(5rem - 70px)', marginBottom: '2rem' }}>
              <img
                src="/bukki-text.png"
                alt="BUKKi"
                className="w-[24rem] max-w-[80vw] h-auto mx-auto"
                style={{ mixBlendMode: 'screen' }}
              />
            </div>

            {/* Form Container */}
            <div className="relative mx-auto" style={{ marginTop: 'calc(-4rem - 90px)' }}>
              <form onSubmit={handleVerify} className="space-y-5 mx-auto" style={{ width: '60%', fontSize: '0.9rem' }}>
                <div className="text-center mb-6">
                  <p className="text-white/80 text-sm">
                    {email ? (
                      <>
                        {t('weSentCodeTo')}
                        <br />
                        <span className="font-semibold text-white">{email}</span>
                      </>
                    ) : (
                      t('enterEmailAndCode')
                    )}
                  </p>
                </div>

                {/* Show email input if no email is available */}
                {!email && (
                  <div className="relative">
                    <input
                      id="email"
                      name="email"
                      type="email"
                      value={emailInput}
                      onChange={(e) => setEmailInput(e.target.value)}
                      placeholder="E-mail"
                      className="w-full px-5 py-3 bg-black/30 border-0 rounded-full focus:outline-none focus:ring-2 focus:ring-red-500 transition-all duration-300 text-white placeholder-white/70 text-sm"
                      required
                    />
                  </div>
                )}

                {/* Verification Code */}
                <div className="relative">
                  <input
                    id="verificationCode"
                    name="verificationCode"
                    type="text"
                    inputMode="numeric"
                    value={verificationCode}
                    onChange={handleCodeChange}
                    placeholder="000000"
                    className="w-full px-4 py-3 bg-black/30 border-0 rounded-full focus:outline-none focus:ring-2 focus:ring-red-500 transition-all duration-300 text-center text-2xl tracking-widest font-mono text-white placeholder-white/70"
                    maxLength={6}
                    autoFocus
                    required
                  />
                  <p className="mt-2 text-xs text-white/70 text-center">
                    {t('enterSixDigitCode')}
                  </p>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={loading || verificationCode.length !== 6 || (!email && !emailInput)}
                  className="w-full bg-red-600 hover:bg-red-700 text-white py-3 rounded-full font-semibold text-base transition-all duration-300 transform hover:scale-105 disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      {t('verifying')}
                    </>
                  ) : (
                    t('verifyEmail')
                  )}
                </button>

                {/* Resend Code */}
                <div className="text-center space-y-2">
                  <button
                    type="button"
                    onClick={handleResendCode}
                    disabled={resending}
                    className="inline-flex items-center text-sm font-medium text-white hover:text-white/80 disabled:opacity-50"
                  >
                    <RefreshCw className={`h-4 w-4 mr-1 ${resending ? 'animate-spin' : ''}`} />
                    {resending ? t('sending') : t('resendCode')}
                  </button>
                </div>

                {/* Back to Login */}
                <div className="text-center">
                  <button
                    type="button"
                    onClick={() => navigate('/login')}
                    className="inline-flex items-center text-sm font-medium text-white hover:text-white/80"
                  >
                    <ArrowLeft className="h-4 w-4 mr-1" />
                    {t('backToLogin')}
                  </button>
                </div>
              </form>

              {/* Help Text */}
              <div className="mt-6 mx-auto" style={{ width: '60%' }}>
                <div className="bg-blue-500/20 border border-blue-400/30 rounded-2xl p-4">
                  <h3 className="text-sm font-medium text-blue-200 mb-2">{t('didntReceiveEmail')}</h3>
                  <ul className="text-xs text-blue-100/80 space-y-1">
                    <li>• {t('checkSpamFolder')}</li>
                    <li>• {t('makeSureEmailCorrect')}</li>
                    <li>• {t('waitAndTryResending')}</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
