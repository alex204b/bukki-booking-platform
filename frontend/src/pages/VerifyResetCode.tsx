import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useI18n } from '../contexts/I18nContext';
import { authService } from '../services/api';
import { ArrowLeft, RefreshCw } from 'lucide-react';
import { GeometricSymbol } from '../components/GeometricSymbols';
import toast from 'react-hot-toast';

export const VerifyResetCode: React.FC = () => {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [email, setEmail] = useState('');
  
  const { t } = useI18n();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const emailFromState = location.state?.email || localStorage.getItem('passwordResetEmail') || '';
    if (!emailFromState) {
      toast.error('Email not found. Please start over.');
      navigate('/forgot-password');
      return;
    }
    setEmail(emailFromState);
  }, [location, navigate]);

  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 4);
    setCode(value);
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (code.length !== 4) {
      toast.error('Please enter a 4-digit code');
      return;
    }

    setLoading(true);

    try {
      const { data } = await authService.verifyResetCode(email, code);
      
      if (data.success) {
        toast.success('Code verified successfully!');
        navigate('/reset-password', { state: { email, code } });
      } else {
        toast.error(data.message || 'Invalid code');
      }
    } catch (error: any) {
      console.error('Verify code error:', error);
      const errorMessage = error.response?.data?.message || 'Invalid code. Please try again.';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    setResending(true);

    try {
      const { data } = await authService.forgotPassword(email);
      
      if (data.success) {
        toast.success('Reset code sent successfully!');
      } else {
        toast.error(data.message || 'Failed to resend code');
      }
    } catch (error: any) {
      console.error('Resend error:', error);
      toast.error('Failed to resend code. Please try again.');
    } finally {
      setResending(false);
    }
  };

  if (!email) {
    return null;
  }

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
            Verify Reset Code
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Enter the 4-digit code sent to <strong>{email}</strong>
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleVerify}>
          <div>
            <label htmlFor="code" className="block text-sm font-medium text-gray-700 mb-2">
              Verification Code
            </label>
            <input
              id="code"
              name="code"
              type="text"
              inputMode="numeric"
              maxLength={4}
              required
              value={code}
              onChange={handleCodeChange}
              className="input text-center text-3xl tracking-widest font-mono"
              placeholder="0000"
              autoFocus
            />
            <p className="mt-2 text-xs text-gray-500 text-center">
              Enter the 4-digit code from your email
            </p>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading || code.length !== 4}
              className="btn btn-primary btn-lg w-full"
            >
              {loading ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  Verifying...
                </div>
              ) : (
                'Verify Code'
              )}
            </button>
          </div>

          <div className="text-center space-y-2">
            <button
              type="button"
              onClick={handleResendCode}
              disabled={resending}
              className="inline-flex items-center text-sm font-medium text-primary-600 hover:text-primary-500 disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 mr-1 ${resending ? 'animate-spin' : ''}`} />
              {resending ? 'Sending...' : 'Resend Code'}
            </button>
            <div>
              <Link
                to="/forgot-password"
                className="inline-flex items-center text-sm font-medium text-gray-600 hover:text-gray-500"
              >
                <ArrowLeft className="h-4 w-4 mr-1" />
                Change Email
              </Link>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

