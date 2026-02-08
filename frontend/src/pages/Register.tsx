import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useI18n } from '../contexts/I18nContext';
import { Eye, EyeOff, Mail, Lock, User, Phone } from 'lucide-react';
import { Logo } from '../components/Logo';

export const Register: React.FC = () => {
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
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const { register } = useAuth();
  const { t, lang, setLang } = useI18n();
  const navigate = useNavigate();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
    validateField(e.target.name, e.target.value);
  };

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
        // also revalidate confirm
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateAll()) return;
    setLoading(true);
    
    try {
      const result = await register({
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        password: formData.password,
        phone: formData.phone,
        role: formData.role,
      });
      
      // Check if verification is required
      if (result.requiresVerification) {
        // Store email for verification page
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
      <div className="max-w-md w-full space-y-8">
        <div>
          <div className="flex justify-center mb-6">
            <Logo size="lg" />
          </div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            {t('signUpTitle')}
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            {t('haveAccount')} {' '}
            <Link
              to="/login"
              className="font-medium text-primary-600 hover:text-primary-500"
            >
              {t('signIn')}
            </Link>
          </p>
        </div>
        
        
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="firstName" className="block text-sm font-medium text-gray-700">
                  {t('firstName')}
                </label>
                <div className="mt-1 relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <User className="h-5 w-5 text-gray-400" />
                  </div>
                <input
                    id="firstName"
                    name="firstName"
                    type="text"
                    required
                    value={formData.firstName}
                    onChange={handleChange}
                    className="input pl-10"
                    placeholder={t('firstName')}
                  />
                {errors.firstName && <p className="mt-1 text-xs text-red-600">{errors.firstName}</p>}
                </div>
              </div>
              
              <div>
                <label htmlFor="lastName" className="block text-sm font-medium text-gray-700">
                  {t('lastName')}
                </label>
                <div className="mt-1 relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <User className="h-5 w-5 text-gray-400" />
                  </div>
                <input
                    id="lastName"
                    name="lastName"
                    type="text"
                    required
                    value={formData.lastName}
                    onChange={handleChange}
                    className="input pl-10"
                    placeholder={t('lastName')}
                  />
                {errors.lastName && <p className="mt-1 text-xs text-red-600">{errors.lastName}</p>}
                </div>
              </div>
            </div>
            
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
                  value={formData.email}
                  onChange={handleChange}
                  className="input pl-10"
                  placeholder={t('emailAddress')}
                />
                {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email}</p>}
              </div>
            </div>
            
            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
                {t('phoneNumber')}
              </label>
              <div className="mt-1 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Phone className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="phone"
                  name="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={handleChange}
                  className="input pl-10"
                  placeholder={t('phoneNumber')}
                />
                {errors.phone && <p className="mt-1 text-xs text-red-600">{errors.phone}</p>}
              </div>
            </div>
            
            <div>
              <label htmlFor="role" className="block text-sm font-medium text-gray-700">
                {t('accountType')}
              </label>
              <select
                id="role"
                name="role"
                value={formData.role}
                onChange={handleChange}
                className="input"
              >
                <option value="customer">{t('customer')}</option>
                <option value="business_owner">{t('businessOwner')}</option>
              </select>
              {errors.role && <p className="mt-1 text-xs text-red-600">{errors.role}</p>}
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
                  autoComplete="off"
                  required
                  value={formData.password}
                  onChange={handleChange}
                  className="input pl-10 pr-10"
                  placeholder={t('password')}
                />
                {errors.password && <p className="mt-1 text-xs text-red-600">{errors.password}</p>}
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
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  className="input pl-10 pr-10"
                  placeholder={t('confirmPassword')}
                />
                {errors.confirmPassword && <p className="mt-1 text-xs text-red-600">{errors.confirmPassword}</p>}
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
                  Creating account...
                </div>
              ) : (
                t('createAccount')
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
