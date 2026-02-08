import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useI18n } from '../contexts/I18nContext';
import { authService } from '../services/api';
import { Lock, Eye, EyeOff, ArrowLeft, CheckCircle } from 'lucide-react';
import { GeometricSymbol } from '../components/GeometricSymbols';
import toast from 'react-hot-toast';

export const ResetPassword: React.FC = () => {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  
  const { t } = useI18n();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const emailFromState = location.state?.email || localStorage.getItem('passwordResetEmail') || '';
    const codeFromState = location.state?.code || '';
    
    if (!emailFromState || !codeFromState) {
      toast.error(t('missingInformation'));
      navigate('/forgot-password');
      return;
    }
    
    setEmail(emailFromState);
    setCode(codeFromState);
  }, [location, navigate, t]);

  const validatePassword = (password: string): string[] => {
    const errors: string[] = [];
    if (password.length < 8) {
      errors.push(t('passwordMustBeAtLeast8'));
    }
    if (!/[A-Z]/.test(password)) {
      errors.push(t('passwordMustContainUppercase'));
    }
    if (!/[a-z]/.test(password)) {
      errors.push(t('passwordMustContainLowercase'));
    }
    if (!/[0-9]/.test(password)) {
      errors.push(t('passwordMustContainNumber'));
    }
    return errors;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (newPassword !== confirmPassword) {
      toast.error(t('passwordsDoNotMatch'));
      return;
    }

    const passwordErrors = validatePassword(newPassword);
    if (passwordErrors.length > 0) {
      toast.error(passwordErrors[0]);
      return;
    }

    setLoading(true);

    try {
      await authService.resetPassword(email, code, newPassword);
      setSuccess(true);
      toast.success(t('passwordResetSuccessful'));
      localStorage.removeItem('passwordResetEmail');
      
      setTimeout(() => {
        navigate('/login', { 
          state: { message: t('passwordResetSuccessfully') }
        });
      }, 2000);
    } catch (error: any) {
      console.error('Reset password error:', error);
      const errorMessage = error.response?.data?.message || t('passwordResetSuccessful');
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (!email || !code) {
    return null;
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background py-12 px-4 sm:px-6 lg:px-8 relative">
        <div className="absolute top-8 left-8 opacity-10">
          <GeometricSymbol variant="infinity" size={100} strokeWidth={6} color="#f97316" />
        </div>
        <div className="absolute bottom-8 right-8 opacity-8">
          <GeometricSymbol variant="spiral" size={80} strokeWidth={5} color="#eab308" />
        </div>
        
        <div className="max-w-md w-full space-y-8 relative z-10">
          <div className="bg-green-50 border border-green-200 rounded-lg p-8 text-center">
            <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100 mb-4">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              {t('passwordResetSuccessful')}
            </h2>
            <p className="text-gray-600 mb-6">
              {t('passwordResetSuccessfully')}
            </p>
            <Link
              to="/login"
              className="btn btn-primary"
            >
              {t('goToLogin')}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const passwordErrors = newPassword ? validatePassword(newPassword) : [];

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
            {t('resetYourPassword')}
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            {t('enterNewPasswordBelow')}
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div>
            <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700">
              {t('newPassword')}
            </label>
            <div className="mt-1 relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Lock className="h-5 w-5 text-gray-400" />
              </div>
              <input
                id="newPassword"
                name="newPassword"
                type={showPassword ? 'text' : 'password'}
                autoComplete="off"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="input pl-10 pr-10"
                placeholder={t('enterNewPassword')}
              />
              <button
                type="button"
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? (
                  <EyeOff className="h-5 w-5 text-gray-400" />
                ) : (
                  <Eye className="h-5 w-5 text-gray-400" />
                )}
              </button>
            </div>
            {newPassword && passwordErrors.length > 0 && (
              <ul className="mt-2 text-xs text-red-600 space-y-1">
                {passwordErrors.map((error, index) => (
                  <li key={index}>• {error}</li>
                ))}
              </ul>
            )}
            {newPassword && passwordErrors.length === 0 && (
              <p className="mt-2 text-xs text-green-600">✓ {t('passwordMeetsRequirements')}</p>
            )}
          </div>

          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
              {t('confirmPassword')}
            </label>
            <div className="mt-1 relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Lock className="h-5 w-5 text-gray-400" />
              </div>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                autoComplete="off"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="input pl-10 pr-10"
                placeholder={t('confirmPassword')}
              />
              <button
                type="button"
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              >
                {showConfirmPassword ? (
                  <EyeOff className="h-5 w-5 text-gray-400" />
                ) : (
                  <Eye className="h-5 w-5 text-gray-400" />
                )}
              </button>
            </div>
            {confirmPassword && newPassword !== confirmPassword && (
              <p className="mt-2 text-xs text-red-600">{t('passwordsDoNotMatch')}</p>
            )}
            {confirmPassword && newPassword === confirmPassword && newPassword && (
              <p className="mt-2 text-xs text-green-600">✓ {t('passwordsMatch')}</p>
            )}
          </div>

          <div>
            <button
              type="submit"
              disabled={loading || passwordErrors.length > 0 || newPassword !== confirmPassword}
              className="btn btn-primary btn-lg w-full"
            >
              {loading ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  {t('resetting')}
                </div>
              ) : (
                t('resetPassword')
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
      </div>
    </div>
  );
};

