import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { 
  Home, 
  Search, 
  Calendar, 
  User, 
  Settings, 
  LogOut, 
  Menu, 
  X,
  Building2,
  Shield
} from 'lucide-react';
import { useI18n } from '../contexts/I18nContext';
import Motif from './Motif';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, logout } = useAuth();
  const { lang, setLang, t } = useI18n();
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navigation = [
    { name: t('home'), href: '/', icon: Home },
    { name: t('browseBusinesses'), href: '/businesses', icon: Search },
    { name: t('myBookings'), href: '/my-bookings', icon: Calendar },
    { name: t('profile'), href: '/profile', icon: User },
    { name: t('appInfo'), href: '/info', icon: Settings },
  ];

  if (user?.role === 'business_owner') {
    navigation.splice(2, 0, { name: t('businessDashboard'), href: '/business-dashboard', icon: Building2 });
    navigation.splice(3, 0, { name: t('businessSettings'), href: '/business-settings', icon: Settings });
  }

  if (user?.role === 'super_admin') {
    navigation.splice(-1, 0, { name: t('adminDashboard'), href: '/admin-dashboard', icon: Shield });
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile sidebar */}
      <div className={`fixed inset-0 z-50 lg:hidden ${sidebarOpen ? 'block' : 'hidden'}`}>
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75" onClick={() => setSidebarOpen(false)} />
        <div className="fixed inset-y-0 left-0 flex w-64 flex-col bg-white">
          <div className="flex h-16 items-center justify-between px-4">
            <h1 className="text-xl font-bold text-primary-600">BUKKi</h1>
            <button
              onClick={() => setSidebarOpen(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
          {/* Mobile language switcher RO|EN|RU */}
          <div className="px-4 pb-2">
            <div className="inline-flex items-center text-sm text-gray-700 select-none">
              <button
                className={`px-1 ${lang === 'ro' ? 'text-primary-600 font-semibold' : 'hover:text-primary-600'}`}
                onClick={() => setLang('ro')}
              >RO</button>
              <span className="px-1 text-gray-400">|</span>
              <button
                className={`px-1 ${lang === 'en' ? 'text-primary-600 font-semibold' : 'hover:text-primary-600'}`}
                onClick={() => setLang('en')}
              >EN</button>
              <span className="px-1 text-gray-400">|</span>
              <button
                className={`px-1 ${lang === 'ru' ? 'text-primary-600 font-semibold' : 'hover:text-primary-600'}`}
                onClick={() => setLang('ru')}
              >RU</button>
            </div>
          </div>
          <nav className="flex-1 space-y-1 px-2 py-4">
            {navigation.map((item) => {
              const isActive = location.pathname === item.href;
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md ${
                    isActive
                      ? 'bg-primary-100 text-primary-900'
                      : 'text-gray-600 hover:bg-primary-50 hover:text-primary-900'
                  }`}
                  onClick={() => setSidebarOpen(false)}
                >
                  <item.icon className="mr-3 h-5 w-5" />
                  {item.name}
                </Link>
              );
            })}
          </nav>
          <div className="border-t border-gray-200 p-4">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="h-8 w-8 rounded-full bg-primary-100 flex items-center justify-center">
                  <User className="h-5 w-5 text-primary-600" />
                </div>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-700">
                  {user?.firstName} {user?.lastName}
                </p>
                <p className="text-xs text-gray-500 capitalize">{user?.role}</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="mt-3 flex w-full items-center px-2 py-2 text-sm font-medium text-gray-600 hover:bg-primary-50 hover:text-primary-900 rounded-md"
            >
              <LogOut className="mr-3 h-5 w-5" />
{t('signOut')}
            </button>
          </div>
        </div>
      </div>

      {/* Desktop sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col">
        <div className="flex flex-col flex-grow bg-white border-r border-gray-200">
          <div className="flex h-16 items-center px-4 gap-2">
            <Motif className="h-6 w-6 text-accent" />
            <h1 className="text-xl font-bold text-primary-600">BUKKi</h1>
          </div>
          <nav className="flex-1 space-y-1 px-2 py-4">
            {navigation.map((item) => {
              const isActive = location.pathname === item.href;
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md ${
                    isActive
                      ? 'bg-primary-100 text-primary-900'
                      : 'text-gray-600 hover:bg-primary-50 hover:text-primary-900'
                  }`}
                >
                  <item.icon className="mr-3 h-5 w-5" />
                  {item.name}
                </Link>
              );
            })}
          </nav>
          <div className="border-t border-gray-200 p-4">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="h-8 w-8 rounded-full bg-primary-100 flex items-center justify-center">
                  <User className="h-5 w-5 text-primary-600" />
                </div>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-700">
                  {user?.firstName} {user?.lastName}
                </p>
                <p className="text-xs text-gray-500 capitalize">{user?.role}</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="mt-3 flex w-full items-center px-2 py-2 text-sm font-medium text-gray-600 hover:bg-primary-50 hover:text-primary-900 rounded-md"
            >
              <LogOut className="mr-3 h-5 w-5" />
{t('signOut')}
            </button>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Top bar */}
        <div className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-x-4 border-b border-gray-200 bg-white px-4 shadow-sm sm:gap-x-6 sm:px-6 lg:px-8">
          <button
            type="button"
            className="-m-2.5 p-2.5 text-gray-700 lg:hidden"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-6 w-6" />
          </button>
          <div className="flex flex-1 gap-x-4 self-stretch lg:gap-x-6">
            <div className="flex flex-1"></div>
            <div className="flex items-center gap-x-4 lg:gap-x-6">
              <div className="hidden lg:block lg:h-6 lg:w-px lg:bg-gray-200" />
              {/* Language switcher RO|EN|RU */}
              <div className="text-sm text-gray-700 select-none">
                <button
                  className={`px-1 ${lang === 'ro' ? 'text-primary-600 font-semibold' : 'hover:text-primary-600'}`}
                  onClick={() => setLang('ro')}
                >RO</button>
                <span className="px-1 text-gray-400">|</span>
                <button
                  className={`px-1 ${lang === 'en' ? 'text-primary-600 font-semibold' : 'hover:text-primary-600'}`}
                  onClick={() => setLang('en')}
                >EN</button>
                <span className="px-1 text-gray-400">|</span>
                <button
                  className={`px-1 ${lang === 'ru' ? 'text-primary-600 font-semibold' : 'hover:text-primary-600'}`}
                  onClick={() => setLang('ru')}
                >RU</button>
              </div>
              <div className="flex items-center gap-x-2">
                <span className="text-sm text-gray-700">
                  {t('welcome')}, {user?.firstName}!
                </span>
              {!user?.emailVerified && (
                <Link to="/verify-email" className="ml-2 px-2 py-1 text-xs rounded bg-yellow-100 text-yellow-800 hover:bg-yellow-200">
                  Verify email
                </Link>
              )}
              </div>
            </div>
          </div>
        </div>

        {/* Page content */}
        <main className="py-6">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};
