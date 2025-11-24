import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useI18n } from '../contexts/I18nContext';
import { authService } from '../services/api';
import { Mail, ArrowLeft } from 'lucide-react';
import { GeometricSymbol } from '../components/GeometricSymbols';
import toast from 'react-hot-toast';

export const ForgotPassword: React.FC = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  
  const { t } = useI18n();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data } = await authService.forgotPassword(email);
      
      if (data.success) {
        setSuccess(true);
        toast.success(t('passwordResetCodeSent'));
        // Store email for next step
        localStorage.setItem('passwordResetEmail', email);
      } else {
        toast.error(data.message || t('failedToSendResetCode'));
      }
    } catch (error: any) {
      console.error('Forgot password error:', error);
      const errorMessage = error.response?.data?.message || t('failedToSendResetCode');
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleContinue = () => {
    navigate('/verify-reset-code', { state: { email } });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background py-12 px-4 sm:px-6 lg:px-8 relative">
      <div className="absolute top-8 left-8 opacity-10">
        <GeometricSymbol variant="infinity" size={100} strokeWidth={6} color="#f97316" />
      </div>
      <div className="absolute bottom-8 right-8 opacity-8">
        <GeometricSymbol variant="spiral" size={80} strokeWidth={5} color="#eab308" />
      </div>
      
      <div className="max-w-md w-full space-y-8 relative z-10">
        <div>
          <h1 className="text-center text-3xl font-bold text-primary-600">{t('appName')}</h1>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            {t('forgotPassword')}
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            {t('enterEmailForResetCode')}
          </p>
        </div>

        {!success ? (
          <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                {t('emailAddress')}
              </label>
              <div className="mt-1 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input pl-10"
                  placeholder={t('emailAddress')}
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="btn btn-primary btn-lg w-full"
              >
                {loading ? (
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                    {t('sending')}
                  </div>
                ) : (
                  t('sendResetCode')
                )}
              </button>
            </div>

            <div className="text-center">
              <Link
                to="/login"
                className="inline-flex items-center text-sm font-medium text-primary-600 hover:text-primary-500"
              >
                <ArrowLeft className="h-4 w-4 mr-1" />
                {t('backToLogin')}
              </Link>
            </div>
          </form>
        ) : (
          <div className="mt-8 space-y-6">
            <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
                <Mail className="h-6 w-6 text-green-600" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {t('checkYourEmail')}
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                {t('weSentResetCode')} <strong>{email}</strong>
              </p>
              <p className="text-xs text-gray-500">
                {t('codeWillExpire')}
              </p>
            </div>

            <button
              onClick={handleContinue}
              className="btn btn-primary btn-lg w-full"
            >
              {t('continueToVerifyCode')}
            </button>

            <div className="text-center">
              <Link
                to="/login"
                className="inline-flex items-center text-sm font-medium text-primary-600 hover:text-primary-500"
              >
                <ArrowLeft className="h-4 w-4 mr-1" />
                {t('backToLogin')}
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

