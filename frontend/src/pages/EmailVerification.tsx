import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useI18n } from '../contexts/I18nContext';
import { authApi } from '../services/api';
import { Mail, ArrowLeft, RefreshCw } from 'lucide-react';
import { GeometricSymbol } from '../components/GeometricSymbols';

export const EmailVerification: React.FC = () => {
  const [verificationCode, setVerificationCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [resending, setResending] = useState(false);
  
  const { t } = useI18n();
  const navigate = useNavigate();
  const location = useLocation();
  
  // Get email from location state or localStorage
  const email = location.state?.email || localStorage.getItem('pendingVerificationEmail') || '';

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const { data } = await authApi.post('/auth/verify-email', {
        email,
        verificationCode,
      });

      if (data.success) {
        setSuccess(true);
        localStorage.removeItem('pendingVerificationEmail');
        setTimeout(() => {
          navigate('/login', { 
            state: { message: 'Email verified successfully! You can now log in.' }
          });
        }, 2000);
      } else {
        setError(data.message || 'Verification failed');
      }
    } catch (error) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    setResending(true);
    setError('');

    try {
      const { data } = await authApi.post('/auth/resend-verification', { email });

      if (data.success) {
        setError('');
        // Show success message
        alert('Verification code sent successfully!');
      } else {
        setError(data.message || 'Failed to resend verification code');
      }
    } catch (error) {
      setError('Network error. Please try again.');
    } finally {
      setResending(false);
    }
  };

  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 6);
    setVerificationCode(value);
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background py-12 px-4 sm:px-6 lg:px-8 relative">
        <div className="absolute top-8 left-8 opacity-10">
          <GeometricSymbol variant="check" size={100} strokeWidth={6} color="#22c55e" />
        </div>
        <div className="absolute bottom-8 right-8 opacity-8">
          <GeometricSymbol variant="star" size={80} strokeWidth={5} color="#f97316" />
        </div>
        
        <div className="max-w-md w-full space-y-8 relative z-10">
          <div className="text-center">
            <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100 mb-4">
              <Mail className="h-8 w-8 text-green-600" />
            </div>
            <h2 className="text-3xl font-bold text-gray-900 mb-2">Email Verified!</h2>
            <p className="text-gray-600">
              Your email has been successfully verified. You can now log in to your account.
            </p>
          </div>
        </div>
      </div>
    );
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
        <div className="text-center">
          <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-primary-100 mb-4">
            <Mail className="h-8 w-8 text-primary-600" />
          </div>
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Verify Your Email</h2>
          <p className="text-gray-600 mb-6">
            We've sent a 6-digit verification code to:
            <br />
            <span className="font-semibold text-primary-600">{email}</span>
          </p>
        </div>

        <form className="space-y-6" onSubmit={handleVerify}>
          <div>
            <label htmlFor="verificationCode" className="block text-sm font-medium text-gray-700 mb-2">
              Verification Code
            </label>
            <input
              id="verificationCode"
              name="verificationCode"
              type="text"
              value={verificationCode}
              onChange={handleCodeChange}
              placeholder="123456"
              className="w-full px-4 py-3 text-center text-2xl font-mono tracking-widest border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              maxLength={6}
              required
            />
            <p className="mt-2 text-sm text-gray-500">
              Enter the 6-digit code from your email
            </p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          <div className="space-y-3">
            <button
              type="submit"
              disabled={loading || verificationCode.length !== 6}
              className="w-full btn btn-primary btn-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  Verifying...
                </div>
              ) : (
                'Verify Email'
              )}
            </button>

            <button
              type="button"
              onClick={handleResendCode}
              disabled={resending}
              className="w-full btn btn-outline btn-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {resending ? (
                <div className="flex items-center justify-center">
                  <RefreshCw className="h-5 w-5 mr-2 animate-spin" />
                  Sending...
                </div>
              ) : (
                <div className="flex items-center justify-center">
                  <RefreshCw className="h-5 w-5 mr-2" />
                  Resend Code
                </div>
              )}
            </button>
          </div>

          <div className="text-center">
            <button
              type="button"
              onClick={() => navigate('/login')}
              className="flex items-center justify-center text-sm text-gray-600 hover:text-primary-600 mx-auto"
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back to Login
            </button>
          </div>
        </form>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="text-sm font-medium text-blue-800 mb-2">Didn't receive the email?</h3>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>• Check your spam/junk folder</li>
            <li>• Make sure the email address is correct</li>
            <li>• Wait a few minutes and try resending</li>
          </ul>
        </div>
      </div>
    </div>
  );
};
