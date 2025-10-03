import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useI18n } from '../contexts/I18nContext';
import { Eye, EyeOff, Mail, Lock } from 'lucide-react';
import { GeometricSymbol } from '../components/GeometricSymbols';
import { api } from '../services/api';

export const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const { login } = useAuth();
  const { t, lang, setLang } = useI18n();
  const navigate = useNavigate();
  const location = useLocation();
  
  const from = location.state?.from?.pathname || '/';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const result = await login(email, password);
      
      // Check if user is a business owner and needs onboarding
      if (result && result.user && result.user.role === 'business_owner') {
        // Check if business owner has completed onboarding
        try {
          const businessResponse = await api.get('/businesses/my-business');
          const business = businessResponse.data;
          
          if (!business || !business.onboardingCompleted) {
            navigate('/business-onboarding');
            return;
          }
        } catch (error) {
          // If no business exists, redirect to onboarding
          navigate('/business-onboarding');
          return;
        }
      }
      
      navigate(from, { replace: true });
    } catch (error) {
      // Error is handled in the auth context
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background py-12 px-4 sm:px-6 lg:px-8 relative">
      {/* Corner language switcher */}
      <div className="absolute top-4 right-4 text-sm text-gray-700 select-none">
        <button className={`px-1 ${lang === 'ro' ? 'text-primary-600 font-semibold' : 'hover:text-primary-600'}`} onClick={() => setLang('ro')}>RO</button>
        <span className="px-1 text-gray-400">|</span>
        <button className={`px-1 ${lang === 'en' ? 'text-primary-600 font-semibold' : 'hover:text-primary-600'}`} onClick={() => setLang('en')}>EN</button>
        <span className="px-1 text-gray-400">|</span>
        <button className={`px-1 ${lang === 'ru' ? 'text-primary-600 font-semibold' : 'hover:text-primary-600'}`} onClick={() => setLang('ru')}>RU</button>
      </div>
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
            {t('signInTitle')}
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            {t('noAccount')} {' '}
            <Link
              to="/register"
              className="font-medium text-primary-600 hover:text-primary-500"
            >
              {t('signUp')}
            </Link>
          </p>
        </div>
        
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
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
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                {t('password')}
              </label>
              <div className="mt-1 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input pl-10 pr-10"
                  placeholder={t('password')}
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
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="text-sm">
              <Link
                to="/forgot-password"
                className="font-medium text-primary-600 hover:text-primary-500"
              >
                {t('forgotPassword')}
              </Link>
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
                  {t('signIn')}
                </div>
              ) : (
                t('signIn')
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
