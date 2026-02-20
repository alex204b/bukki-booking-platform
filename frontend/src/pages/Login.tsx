import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useI18n } from '../contexts/I18nContext';
import { Eye, EyeOff, Mail, Lock, ArrowRight, Zap, User, Phone, ChevronDown, ArrowLeft, RefreshCw } from 'lucide-react';
import { api, authService, authApi } from '../services/api';
import toast from 'react-hot-toast';
import { signInWithPopup, GoogleAuthProvider, FacebookAuthProvider } from 'firebase/auth';
import { auth, googleProvider, facebookProvider } from '../config/firebase';
import { ConnectionErrorModal } from '../components/ConnectionErrorModal';
import { LoginBackground } from '../components/LoginBackground';
import { authStorage } from '../utils/authStorage';

type ViewMode = 'login' | 'signup' | 'forgot-password' | 'verify-code' | 'reset-password';

export const Login: React.FC = () => {
  const [viewMode, setViewMode] = useState<ViewMode>('login');
  const [isSignUp, setIsSignUp] = useState(false);
  // Signup step: 1 = personal data, 2 = passwords & confirmation
  const [signupStep, setSignupStep] = useState<1 | 2>(1);

  // Login state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);

  // Forgot password state
  const [forgotPasswordLoading, setForgotPasswordLoading] = useState(false);
  const [forgotPasswordSuccess, setForgotPasswordSuccess] = useState(false);

  // Verify code state
  const [resetCode, setResetCode] = useState('');
  const [verifyCodeLoading, setVerifyCodeLoading] = useState(false);
  const [resendingCode, setResendingCode] = useState(false);

  // Reset password state
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmNewPassword, setShowConfirmNewPassword] = useState(false);
  const [resetPasswordLoading, setResetPasswordLoading] = useState(false);
  const [resetPasswordSuccess, setResetPasswordSuccess] = useState(false);

  // Signup state
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
    role: 'customer' as 'customer' | 'business_owner',
  });
  const [errors, setErrors] = useState<{ [k: string]: string }>({});
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [signupLoading, setSignupLoading] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Connection error state
  const [connectionError, setConnectionError] = useState<{
    show: boolean;
    baseURL: string;
    isMobile: boolean;
  }>({
    show: false,
    baseURL: '',
    isMobile: false,
  });

  const { login, register } = useAuth();
  const { t, lang, setLang } = useI18n();
  const navigate = useNavigate();
  const location = useLocation();
 
  const from = location.state?.from?.pathname || '/';

  // Auto-switch to signup if ?signup=true is in the URL
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('signup') === 'true') {
      setIsSignUp(true);
      setViewMode('signup');
    }
  }, [location.search]);

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const phoneRegex = /^[0-9+\-()\s]{7,20}$/;
  const passwordStrongEnough = (p: string) => p.length >= 8 && /[A-Za-z]/.test(p) && /\d/.test(p);

  const validateField = (name: string, value: string) => {
    const next: { [k: string]: string } = { ...errors };
    switch (name) {
      case 'firstName':
        next.firstName = value.trim().length >= 2 ? '' : t('errMin2');
        break;
      case 'lastName':
        next.lastName = value.trim().length >= 2 ? '' : t('errMin2');
        break;
      case 'email':
        next.email = emailRegex.test(value) ? '' : t('errEmail');
        break;
      case 'phone':
        next.phone = !value || phoneRegex.test(value) ? '' : t('errPhone');
        break;
      case 'password':
        next.password = passwordStrongEnough(value) ? '' : t('errPwd');
        next.confirmPassword = value === formData.confirmPassword ? '' : t('errPwdMatch');
        break;
      case 'confirmPassword':
        next.confirmPassword = value === formData.password ? '' : t('errPwdMatch');
        break;
      case 'role':
        next.role = value ? '' : t('errChooseRole');
        break;
      default:
        break;
    }
    setErrors(next);
  };

  const validateAll = () => {
    validateField('firstName', formData.firstName);
    validateField('lastName', formData.lastName);
    validateField('email', formData.email);
    validateField('phone', formData.phone);
    validateField('password', formData.password);
    validateField('confirmPassword', formData.confirmPassword);
    validateField('role', formData.role);
    const hasErrors = Object.values({
      ...errors,
      firstName: formData.firstName.trim().length >= 2 ? '' : t('errMin2'),
      lastName: formData.lastName.trim().length >= 2 ? '' : t('errMin2'),
      email: emailRegex.test(formData.email) ? '' : t('errEmail'),
      phone: !formData.phone || phoneRegex.test(formData.phone) ? '' : t('errPhone'),
      password: passwordStrongEnough(formData.password) ? '' : t('errPwd'),
      confirmPassword: formData.password === formData.confirmPassword ? '' : t('errPwdMatch'),
      role: formData.role ? '' : t('errChooseRole'),
    }).some(Boolean);
    return !hasErrors;
  };

  const handleSignupChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
    validateField(e.target.name, e.target.value);
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginLoading(true);

    try {
      console.log('[LOGIN] Starting login process...');
      const result = await login(email, password);
      console.log('[LOGIN] Login successful, result:', result);

      // Check if user is a business owner and needs onboarding
      if (result && result.user && result.user.role === 'business_owner') {
        console.log('[LOGIN] User is business owner, checking business status...');
        try {
          await new Promise(resolve => setTimeout(resolve, 100));

          const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Business check timeout')), 5000)
          );

          const businessResponse = await Promise.race([
            api.get('/businesses/my-business'),
            timeoutPromise
          ]) as any;

          const business = businessResponse.data;
          console.log('[LOGIN] Business check result:', business);

          if (!business || !business.onboardingCompleted) {
            console.log('[LOGIN] Redirecting to business onboarding');
            navigate('/business-onboarding');
            setLoginLoading(false);
            return;
          }
        } catch (error: any) {
          console.log('[LOGIN] Business check error:', error);
          if (error.response?.status === 404 || error.response?.status === 401) {
            console.log('[LOGIN] No business found, redirecting to onboarding');
            navigate('/business-onboarding');
            setLoginLoading(false);
            return;
          }
          if (error.message === 'Business check timeout') {
            console.warn('[LOGIN] Business check timed out, continuing to home page');
          } else {
            console.error('[LOGIN] Error checking business:', error);
          }
        }
      }

      console.log('[LOGIN] Navigating to:', from);
      navigate(from, { replace: true });
      setLoginLoading(false);
    } catch (error: any) {
      console.error('[LOGIN] Login error:', error);

      // Check for rate limit error
      if (error.response?.status === 429 || error.message?.includes('Too many requests')) {
        toast.error('Too many login attempts. Please wait a moment and try again.');
      }
      // Check if it's a network/connection error
      else if (!error.response) {
        const baseURL = error.config?.baseURL || authApi.defaults.baseURL || 'unknown';
        // Properly detect mobile: check if it's a Capacitor app (returns boolean)
        const isMobile = window.location.protocol === 'capacitor:' || !!(window as any).Capacitor;

        // Show connection error modal
        setConnectionError({
          show: true,
          baseURL: baseURL,
          isMobile: isMobile,
        });
      }
      // Other errors
      else {
        const errorMessage = error.response?.data?.message || 'Login failed. Please try again.';
        toast.error(errorMessage);
      }

      setLoginLoading(false);
    }
  };

  const handleSignupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const passwordInput = form?.elements.namedItem('password') as HTMLInputElement | null;
    const confirmInput = form?.elements.namedItem('confirmPassword') as HTMLInputElement | null;
    let password = formData.password;
    let confirmPassword = formData.confirmPassword;
    if (passwordInput && confirmInput) {
      password = passwordInput.value;
      confirmPassword = confirmInput.value;
      setFormData((prev) => ({ ...prev, password, confirmPassword }));
      setErrors((prev) => ({
        ...prev,
        password: passwordStrongEnough(password) ? '' : t('errPwd'),
        confirmPassword: password === confirmPassword ? '' : t('errPwdMatch'),
      }));
    }
    const isValid =
      formData.firstName.trim().length >= 2 &&
      formData.lastName.trim().length >= 2 &&
      emailRegex.test(formData.email) &&
      (!formData.phone || phoneRegex.test(formData.phone)) &&
      passwordStrongEnough(password) &&
      password === confirmPassword &&
      !!formData.role;
    if (!isValid) {
      validateAll();
      toast.error(t('fixFormErrors') || 'Please fix the errors in the form.');
      return;
    }
    setSignupLoading(true);

    try {
      const result = await register({
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        password,
        phone: formData.phone,
        role: formData.role,
      });

      if (result.requiresVerification) {
        localStorage.setItem('pendingVerificationEmail', formData.email);
        navigate('/verify-email', {
          state: { email: formData.email, message: result.message }
        });
      } else {
        if (formData.role === 'business_owner') {
          navigate('/business-onboarding');
        } else {
          navigate('/');
        }
      }
    } catch (error) {
      // Error is handled in the auth context
    } finally {
      setSignupLoading(false);
    }
  };

  const toggleMode = () => {
    const newIsSignUp = !isSignUp;
    setIsSignUp(newIsSignUp);
    setViewMode(newIsSignUp ? 'signup' : 'login');
    // Reset signup step and clear errors when switching
    setSignupStep(1);
    setErrors({});
    setIsDropdownOpen(false);
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotPasswordLoading(true);

    try {
      const { data } = await authService.forgotPassword(email);

      if (data.success) {
        setForgotPasswordSuccess(true);
        toast.success(t('passwordResetCodeSent'));
        localStorage.setItem('passwordResetEmail', email);
        setViewMode('verify-code');
      } else {
        toast.error(data.message || t('failedToSendResetCode'));
      }
    } catch (error: any) {
      console.error('Forgot password error:', error);
      const errorMessage = error.response?.data?.message || t('failedToSendResetCode');
      toast.error(errorMessage);
    } finally {
      setForgotPasswordLoading(false);
    }
  };

  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 4);
    setResetCode(value);
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();

    if (resetCode.length !== 4) {
      toast.error('Please enter a 4-digit code');
      return;
    }

    setVerifyCodeLoading(true);

    try {
      const { data } = await authService.verifyResetCode(email, resetCode);

      if (data.success) {
        toast.success('Code verified successfully!');
        setViewMode('reset-password');
      } else {
        toast.error(data.message || 'Invalid code');
      }
    } catch (error: any) {
      console.error('Verify code error:', error);
      const errorMessage = error.response?.data?.message || 'Invalid code. Please try again.';
      toast.error(errorMessage);
    } finally {
      setVerifyCodeLoading(false);
    }
  };

  const handleResendCode = async () => {
    setResendingCode(true);

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
      setResendingCode(false);
    }
  };

  const validatePassword = (pwd: string): string[] => {
    const errors: string[] = [];
    if (pwd.length < 8) {
      errors.push(t('passwordMustBeAtLeast8'));
    }
    if (!/[A-Z]/.test(pwd)) {
      errors.push(t('passwordMustContainUppercase'));
    }
    if (!/[a-z]/.test(pwd)) {
      errors.push(t('passwordMustContainLowercase'));
    }
    if (!/[0-9]/.test(pwd)) {
      errors.push(t('passwordMustContainNumber'));
    }
    return errors;
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (newPassword !== confirmNewPassword) {
      toast.error(t('passwordsDoNotMatch'));
      return;
    }

    const passwordErrors = validatePassword(newPassword);
    if (passwordErrors.length > 0) {
      toast.error(passwordErrors[0]);
      return;
    }

    setResetPasswordLoading(true);

    try {
      await authService.resetPassword(email, resetCode, newPassword);
      setResetPasswordSuccess(true);
      toast.success(t('passwordResetSuccessful'));
      localStorage.removeItem('passwordResetEmail');

      setTimeout(() => {
        setViewMode('login');
        setNewPassword('');
        setConfirmNewPassword('');
        setResetCode('');
        setResetPasswordSuccess(false);
      }, 2000);
    } catch (error: any) {
      console.error('Reset password error:', error);
      const errorMessage = error.response?.data?.message || t('passwordResetSuccessful');
      toast.error(errorMessage);
    } finally {
      setResetPasswordLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      // Clear any existing session before OAuth to prevent wrong-account login
      const { authStorage } = await import('../utils/authStorage');
      authStorage.clear();
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      const idToken = await user.getIdToken();

      // Send to backend
      const response = await authService.oauthLogin('google', idToken);
      const { user: userData, token: userToken } = response.data;

      // Set up the session similar to regular login
      authStorage.setToken(userToken);
      authStorage.setUser(JSON.stringify(userData));
      authApi.defaults.headers.common['Authorization'] = `Bearer ${userToken}`;
      api.defaults.headers.common['Authorization'] = `Bearer ${userToken}`;

      // Reload page to update auth context
      toast.success('Login successful!');
      window.location.href = from;
    } catch (error: any) {
      console.error('Google login error:', error);
      if (error.code !== 'auth/popup-closed-by-user' && error.code !== 'auth/cancelled-popup-request') {
        toast.error(error.message || 'Google login failed');
      }
    }
  };

  const handleFacebookLogin = async () => {
    try {
      // Clear any existing session before OAuth to prevent wrong-account login
      const { authStorage } = await import('../utils/authStorage');
      authStorage.clear();
      const result = await signInWithPopup(auth, facebookProvider);
      const user = result.user;
      const idToken = await user.getIdToken();
      const credential = FacebookAuthProvider.credentialFromResult(result);
      const accessToken = credential?.accessToken;

      // Send to backend
      const response = await authService.oauthLogin('facebook', idToken, accessToken);
      const { user: userData, token: userToken } = response.data;

      // Set up the session
      authStorage.setToken(userToken);
      authStorage.setUser(JSON.stringify(userData));
      authApi.defaults.headers.common['Authorization'] = `Bearer ${userToken}`;
      api.defaults.headers.common['Authorization'] = `Bearer ${userToken}`;

      // Reload page to update auth context
      toast.success('Login successful!');
      window.location.href = from;
    } catch (error: any) {
      console.error('Facebook login error:', error);
      if (error.code !== 'auth/popup-closed-by-user' && error.code !== 'auth/cancelled-popup-request') {
        toast.error(error.message || 'Facebook login failed');
      }
    }
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };

    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isDropdownOpen]);

  return (
    <LoginBackground>
      {/* Safe-area top bar for phones (under status bar/notch) */}
      <div
        className="absolute inset-x-0 top-0 z-20 pointer-events-none md:hidden"
        style={{
          // Use device safe area on iOS when available, otherwise a small responsive height
          height: 'max(env(safe-area-inset-top, 0px), 1.5vh)',
          backgroundColor: '#330007',
          '--safe-area-top': 'max(env(safe-area-inset-top, 0px), 1.5vh)',
        } as React.CSSProperties}
      />

      {/* Corner language switcher */}
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

      {/* Forms Container - grouped with logo, fits on screen */}
      <div
        className="relative w-full max-w-2xl z-10 mx-auto flex flex-col justify-center px-4 sm:px-6 md:px-0 pb-4 sm:pb-8 forms-container-safe-area"
        style={{
          minHeight: '100vh',
          paddingTop: 'var(--form-start, 180px)',
        }}
      >
        <div className={`relative ${
          viewMode === 'signup'
            ? ''
            : ''
        }`}>
            {/* Login Form */}
            {viewMode === 'login' && (
              <form
                onSubmit={handleLoginSubmit}
                className="space-y-2.5 sm:space-y-4 mx-auto w-[92%] sm:w-[90%] md:w-[75%] max-w-[420px] text-center"
                style={{ fontSize: 'clamp(0.8rem, 2.4vw, 1rem)' }}
              >
                  {/* Email */}
                  <div className="relative">
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder={t('emailAddress') || 'E-mail'}
                      className="w-full px-3 sm:px-5 py-2.5 sm:py-3.5 bg-black/30 border-0 rounded-full focus:outline-none focus:ring-2 focus:ring-red-500 transition-all duration-300 text-white placeholder-white/70 text-sm sm:text-base text-center sm:text-left placeholder:text-center sm:placeholder:text-left"
                    />
                  </div>

                  {/* Password */}
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      autoComplete="off"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder={t('password') || 'Password'}
                      className="w-full px-3 sm:px-5 py-2.5 sm:py-3.5 pr-10 sm:pr-14 bg-black/30 border-0 rounded-full focus:outline-none focus:ring-2 focus:ring-red-500 transition-all duration-300 text-white placeholder-white/70 text-sm sm:text-base text-center sm:text-left placeholder:text-center sm:placeholder:text-left"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 sm:right-4 top-1/2 -translate-y-1/2 text-white/70 hover:text-white transition-colors touch-manipulation"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4 sm:h-5 sm:w-5" /> : <Eye className="h-4 w-4 sm:h-5 sm:w-5" />}
                    </button>
                  </div>

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={loginLoading}
                    className="w-full bg-red-600 hover:bg-red-700 active:bg-red-800 text-white py-2.5 sm:py-3.5 rounded-full font-semibold text-sm sm:text-base transition-all duration-300 transform active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2 mt-1.5 sm:mt-0 text-center touch-manipulation"
                  >
                      {loginLoading ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          {t('Signing In') || 'Signing in...'}
                        </>
                      ) : (
                        t('Log in') || 'Log in'
                      )}
                  </button>

                  {/* Social Login Buttons */}
                  <div className="flex gap-2 sm:gap-3 mt-2.5 sm:mt-4">
                    {/* Google Login */}
                    <button
                      type="button"
                      onClick={handleGoogleLogin}
                      className="w-1/2 bg-white hover:bg-gray-100 active:bg-gray-200 text-gray-800 py-2.5 sm:py-3.5 rounded-full font-semibold text-xs sm:text-sm transition-all duration-300 transform active:scale-95 flex items-center justify-center gap-1.5 sm:gap-2 touch-manipulation"
                    >
                      <svg className="w-4 h-4 sm:w-4 sm:h-4" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                      </svg>
                      {t('google') || 'Google'}
                    </button>

                    {/* Facebook Login */}
                    <button
                      type="button"
                      onClick={handleFacebookLogin}
                      className="w-1/2 bg-[#1877F2] hover:bg-[#1565C0] active:bg-[#0d5aa7] text-white py-2.5 sm:py-3.5 rounded-full font-semibold text-xs sm:text-sm transition-all duration-300 transform active:scale-95 flex items-center justify-center gap-1.5 sm:gap-2 touch-manipulation"
                    >
                      <svg className="w-4 h-4 sm:w-4 sm:h-4" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                      </svg>
                      {t('facebook') || 'Facebook'}
                    </button>
                  </div>

                  {/* Forgot Password */}
                  <div className="text-center pt-1 sm:pt-2">
                    <button
                      type="button"
                      onClick={() => setViewMode('forgot-password')}
                      className="text-white hover:text-white/80 active:text-white/70 font-medium text-xs sm:text-sm touch-manipulation py-1"
                    >
                      {t('forgotPassword') || 'Forgot password?'}
                    </button>
                  </div>

                  {/* Sign Up Link */}
                  <div className="text-center">
                    <button
                      type="button"
                      onClick={toggleMode}
                      className="text-white hover:text-white/80 active:text-white/70 font-medium text-xs sm:text-sm touch-manipulation py-1"
                    >
                      {t('signUp') || 'Sign up'}
                    </button>
                  </div>
                </form>
              )}

              {/* Forgot Password Form */}
              {viewMode === 'forgot-password' && (
                <form onSubmit={handleForgotPassword} className="space-y-4 md:space-y-5 animate-fadeIn mx-auto w-full md:w-[90%] md:w-[70%] max-w-[500px]" style={{ fontSize: 'clamp(0.85rem, 2.5vw, 0.9rem)' }}>
                  {/* Email */}
                  <div className="relative">
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="E-mail"
                      className="w-full px-4 md:px-5 py-2.5 md:py-3 bg-black/30 border-0 rounded-full focus:outline-none focus:ring-2 focus:ring-red-500 transition-all duration-300 text-white placeholder-white/70 text-sm md:text-base"
                    />
                  </div>

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={forgotPasswordLoading}
                    className="w-full bg-red-600 hover:bg-red-700 text-white py-2.5 md:py-3 rounded-full font-semibold text-sm md:text-base transition-all duration-300 transform hover:scale-105 disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2"
                  >
                      {forgotPasswordLoading ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          {t('sending')}
                        </>
                      ) : (
                        t('sendResetCode')
                      )}
                  </button>

                  {/* Back to Login */}
                  <div className="text-center">
                    <button
                      type="button"
                      onClick={() => setViewMode('login')}
                      className="inline-flex items-center text-sm font-medium text-white hover:text-white/80"
                    >
                      <ArrowLeft className="h-4 w-4 mr-1" />
                      {t('backToLogin')}
                    </button>
                  </div>
                </form>
              )}

              {/* Verify Code Form */}
              {viewMode === 'verify-code' && (
                <form onSubmit={handleVerifyCode} className="space-y-5 md:space-y-6 animate-fadeIn mx-auto w-full md:w-[90%] md:w-[75%] max-w-[550px]">
                  {/* Code Input */}
                  <div className="relative">
                    <input
                      type="text"
                      inputMode="numeric"
                      maxLength={4}
                      required
                      value={resetCode}
                      onChange={handleCodeChange}
                      placeholder="0000"
                      className="w-full px-4 py-3 md:py-4 bg-black/30 border-0 rounded-full focus:outline-none focus:ring-2 focus:ring-red-500 transition-all duration-300 text-center text-2xl md:text-3xl tracking-widest font-mono text-white placeholder-white/70"
                      autoFocus
                    />
                    <p className="mt-2 text-xs md:text-sm text-white/70 text-center px-2">
                      Enter the 4-digit code from your email
                    </p>
                  </div>

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={verifyCodeLoading || resetCode.length !== 4}
                    className="w-full bg-red-600 hover:bg-red-700 text-white py-3 md:py-4 rounded-full font-semibold text-base md:text-lg transition-all duration-300 transform hover:scale-105 disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2"
                  >
                      {verifyCodeLoading ? (
                        <>
                          <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          Verifying...
                        </>
                      ) : (
                        'Verify Code'
                      )}
                  </button>

                  {/* Resend Code */}
                  <div className="text-center space-y-2">
                    <button
                      type="button"
                      onClick={handleResendCode}
                      disabled={resendingCode}
                      className="inline-flex items-center text-sm font-medium text-white hover:text-white/80 disabled:opacity-50"
                    >
                      <RefreshCw className={`h-4 w-4 mr-1 ${resendingCode ? 'animate-spin' : ''}`} />
                      {resendingCode ? 'Sending...' : 'Resend Code'}
                    </button>
                    <div>
                      <button
                        type="button"
                        onClick={() => setViewMode('forgot-password')}
                        className="inline-flex items-center text-sm font-medium text-white hover:text-white/80"
                      >
                        <ArrowLeft className="h-4 w-4 mr-1" />
                        Change Email
                </button>
              </div>
            </div>
                </form>
              )}

              {/* Reset Password Form */}
              {viewMode === 'reset-password' && (
                <form onSubmit={handleResetPassword} className="space-y-5 md:space-y-6 animate-fadeIn mx-auto w-full md:w-[90%] md:w-[75%] max-w-[550px]">
                  {resetPasswordSuccess ? (
                    <div className="bg-green-500/20 border border-green-500 rounded-2xl p-6 text-center">
                      <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-500/30 mb-4">
                        <Zap className="h-6 w-6 text-green-300" />
                      </div>
                      <h3 className="text-lg font-medium text-white mb-2">
                        {t('passwordResetSuccessful')}
                      </h3>
                      <p className="text-sm text-white/70">
                        {t('passwordResetSuccessfully')}
                      </p>
                    </div>
                  ) : (
                    <>
                      {/* New Password */}
                      <div className="relative">
                        <input
                          type={showNewPassword ? "text" : "password"}
                          required
                          autoComplete="off"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          placeholder={t('newPassword')}
                          className="w-full px-4 md:px-6 py-3 md:py-4 pr-10 md:pr-14 bg-black/30 border-0 rounded-full focus:outline-none focus:ring-2 focus:ring-red-500 transition-all duration-300 text-white placeholder-white/70 text-sm md:text-base"
                        />
                        <button
                          type="button"
                          onClick={() => setShowNewPassword(!showNewPassword)}
                          className="absolute right-3 md:right-4 top-1/2 -translate-y-1/2 text-white/70 hover:text-white transition-colors"
                        >
                          {showNewPassword ? <EyeOff className="h-4 w-4 md:h-5 md:w-5" /> : <Eye className="h-4 w-4 md:h-5 md:w-5" />}
                        </button>
                        {newPassword && validatePassword(newPassword).length > 0 && (
                          <p className="mt-1 text-xs text-red-300">
                            {validatePassword(newPassword)[0]}
                          </p>
                        )}
                        {newPassword && validatePassword(newPassword).length === 0 && (
                          <p className="mt-1 text-xs text-green-300">✓ {t('passwordMeetsRequirements')}</p>
                        )}
          </div>

                      {/* Confirm New Password */}
                      <div className="relative">
                        <input
                          type={showConfirmNewPassword ? "text" : "password"}
                          required
                          autoComplete="off"
                          value={confirmNewPassword}
                          onChange={(e) => setConfirmNewPassword(e.target.value)}
                          placeholder={t('confirmPassword')}
                          className="w-full px-4 md:px-6 py-3 md:py-4 pr-10 md:pr-14 bg-black/30 border-0 rounded-full focus:outline-none focus:ring-2 focus:ring-red-500 transition-all duration-300 text-white placeholder-white/70 text-sm md:text-base"
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmNewPassword(!showConfirmNewPassword)}
                          className="absolute right-3 md:right-4 top-1/2 -translate-y-1/2 text-white/70 hover:text-white transition-colors"
                        >
                          {showConfirmNewPassword ? <EyeOff className="h-4 w-4 md:h-5 md:w-5" /> : <Eye className="h-4 w-4 md:h-5 md:w-5" />}
                        </button>
                        {confirmNewPassword && newPassword !== confirmNewPassword && (
                          <p className="mt-1 text-xs text-red-300">{t('passwordsDoNotMatch')}</p>
                        )}
                        {confirmNewPassword && newPassword === confirmNewPassword && newPassword && (
                          <p className="mt-1 text-xs text-green-300">✓ {t('passwordsMatch')}</p>
                        )}
          </div>

                      {/* Submit Button */}
            <button
              type="submit"
                        disabled={resetPasswordLoading || validatePassword(newPassword).length > 0 || newPassword !== confirmNewPassword}
                        className="w-full bg-red-600 hover:bg-red-700 text-white py-3 md:py-4 rounded-full font-semibold text-base md:text-lg transition-all duration-300 transform hover:scale-105 disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2"
                      >
                          {resetPasswordLoading ? (
                            <>
                              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                              {t('resetting')}
                            </>
                          ) : (
                            t('resetPassword')
                          )}
                      </button>

                      {/* Back to Login */}
                      <div className="text-center">
                        <button
                          type="button"
                          onClick={() => setViewMode('login')}
                          className="inline-flex items-center text-sm font-medium text-white hover:text-white/80"
                        >
                          <ArrowLeft className="h-4 w-4 mr-1" />
                          {t('backToLogin')}
                        </button>
                      </div>
                    </>
                  )}
                </form>
              )}

            {/* Signup Form - 2-step flow */}
            {viewMode === 'signup' && (
              <form
                onSubmit={handleSignupSubmit}
                className="space-y-3 sm:space-y-3.5 mx-auto w-full sm:w-[90%] md:w-[75%] max-w-[420px]"
                style={{ fontSize: 'clamp(0.85rem, 2.5vw, 1rem)' }}
              >
                {/* Step indicator */}
                <div className="flex justify-center gap-2 mb-1 sm:mb-2">
                  <div className={`h-1.5 w-6 rounded-full ${signupStep === 1 ? 'bg-white' : 'bg-white/30'}`} />
                  <div className={`h-1.5 w-6 rounded-full ${signupStep === 2 ? 'bg-white' : 'bg-white/30'}`} />
                </div>

                {/* Step 1: personal data */}
                {signupStep === 1 && (
                  <div className="space-y-2.5 sm:space-y-3">
                    {/* Name fields */}
                    <div className="grid grid-cols-2 gap-2 sm:gap-3">
                      <div className="relative">
                        <input
                          name="firstName"
                          type="text"
                          required
                          value={formData.firstName}
                          onChange={handleSignupChange}
                          placeholder={t('firstName')}
                          className="w-full px-3 sm:px-5 py-2.5 sm:py-3.5 bg-black/30 border-0 rounded-full focus:outline-none focus:ring-2 focus:ring-red-500 transition-all duration-300 text-white placeholder-white/70 text-sm sm:text-base"
                        />
                        {errors.firstName && <p className="mt-1 text-xs text-red-300">{errors.firstName}</p>}
                      </div>

                      <div className="relative">
                        <input
                          name="lastName"
                          type="text"
                          required
                          value={formData.lastName}
                          onChange={handleSignupChange}
                          placeholder={t('lastName')}
                          className="w-full px-3 sm:px-5 py-2.5 sm:py-3.5 bg-black/30 border-0 rounded-full focus:outline-none focus:ring-2 focus:ring-red-500 transition-all duration-300 text-white placeholder-white/70 text-sm sm:text-base"
                        />
                        {errors.lastName && <p className="mt-1 text-xs text-red-300">{errors.lastName}</p>}
                      </div>
                    </div>

                    {/* Email */}
                    <div className="relative">
                      <input
                        name="email"
                        type="email"
                        autoComplete="email"
                        required
                        value={formData.email}
                        onChange={handleSignupChange}
                        placeholder={t('emailAddress')}
                        className="w-full px-3 sm:px-5 py-2.5 sm:py-3.5 bg-black/30 border-0 rounded-full focus:outline-none focus:ring-2 focus:ring-red-500 transition-all duration-300 text-white placeholder-white/70 text-sm sm:text-base"
                      />
                      {errors.email && <p className="mt-1 text-xs text-red-300">{errors.email}</p>}
                    </div>

                    {/* Phone */}
                    <div className="relative">
                      <input
                        name="phone"
                        type="tel"
                        value={formData.phone}
                        onChange={handleSignupChange}
                        placeholder={t('phoneNumber')}
                        className="w-full px-3 sm:px-5 py-2.5 sm:py-3.5 bg-black/30 border-0 rounded-full focus:outline-none focus:ring-2 focus:ring-red-500 transition-all duration-300 text-white placeholder-white/70 text-sm sm:text-base"
                      />
                      {errors.phone && <p className="mt-1 text-xs text-red-300">{errors.phone}</p>}
                    </div>

                    {/* Account Type */}
                    <div className="relative" ref={dropdownRef}>
                      <div
                        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                        className={`w-full px-3 sm:px-5 py-2.5 sm:py-3.5 bg-black/30 border-0 rounded-full focus:outline-none cursor-pointer text-white flex items-center justify-between text-sm sm:text-base touch-manipulation ${
                          isDropdownOpen ? 'ring-2 ring-red-500' : ''
                        }`}
                      >
                        <span>{formData.role === 'customer' ? t('customer') : t('businessOwner')}</span>
                        <ChevronDown
                          className={`w-4 h-4 sm:w-4 sm:h-4 text-white/70 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`}
                        />
                      </div>

                      {/* Dropdown Options */}
                      {isDropdownOpen && (
                        <div className="absolute w-full mt-2 bg-black/50 backdrop-blur-sm rounded-3xl shadow-xl overflow-hidden z-20">
                          <div
                            onClick={() => {
                              handleSignupChange({ target: { name: 'role', value: 'customer' } } as any);
                              setIsDropdownOpen(false);
                            }}
                            className={`px-5 py-2 cursor-pointer transition-all duration-200 text-sm ${
                              formData.role === 'customer'
                                ? 'bg-red-600 text-white font-semibold'
                                : 'hover:bg-white/10 text-white'
                            }`}
                          >
                            {t('customer')}
                          </div>
                          <div
                            onClick={() => {
                              handleSignupChange({ target: { name: 'role', value: 'business_owner' } } as any);
                              setIsDropdownOpen(false);
                            }}
                            className={`px-5 py-2 cursor-pointer transition-all duration-200 text-sm ${
                              formData.role === 'business_owner'
                                ? 'bg-red-600 text-white font-semibold'
                                : 'hover:bg-white/10 text-white'
                            }`}
                          >
                            {t('businessOwner')}
                          </div>
                        </div>
                      )}
                      {errors.role && <p className="mt-1 text-xs text-red-300">{errors.role}</p>}
                    </div>

                    {/* Next Button */}
                    <button
                      type="button"
                      onClick={() => setSignupStep(2)}
                      className="w-full bg-red-600 hover:bg-red-700 active:bg-red-800 text-white py-2.5 sm:py-3.5 rounded-full font-semibold text-sm sm:text-base transition-all duration-300 transform active:scale-95 flex items-center justify-center gap-2 mt-1 sm:mt-0 touch-manipulation"
                    >
                      {t('Next') || 'Next'}
                    </button>
                  </div>
                )}

                {/* Step 2: passwords & confirmation */}
                {signupStep === 2 && (
                  <div className="space-y-2.5 sm:space-y-3">
                    {/* Password */}
                    <div className="relative">
                      <input
                        name="password"
                        type={showPassword ? 'text' : 'password'}
                        autoComplete="off"
                        required
                        value={formData.password}
                        onChange={handleSignupChange}
                        placeholder={t('password')}
                        className="w-full px-3 sm:px-5 py-2.5 sm:py-3.5 pr-10 sm:pr-14 bg-black/30 border-0 rounded-full focus:outline-none focus:ring-2 focus:ring-red-500 transition-all duration-300 text-white placeholder-white/70 text-sm sm:text-base"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 sm:right-4 top-1/2 -translate-y-1/2 text-white/70 active:text-white transition-colors touch-manipulation"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4 sm:h-5 sm:w-5" /> : <Eye className="h-4 w-4 sm:h-5 sm:w-5" />}
                      </button>
                      {errors.password && <p className="mt-1 text-xs text-red-300">{errors.password}</p>}
                    </div>

                    {/* Confirm Password */}
                    <div className="relative">
                      <input
                        name="confirmPassword"
                        type={showConfirmPassword ? 'text' : 'password'}
                        autoComplete="off"
                        required
                        value={formData.confirmPassword}
                        onChange={handleSignupChange}
                        placeholder={t('confirmPassword')}
                        className="w-full px-3 sm:px-5 py-2.5 sm:py-3.5 pr-10 sm:pr-14 bg-black/30 border-0 rounded-full focus:outline-none focus:ring-2 focus:ring-red-500 transition-all duration-300 text-white placeholder-white/70 text-sm sm:text-base"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 sm:right-4 top-1/2 -translate-y-1/2 text-white/70 active:text-white transition-colors touch-manipulation"
                      >
                        {showConfirmPassword ? <EyeOff className="h-4 w-4 sm:h-5 sm:w-5" /> : <Eye className="h-4 w-4 sm:h-5 sm:w-5" />}
                      </button>
                      {errors.confirmPassword && <p className="mt-1 text-xs text-red-300">{errors.confirmPassword}</p>}
                    </div>

                    {/* Terms */}
                    <label className="flex items-start gap-2 cursor-pointer text-xs">
                      <input type="checkbox" className="w-3 h-3 mt-0.5 text-red-600 rounded" required />
                      <span className="text-white/80">
                        I agree to the{' '}
                        <Link to="/terms" className="text-white hover:text-white/80 underline" target="_blank">
                          Terms of Service
                        </Link>
                        {' '}and{' '}
                        <Link to="/privacy" className="text-white hover:text-white/80 underline" target="_blank">
                          Privacy Policy
                        </Link>
                      </span>
                    </label>

                    {/* Submit Button */}
                    <button
                      type="submit"
                      disabled={signupLoading}
                      className="w-full bg-red-600 hover:bg-red-700 active:bg-red-800 text-white py-2.5 sm:py-3.5 rounded-full font-semibold text-sm sm:text-base transition-all duration-300 transform active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2 mt-2 sm:mt-0 touch-manipulation"
                    >
                      {signupLoading ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          {t('creatingAccount') || 'Creating account...'}
                        </>
                      ) : (
                        t('createAccount')
                      )}
                    </button>

                    {/* Social Signup Buttons */}
                    <div className="flex gap-2 sm:gap-3 mt-2.5 sm:mt-4">
                      {/* Google Signup */}
                      <button
                        type="button"
                        onClick={handleGoogleLogin}
                        className="w-1/2 bg-white hover:bg-gray-100 active:bg-gray-200 text-gray-800 py-2.5 sm:py-3.5 rounded-full font-semibold text-xs sm:text-sm transition-all duration-300 transform active:scale-95 flex items-center justify-center gap-1.5 sm:gap-2 touch-manipulation"
                      >
                        <svg className="w-4 h-4 sm:w-4 sm:h-4" viewBox="0 0 24 24">
                          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                        </svg>
                        Google
                      </button>

                      {/* Facebook Signup */}
                      <button
                        type="button"
                        onClick={handleFacebookLogin}
                        className="w-1/2 bg-[#1877F2] hover:bg-[#1565C0] active:bg-[#0d5aa7] text-white py-2.5 sm:py-3.5 rounded-full font-semibold text-xs sm:text-sm transition-all duration-300 transform active:scale-95 flex items-center justify-center gap-1.5 sm:gap-2 touch-manipulation"
                      >
                        <svg className="w-4 h-4 sm:w-4 sm:h-4" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                        </svg>
                        Facebook
                      </button>
                    </div>

                    {/* Back Button */}
                    <button
                      type="button"
                      onClick={() => setSignupStep(1)}
                      className="w-full text-white hover:text-white/80 active:text-white/70 font-medium text-xs sm:text-sm touch-manipulation py-1"
                    >
                      {t('back') || 'Back'}
                    </button>
                  </div>
                )}
              </form>
            )}
            </div>

        {/* Toggle Link - Only show for signup */}
        {viewMode === 'signup' && (
          <p className="text-center text-white/80 mt-2 text-xs">
            {t('haveAccount')}{' '}
            <button
              type="button"
              onClick={toggleMode}
              className="text-white hover:text-white/80 font-semibold transition-colors duration-200"
            >
              {t('signIn')}
            </button>
          </p>
        )}
      </div>

      <style>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .animate-fadeIn {
          animation: fadeIn 0.5s ease-out forwards;
        }

        /* Safe area padding for mobile only */
        .forms-container-safe-area {
          padding-top: calc(max(env(safe-area-inset-top, 0px), 1.5vh) + var(--form-start, 180px));
        }

        @media (min-width: 768px) {
          .forms-container-safe-area {
            padding-top: var(--form-start, 180px);
          }
        }

        /* Language switcher safe area positioning for mobile only */
        .language-switcher-safe-area {
          top: calc(max(env(safe-area-inset-top, 0px), 1.5vh) + 0.5rem);
        }

        @media (min-width: 768px) {
          .language-switcher-safe-area {
            top: 0.75rem;
          }
        }
      `}</style>

      {/* Connection Error Modal - disabled */}
    </LoginBackground>
  );
};
