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

type ViewMode = 'login' | 'signup' | 'forgot-password' | 'verify-code' | 'reset-password';

export const Login: React.FC = () => {
  const [viewMode, setViewMode] = useState<ViewMode>('login');
  const [isSignUp, setIsSignUp] = useState(false);
  
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
    if (!validateAll()) return;
    setSignupLoading(true);
    
    try {
      const result = await register({
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        password: formData.password,
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
    // Clear errors when switching
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
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      const idToken = await user.getIdToken();
      
      // Send to backend
      const response = await authService.oauthLogin('google', idToken);
      const { user: userData, token: userToken } = response.data;

      // Set up the session similar to regular login
      localStorage.setItem('token', userToken);
      localStorage.setItem('user', JSON.stringify(userData));
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
      const result = await signInWithPopup(auth, facebookProvider);
      const user = result.user;
      const idToken = await user.getIdToken();
      const credential = FacebookAuthProvider.credentialFromResult(result);
      const accessToken = credential?.accessToken;
      
      // Send to backend
      const response = await authService.oauthLogin('facebook', idToken, accessToken);
      const { user: userData, token: userToken } = response.data;

      // Set up the session
      localStorage.setItem('token', userToken);
      localStorage.setItem('user', JSON.stringify(userData));
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
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Animated SVG Background - Full Height Waves */}
      <svg className="absolute inset-0 w-full h-full" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1440 800" preserveAspectRatio="none">
        <defs>
          <linearGradient id="gradient1" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style={{ stopColor: '#f97316', stopOpacity: 0.8 }} />
            <stop offset="100%" style={{ stopColor: '#fb923c', stopOpacity: 0.6 }} />
          </linearGradient>
          <linearGradient id="gradient2" x1="100%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" style={{ stopColor: '#fb923c', stopOpacity: 0.6 }} />
            <stop offset="100%" style={{ stopColor: '#fdba74', stopOpacity: 0.4 }} />
          </linearGradient>
        </defs>
        
        <path fill="url(#gradient1)" d="M0,200L48,195C96,190,192,180,288,180C384,180,480,190,576,195C672,200,768,200,864,195C960,190,1056,180,1152,175C1248,170,1344,170,1392,170L1440,170L1440,800L1392,800C1344,800,1248,800,1152,800C1056,800,960,800,864,800C768,800,672,800,576,800C480,800,384,800,288,800C192,800,96,800,48,800L0,800Z">
          <animate attributeName="d" dur="10s" repeatCount="indefinite" values="
            M0,200L48,195C96,190,192,180,288,180C384,180,480,190,576,195C672,200,768,200,864,195C960,190,1056,180,1152,175C1248,170,1344,170,1392,170L1440,170L1440,800L1392,800C1344,800,1248,800,1152,800C1056,800,960,800,864,800C768,800,672,800,576,800C480,800,384,800,288,800C192,800,96,800,48,800L0,800Z;
            M0,120L48,130C96,140,192,160,288,160C384,160,480,140,576,130C672,120,768,120,864,140C960,160,1056,200,1152,210C1248,220,1344,200,1392,190L1440,180L1440,800L1392,800C1344,800,1248,800,1152,800C1056,800,960,800,864,800C768,800,672,800,576,800C480,800,384,800,288,800C192,800,96,800,48,800L0,800Z;
            M0,200L48,195C96,190,192,180,288,180C384,180,480,190,576,195C672,200,768,200,864,195C960,190,1056,180,1152,175C1248,170,1344,170,1392,170L1440,170L1440,800L1392,800C1344,800,1248,800,1152,800C1056,800,960,800,864,800C768,800,672,800,576,800C480,800,384,800,288,800C192,800,96,800,48,800L0,800Z" />
        </path>
        
        <path fill="url(#gradient2)" d="M0,300L48,305C96,310,192,320,288,315C384,310,480,290,576,295C672,300,768,330,864,335C960,340,1056,320,1152,310C1248,300,1344,300,1392,300L1440,300L1440,800L1392,800C1344,800,1248,800,1152,800C1056,800,960,800,864,800C768,800,672,800,576,800C480,800,384,800,288,800C192,800,96,800,48,800L0,800Z">
          <animate attributeName="d" dur="15s" repeatCount="indefinite" values="
            M0,300L48,305C96,310,192,320,288,315C384,310,480,290,576,295C672,300,768,330,864,335C960,340,1056,320,1152,310C1248,300,1344,300,1392,300L1440,300L1440,800L1392,800C1344,800,1248,800,1152,800C1056,800,960,800,864,800C768,800,672,800,576,800C480,800,384,800,288,800C192,800,96,800,48,800L0,800Z;
            M0,180L48,190C96,200,192,220,288,215C384,210,480,180,576,180C672,180,768,210,864,230C960,250,1056,260,1152,250C1248,240,1344,210,1392,200L1440,190L1440,800L1392,800C1344,800,1248,800,1152,800C1056,800,960,800,864,800C768,800,672,800,576,800C480,800,384,800,288,800C192,800,96,800,48,800L0,800Z;
            M0,300L48,305C96,310,192,320,288,315C384,310,480,290,576,295C672,300,768,330,864,335C960,340,1056,320,1152,310C1248,300,1344,300,1392,300L1440,300L1440,800L1392,800C1344,800,1248,800,1152,800C1056,800,960,800,864,800C768,800,672,800,576,800C480,800,384,800,288,800C192,800,96,800,48,800L0,800Z" />
        </path>
        
        {/* Additional wave layer for depth */}
        <path fill="url(#gradient1)" d="M0,400L48,395C96,390,192,380,288,380C384,380,480,390,576,395C672,400,768,400,864,395C960,390,1056,380,1152,375C1248,370,1344,370,1392,370L1440,370L1440,800L1392,800C1344,800,1248,800,1152,800C1056,800,960,800,864,800C768,800,672,800,576,800C480,800,384,800,288,800C192,800,96,800,48,800L0,800Z" opacity="0.3">
          <animate attributeName="d" dur="12s" repeatCount="indefinite" values="
            M0,400L48,395C96,390,192,380,288,380C384,380,480,390,576,395C672,400,768,400,864,395C960,390,1056,380,1152,375C1248,370,1344,370,1392,370L1440,370L1440,800L1392,800C1344,800,1248,800,1152,800C1056,800,960,800,864,800C768,800,672,800,576,800C480,800,384,800,288,800C192,800,96,800,48,800L0,800Z;
            M0,350L48,355C96,360,192,370,288,365C384,360,480,340,576,345C672,350,768,380,864,385C960,390,1056,370,1152,360C1248,350,1344,350,1392,350L1440,350L1440,800L1392,800C1344,800,1248,800,1152,800C1056,800,960,800,864,800C768,800,672,800,576,800C480,800,384,800,288,800C192,800,96,800,48,800L0,800Z;
            M0,400L48,395C96,390,192,380,288,380C384,380,480,390,576,395C672,400,768,400,864,395C960,390,1056,380,1152,375C1248,370,1344,370,1392,370L1440,370L1440,800L1392,800C1344,800,1248,800,1152,800C1056,800,960,800,864,800C768,800,672,800,576,800C480,800,384,800,288,800C192,800,96,800,48,800L0,800Z" />
        </path>
      </svg>

      {/* Corner language switcher */}
      <div className="absolute top-4 right-4 z-30 text-xs sm:text-sm text-gray-600 select-none">
        <button 
          type="button"
          className={`px-2 transition-colors ${lang === 'ro' ? 'text-gray-900 font-bold' : 'text-gray-600 hover:text-gray-900'}`} 
          onClick={() => setLang('ro')}
        >
          RO
        </button>
        <span className="px-1 text-gray-400">|</span>
        <button 
          type="button"
          className={`px-2 transition-colors ${lang === 'en' ? 'text-gray-900 font-bold' : 'text-gray-600 hover:text-gray-900'}`} 
          onClick={() => setLang('en')}
        >
          EN
        </button>
        <span className="px-1 text-gray-400">|</span>
        <button 
          type="button"
          className={`px-2 transition-colors ${lang === 'ru' ? 'text-gray-900 font-bold' : 'text-gray-600 hover:text-gray-900'}`} 
          onClick={() => setLang('ru')}
        >
          RU
        </button>
      </div>

      {/* Login/Signup Card */}
      <div className="relative w-full max-w-md z-10">
        <div className="bg-white rounded-3xl shadow-2xl p-8 relative overflow-hidden">
          {/* Background Gradient */}
          <div className="absolute inset-0 bg-gradient-to-br from-orange-100 to-yellow-100 transition-all duration-700 ease-in-out" style={{ opacity: 0.5 }}></div>
          
          {/* Content */}
          <div className="relative z-10">
            {/* Logo with pulse */}
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-orange-500 to-pink-500 rounded-3xl mb-4 shadow-lg relative">
                <Zap className="h-10 w-10 text-white" />
                <div className="absolute inset-0 bg-orange-500 rounded-3xl animate-ping opacity-20"></div>
      </div>
              <h1 className={`text-3xl font-bold text-gray-900 mb-2 transition-all duration-500 ease-in-out`}>
                {viewMode === 'signup' ? t('signUpTitle') : 
                 viewMode === 'forgot-password' ? t('forgotPassword') :
                 viewMode === 'verify-code' ? 'Verify Reset Code' :
                 viewMode === 'reset-password' ? t('resetYourPassword') :
                 t('signInTitle')}
              </h1>
              <p className="text-gray-600 transition-all duration-500 ease-in-out">
                {viewMode === 'signup' ? t('createYourAccountToGetStarted') : 
                 viewMode === 'forgot-password' ? t('enterEmailForResetCode') :
                 viewMode === 'verify-code' ? `Enter the 4-digit code sent to ${email}` :
                 viewMode === 'reset-password' ? t('enterNewPasswordBelow') :
                 t('signInToYourAccount')}
          </p>
        </div>
        
            {/* Forms Container */}
            <div className={`relative ${
              viewMode === 'signup' 
                ? 'min-h-[650px]'
                : viewMode === 'forgot-password' || viewMode === 'verify-code'
                ? 'min-h-[230px]'
                : viewMode === 'reset-password'
                ? 'min-h-[320px]'
                : 'min-h-[300px]'
            }`}>
              {/* Login Form */}
              {viewMode === 'login' && (
                <form onSubmit={handleLoginSubmit} className="space-y-4">
                  {/* Email */}
                  <div className="relative group">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-orange-600 transition-colors duration-300">
                      <Mail className="h-5 w-5" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t('emailAddress')}
                      className="w-full pl-12 pr-4 py-4 bg-white/80 border-2 border-gray-200 rounded-2xl focus:outline-none focus:border-orange-500 focus:shadow-lg transition-all duration-300"
                />
            </div>
            
                  {/* Password */}
                  <div className="relative group">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-orange-600 transition-colors duration-300">
                      <Lock className="h-5 w-5" />
                </div>
                <input
                      type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={t('password')}
                      className="w-full pl-12 pr-12 py-4 bg-white/80 border-2 border-gray-200 rounded-2xl focus:outline-none focus:border-orange-500 focus:shadow-lg transition-all duration-300"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-orange-600 transition-colors"
                    >
                      {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>

                  {/* Remember / Forgot */}
                  <div className="flex items-center justify-between text-sm">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" className="w-4 h-4 text-orange-600 rounded" />
                      <span className="text-gray-600">{t('rememberMe')}</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => setViewMode('forgot-password')}
                      className="text-orange-600 hover:text-orange-700 font-medium"
                    >
                      {t('forgotPassword')}
                    </button>
                  </div>

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={loginLoading}
                    className="w-full bg-gradient-to-r from-orange-500 to-pink-500 text-white py-4 rounded-2xl font-semibold text-lg hover:shadow-2xl transition-all duration-300 transform hover:scale-105 disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2 group relative overflow-hidden z-20"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-pink-500 to-orange-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    <span className="relative z-10 flex items-center gap-2">
                      {loginLoading ? (
                        <>
                          <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          {t('signingIn') || 'Signing in...'}
                        </>
                      ) : (
                        <>
                          {t('signIn')}
                          <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                        </>
                      )}
                    </span>
                  </button>

                  {/* Divider - Only show for login */}
                  {viewMode === 'login' && (
                    <>
                      <div className="flex items-center my-6 gap-4">
                        <div className="flex-1 border-t-2 border-gray-200" />
                        <span className="text-gray-500 font-medium text-sm">{t('orContinueWith')}</span>
                        <div className="flex-1 border-t-2 border-gray-200" />
                      </div>

                      {/* Social Login */}
                      <div className="grid grid-cols-2 gap-4">
                    <button 
                      type="button"
                      onClick={handleGoogleLogin}
                      className="flex items-center justify-center py-3 border-2 border-gray-200 rounded-2xl hover:border-orange-300 hover:bg-orange-50 transition-all transform hover:scale-105"
                    >
                      <svg className="w-5 h-5" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                      </svg>
                    </button>
                    <button 
                      type="button"
                      onClick={handleFacebookLogin}
                      className="flex items-center justify-center py-3 border-2 border-gray-200 rounded-2xl hover:border-orange-300 hover:bg-orange-50 transition-all transform hover:scale-105"
                    >
                      <svg className="w-5 h-5" fill="#1877F2" viewBox="0 0 24 24">
                        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                      </svg>
                    </button>
                      </div>
                    </>
                  )}
                </form>
              )}

              {/* Forgot Password Form */}
              {viewMode === 'forgot-password' && (
                <form onSubmit={handleForgotPassword} className="space-y-4 animate-fadeIn">
                  {/* Email */}
                  <div className="relative group">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-orange-600 transition-colors duration-300">
                      <Mail className="h-5 w-5" />
                    </div>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder={t('emailAddress')}
                      className="w-full pl-12 pr-4 py-4 bg-white/80 border-2 border-gray-200 rounded-2xl focus:outline-none focus:border-orange-500 focus:shadow-lg transition-all duration-300"
                    />
                  </div>

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={forgotPasswordLoading}
                    className="w-full bg-gradient-to-r from-orange-500 to-pink-500 text-white py-4 rounded-2xl font-semibold text-lg hover:shadow-2xl transition-all duration-300 transform hover:scale-105 disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2 group relative overflow-hidden"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-pink-500 to-orange-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    <span className="relative z-10 flex items-center gap-2">
                      {forgotPasswordLoading ? (
                        <>
                          <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          {t('sending')}
                        </>
                      ) : (
                        <>
                          {t('sendResetCode')}
                          <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                        </>
                      )}
                    </span>
                  </button>

                  {/* Back to Login */}
                  <div className="text-center">
                    <button
                      type="button"
                      onClick={() => setViewMode('login')}
                      className="inline-flex items-center text-sm font-medium text-orange-600 hover:text-orange-700"
                    >
                      <ArrowLeft className="h-4 w-4 mr-1" />
                      {t('backToLogin')}
                    </button>
                  </div>
                </form>
              )}

              {/* Verify Code Form */}
              {viewMode === 'verify-code' && (
                <form onSubmit={handleVerifyCode} className="space-y-4 animate-fadeIn">
                  {/* Code Input */}
                  <div className="relative group">
                    <input
                      type="text"
                      inputMode="numeric"
                      maxLength={4}
                      required
                      value={resetCode}
                      onChange={handleCodeChange}
                      placeholder="0000"
                      className="w-full px-4 py-4 bg-white/80 border-2 border-gray-200 rounded-2xl focus:outline-none focus:border-orange-500 focus:shadow-lg transition-all duration-300 text-center text-3xl tracking-widest font-mono"
                      autoFocus
                    />
                    <p className="mt-2 text-xs text-gray-500 text-center">
                      Enter the 4-digit code from your email
                    </p>
                  </div>

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={verifyCodeLoading || resetCode.length !== 4}
                    className="w-full bg-gradient-to-r from-orange-500 to-pink-500 text-white py-4 rounded-2xl font-semibold text-lg hover:shadow-2xl transition-all duration-300 transform hover:scale-105 disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2 group relative overflow-hidden"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-pink-500 to-orange-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    <span className="relative z-10 flex items-center gap-2">
                      {verifyCodeLoading ? (
                        <>
                          <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          Verifying...
                        </>
                      ) : (
                        <>
                          Verify Code
                          <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                        </>
                      )}
                    </span>
                  </button>

                  {/* Resend Code */}
                  <div className="text-center space-y-2">
                    <button
                      type="button"
                      onClick={handleResendCode}
                      disabled={resendingCode}
                      className="inline-flex items-center text-sm font-medium text-orange-600 hover:text-orange-700 disabled:opacity-50"
                    >
                      <RefreshCw className={`h-4 w-4 mr-1 ${resendingCode ? 'animate-spin' : ''}`} />
                      {resendingCode ? 'Sending...' : 'Resend Code'}
                    </button>
                    <div>
                      <button
                        type="button"
                        onClick={() => setViewMode('forgot-password')}
                        className="inline-flex items-center text-sm font-medium text-gray-600 hover:text-gray-700"
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
                <form onSubmit={handleResetPassword} className="space-y-4 animate-fadeIn">
                  {resetPasswordSuccess ? (
                    <div className="bg-green-50 border border-green-200 rounded-2xl p-6 text-center">
                      <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
                        <Zap className="h-6 w-6 text-green-600" />
                      </div>
                      <h3 className="text-lg font-medium text-gray-900 mb-2">
                        {t('passwordResetSuccessful')}
                      </h3>
                      <p className="text-sm text-gray-600">
                        {t('passwordResetSuccessfully')}
                      </p>
                    </div>
                  ) : (
                    <>
                      {/* New Password */}
                      <div className="relative group">
                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-orange-600 transition-colors duration-300">
                          <Lock className="h-5 w-5" />
                        </div>
                        <input
                          type={showNewPassword ? "text" : "password"}
                          required
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          placeholder={t('newPassword')}
                          className="w-full pl-12 pr-12 py-4 bg-white/80 border-2 border-gray-200 rounded-2xl focus:outline-none focus:border-orange-500 focus:shadow-lg transition-all duration-300"
                        />
                        <button
                          type="button"
                          onClick={() => setShowNewPassword(!showNewPassword)}
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-orange-600 transition-colors"
                        >
                          {showNewPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                        </button>
                        {newPassword && validatePassword(newPassword).length > 0 && (
                          <p className="mt-1 text-xs text-red-600">
                            {validatePassword(newPassword)[0]}
                          </p>
                        )}
                        {newPassword && validatePassword(newPassword).length === 0 && (
                          <p className="mt-1 text-xs text-green-600">✓ {t('passwordMeetsRequirements')}</p>
                        )}
          </div>

                      {/* Confirm New Password */}
                      <div className="relative group">
                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-orange-600 transition-colors duration-300">
                          <Lock className="h-5 w-5" />
                        </div>
                        <input
                          type={showConfirmNewPassword ? "text" : "password"}
                          required
                          value={confirmNewPassword}
                          onChange={(e) => setConfirmNewPassword(e.target.value)}
                          placeholder={t('confirmPassword')}
                          className="w-full pl-12 pr-12 py-4 bg-white/80 border-2 border-gray-200 rounded-2xl focus:outline-none focus:border-orange-500 focus:shadow-lg transition-all duration-300"
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmNewPassword(!showConfirmNewPassword)}
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-orange-600 transition-colors"
                        >
                          {showConfirmNewPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                        </button>
                        {confirmNewPassword && newPassword !== confirmNewPassword && (
                          <p className="mt-1 text-xs text-red-600">{t('passwordsDoNotMatch')}</p>
                        )}
                        {confirmNewPassword && newPassword === confirmNewPassword && newPassword && (
                          <p className="mt-1 text-xs text-green-600">✓ {t('passwordsMatch')}</p>
                        )}
          </div>

                      {/* Submit Button */}
            <button
              type="submit"
                        disabled={resetPasswordLoading || validatePassword(newPassword).length > 0 || newPassword !== confirmNewPassword}
                        className="w-full bg-gradient-to-r from-orange-500 to-pink-500 text-white py-4 rounded-2xl font-semibold text-lg hover:shadow-2xl transition-all duration-300 transform hover:scale-105 disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2 group relative overflow-hidden"
                      >
                        <div className="absolute inset-0 bg-gradient-to-r from-pink-500 to-orange-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                        <span className="relative z-10 flex items-center gap-2">
                          {resetPasswordLoading ? (
                            <>
                              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                              {t('resetting')}
                            </>
                          ) : (
                            <>
                              {t('resetPassword')}
                              <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                            </>
                          )}
                        </span>
                      </button>

                      {/* Back to Login */}
                      <div className="text-center">
                        <button
                          type="button"
                          onClick={() => setViewMode('login')}
                          className="inline-flex items-center text-sm font-medium text-orange-600 hover:text-orange-700"
                        >
                          <ArrowLeft className="h-4 w-4 mr-1" />
                          {t('backToLogin')}
                        </button>
                      </div>
                    </>
                  )}
                </form>
              )}

              {/* Signup Form */}
              {viewMode === 'signup' && (
                <form onSubmit={handleSignupSubmit} className="space-y-4">
                  {/* Name fields */}
                  <div className="grid grid-cols-2 gap-4">
                <div className="relative group">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-orange-600 transition-all duration-300">
                    <User className="h-5 w-5" />
                  </div>
                  <input
                    name="firstName"
                    type="text"
                    required
                    value={formData.firstName}
                    onChange={handleSignupChange}
                    placeholder={t('firstName')}
                    className="w-full pl-12 pr-4 py-4 bg-white/80 border-2 border-gray-200 rounded-2xl focus:outline-none focus:border-orange-500 focus:shadow-lg transition-all duration-300"
                  />
                  {errors.firstName && <p className="mt-1 text-xs text-red-600">{errors.firstName}</p>}
                </div>
                
                <div className="relative group">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-orange-600 transition-all duration-300">
                    <User className="h-5 w-5" />
                  </div>
                  <input
                    name="lastName"
                    type="text"
                    required
                    value={formData.lastName}
                    onChange={handleSignupChange}
                    placeholder={t('lastName')}
                    className="w-full pl-12 pr-4 py-4 bg-white/80 border-2 border-gray-200 rounded-2xl focus:outline-none focus:border-orange-500 focus:shadow-lg transition-all duration-300"
                  />
                  {errors.lastName && <p className="mt-1 text-xs text-red-600">{errors.lastName}</p>}
                </div>
              </div>

                  {/* Email */}
                  <div className="relative group">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-orange-600 transition-colors duration-300">
                      <Mail className="h-5 w-5" />
                    </div>
                    <input
                      name="email"
                      type="email"
                      autoComplete="email"
                      required
                      value={formData.email}
                      onChange={handleSignupChange}
                      placeholder={t('emailAddress')}
                      className="w-full pl-12 pr-4 py-4 bg-white/80 border-2 border-gray-200 rounded-2xl focus:outline-none focus:border-orange-500 focus:shadow-lg transition-all duration-300"
                    />
                    {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email}</p>}
                  </div>

                  {/* Phone */}
                  <div className="relative group">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-orange-600 transition-colors duration-300">
                      <Phone className="h-5 w-5" />
                    </div>
                    <input
                      name="phone"
                      type="tel"
                      value={formData.phone}
                      onChange={handleSignupChange}
                      placeholder={t('phoneNumber')}
                      className="w-full pl-12 pr-4 py-4 bg-white/80 border-2 border-gray-200 rounded-2xl focus:outline-none focus:border-orange-500 focus:shadow-lg transition-all duration-300"
                    />
                    {errors.phone && <p className="mt-1 text-xs text-red-600">{errors.phone}</p>}
                  </div>

                  {/* Account Type */}
                  <div className="relative" ref={dropdownRef}>
                    <div 
                      onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                      className={`w-full pl-4 pr-10 py-4 bg-white/80 border-2 rounded-2xl focus:outline-none focus:shadow-lg cursor-pointer text-gray-700 flex items-center justify-between ${
                        isDropdownOpen 
                          ? 'border-orange-500 shadow-lg' 
                          : 'border-gray-200 hover:border-orange-300'
                      }`}
                    >
                      <span className="font-medium">{formData.role === 'customer' ? t('customer') : t('businessOwner')}</span>
                      <ChevronDown 
                        className={`w-5 h-5 text-gray-400 ${isDropdownOpen ? 'rotate-180 text-orange-600' : ''}`}
                      />
                    </div>
                    
                    {/* Dropdown Options */}
                    {isDropdownOpen && (
                    <div className="absolute w-full mt-2 bg-white rounded-2xl shadow-xl border-2 border-orange-200 overflow-hidden z-20">
                      <div 
                        onClick={() => {
                          handleSignupChange({ target: { name: 'role', value: 'customer' } } as any);
                          setIsDropdownOpen(false);
                        }}
                        className={`px-4 py-3 cursor-pointer transition-all duration-200 ${
                          formData.role === 'customer' 
                            ? 'bg-gradient-to-r from-orange-500 to-pink-500 text-white font-semibold' 
                            : 'hover:bg-orange-50 text-gray-700'
                        }`}
                      >
                        {t('customer')}
                      </div>
                      <div 
                        onClick={() => {
                          handleSignupChange({ target: { name: 'role', value: 'business_owner' } } as any);
                          setIsDropdownOpen(false);
                        }}
                        className={`px-4 py-3 cursor-pointer transition-all duration-200 ${
                          formData.role === 'business_owner' 
                            ? 'bg-gradient-to-r from-orange-500 to-pink-500 text-white font-semibold' 
                            : 'hover:bg-orange-50 text-gray-700'
                        }`}
                      >
                        {t('businessOwner')}
                      </div>
                    </div>
                    )}
                    {errors.role && <p className="mt-1 text-xs text-red-600">{errors.role}</p>}
                  </div>

                  {/* Password */}
                  <div className="relative group">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-orange-600 transition-colors duration-300">
                      <Lock className="h-5 w-5" />
                    </div>
                    <input
                      name="password"
                      type={showPassword ? "text" : "password"}
                      autoComplete="new-password"
                      required
                      value={formData.password}
                      onChange={handleSignupChange}
                      placeholder={t('password')}
                      className="w-full pl-12 pr-12 py-4 bg-white/80 border-2 border-gray-200 rounded-2xl focus:outline-none focus:border-orange-500 focus:shadow-lg transition-all duration-300"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-orange-600 transition-colors"
                    >
                      {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                    {errors.password && <p className="mt-1 text-xs text-red-600">{errors.password}</p>}
                  </div>

                  {/* Confirm Password */}
                  <div className="relative group">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-orange-600 transition-colors duration-300">
                      <Lock className="h-5 w-5" />
                    </div>
                    <input
                      name="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      autoComplete="new-password"
                      required
                      value={formData.confirmPassword}
                      onChange={handleSignupChange}
                      placeholder={t('confirmPassword')}
                      className="w-full pl-12 pr-12 py-4 bg-white/80 border-2 border-gray-200 rounded-2xl focus:outline-none focus:border-orange-500 focus:shadow-lg transition-all duration-300"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-orange-600 transition-colors"
                    >
                      {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                    {errors.confirmPassword && <p className="mt-1 text-xs text-red-600">{errors.confirmPassword}</p>}
                  </div>

                  {/* Terms */}
                  <label className="flex items-start gap-2 cursor-pointer text-sm">
                    <input type="checkbox" className="w-4 h-4 mt-0.5 text-orange-600 rounded" required />
                    <span className="text-gray-600">
                      I agree to the{' '}
                      <Link to="/terms" className="text-orange-600 hover:text-orange-700 underline" target="_blank">
                        Terms of Service
                      </Link>
                      {' '}and{' '}
                      <Link to="/privacy" className="text-orange-600 hover:text-orange-700 underline" target="_blank">
                        Privacy Policy
                      </Link>
                    </span>
                  </label>

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={signupLoading}
                    className="w-full bg-gradient-to-r from-orange-500 to-pink-500 text-white py-4 rounded-2xl font-semibold text-lg hover:shadow-2xl transition-all duration-300 transform hover:scale-105 disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2 group relative overflow-hidden"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-pink-500 to-orange-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    <span className="relative z-10 flex items-center gap-2">
                      {signupLoading ? (
                        <>
                          <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          {t('creatingAccount') || 'Creating account...'}
                        </>
                      ) : (
                        <>
                          {t('createAccount')}
                          <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                        </>
                      )}
                    </span>
                  </button>
                </form>
              )}
            </div>

            {/* Toggle Link - Only show for login/signup */}
            {(viewMode === 'login' || viewMode === 'signup') && (
              <p className={`text-center text-gray-600 transition-all duration-500 ${
                viewMode === 'signup' ? '-mt-12' : 'mt-8'
              }`}>
                {viewMode === 'signup' ? t('haveAccount') : t('noAccount')} {' '}
                <button
                  type="button"
                  onClick={toggleMode}
                  className="text-orange-600 hover:text-orange-700 font-semibold transition-colors duration-200 relative z-10"
                >
                  {viewMode === 'signup' ? t('signIn') : t('signUp')}
            </button>
              </p>
            )}
          </div>
        </div>

        {/* Floating particles */}
        <div className="absolute -top-4 -right-4 w-20 h-20 bg-orange-400 rounded-full blur-2xl opacity-50 animate-pulse"></div>
        <div className="absolute -bottom-4 -left-4 w-24 h-24 bg-pink-400 rounded-full blur-2xl opacity-50 animate-pulse" style={{animationDelay: '1s'}}></div>
      </div>

      {/* Footer with Terms and Privacy */}
      <footer className="w-full py-4 px-4 mt-auto z-10">
        <div className="max-w-md mx-auto text-center">
          <div className="flex items-center justify-center gap-4 text-sm">
            <Link
              to="/terms"
              className="text-white/90 hover:text-orange-200 transition-colors"
              target="_blank"
            >
              {t('termsOfService')}
            </Link>
            <span className="text-white/60">|</span>
            <Link
              to="/privacy"
              className="text-white/90 hover:text-orange-200 transition-colors"
              target="_blank"
            >
              {t('privacyPolicy')}
            </Link>
          </div>
          <p className="mt-2 text-xs text-white/70">
            © {new Date().getFullYear()} BUKKi. {t('allRightsReserved')}.
          </p>
        </div>
      </footer>

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
      `}</style>

      {/* Connection Error Modal */}
      <ConnectionErrorModal
        isOpen={connectionError.show}
        onClose={() => setConnectionError({ ...connectionError, show: false })}
        baseURL={connectionError.baseURL}
        isMobile={connectionError.isMobile}
      />
    </div>
  );
};
