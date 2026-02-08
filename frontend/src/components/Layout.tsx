import React, { useState, useRef, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useQuery, useQueryClient } from 'react-query';
import { api } from '../services/api';
import {
  Home,
  User,
  Settings,
  LogOut,
  Menu,
  Building2,
  Shield,
  Mail,
  Heart,
  Bell,
  Sparkles,
  Tag,
  Info,
  ChevronDown,
  Globe
} from 'lucide-react';
import { useI18n } from '../contexts/I18nContext';
import { useCurrency, CURRENCY_SYMBOLS } from '../contexts/CurrencyContext';
import Motif from './Motif';
import { ConfirmDialog } from './ConfirmDialog';
import { NotificationCenter } from './NotificationCenter';
import { AIAssistant } from './AIAssistant';

interface LayoutProps {
  children: React.ReactNode;
}

const LANG_OPTIONS = [
  { code: 'ro' as const, label: 'RO' },
  { code: 'en' as const, label: 'EN' },
  { code: 'ru' as const, label: 'RU' },
] as const;

const CURRENCY_OPTIONS = [
  { code: 'USD' as const, symbol: '$', label: 'USD' },
  { code: 'GBP' as const, symbol: '£', label: 'GBP' },
  { code: 'EUR' as const, symbol: '€', label: 'EUR' },
  { code: 'RON' as const, symbol: 'lei', label: 'RON' },
  { code: 'MDL' as const, symbol: 'L', label: 'MDL' },
] as const;

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showAIAssistant, setShowAIAssistant] = useState(false);
  const [langDropdownOpen, setLangDropdownOpen] = useState(false);
  const [currencyDropdownOpen, setCurrencyDropdownOpen] = useState(false);
  const langDropdownRef = useRef<HTMLDivElement>(null);
  const currencyDropdownRef = useRef<HTMLDivElement>(null);

  // Emit sidebar state changes as custom events
  React.useEffect(() => {
    window.dispatchEvent(new CustomEvent('sidebarStateChange', { detail: { isOpen: sidebarOpen } }));
  }, [sidebarOpen]);
  const { user, logout } = useAuth();
  const { lang, setLang, t } = useI18n();
  const { currency, setCurrency } = useCurrency();
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Fetch unread notification count - works for all user types (customers, business owners, employees, admins)
  const { data: unreadCount = 0 } = useQuery(
    ['unread-notifications-count', user?.id],
    async () => {
      if (!user) return 0;
      try {
        const response = await api.get('/messages', { params: { limit: 100, offset: 0, status: 'unread' } });
        // Handle paginated response - backend returns { data: [...], total: ..., limit: ..., offset: ... }
        const messages = response.data?.data || response.data || [];
        // Filter to ensure we only count unread messages (status === 'unread')
        const unreadMessages = messages.filter((m: any) => m.status === 'unread');
        const count = unreadMessages.length;
        return count;
      } catch (error: any) {
        return 0;
      }
    },
    {
      refetchInterval: 3000, // Refresh every 3 seconds for real-time updates
      enabled: !!user, // Only fetch if user is logged in
      retry: 2,
      staleTime: 0, // Always consider data stale to ensure fresh updates
      cacheTime: 0, // Don't cache to always get fresh data
      refetchOnWindowFocus: true, // Refetch when user returns to tab
      refetchOnMount: true, // Always refetch on mount
    }
  );

  const handleLogout = () => {
    setShowLogoutConfirm(true);
  };

  const confirmLogout = () => {
    logout();
    navigate('/login');
    setShowLogoutConfirm(false);
  };

  const cancelLogout = () => {
    setShowLogoutConfirm(false);
  };

  const navigation = [
    { name: t('home'), href: '/', icon: Home },
  ];

  // Add messages and favorites links for customers
  if (user?.role === 'customer') {
    navigation.splice(1, 0, { name: t('messages'), href: '/chat-list', icon: Mail });
    navigation.splice(2, 0, { name: t('favorites') || 'Favorites', href: '/favorites', icon: Heart });
    // Offers removed - customers can view offers in Messages interface
  }

  if (user?.role === 'business_owner') {
    navigation.splice(1, 0, { name: t('Dashboard') || 'Dashboard', href: '/business-dashboard', icon: Building2 });
    navigation.splice(2, 0, { name: t('Settings') || 'Settings', href: '/business-settings', icon: Settings });
    navigation.splice(3, 0, { name: t('messages'), href: '/chat', icon: Mail });
    // Create Offer removed - it's available in Business Settings
  }

  if (user?.role === 'employee') {
    navigation.splice(1, 0, { name: 'Business Schedule', href: '/business-dashboard', icon: Building2 });
    navigation.splice(2, 0, { name: t('messages'), href: '/chat-list', icon: Mail });
    // Create Offer is not in menu - it's available in Messages interface
  }

  if (user?.role === 'super_admin') {
    navigation.splice(1, 0, { name: t('adminDashboard'), href: '/admin-dashboard', icon: Shield });
  }

  // Add Info page at the end
  navigation.push({ name: t('appInfo'), href: '/info', icon: Info });

  // Close modals when route changes (but keep sidebar state)
  React.useEffect(() => {
    setShowNotifications(false);
    setShowAIAssistant(false);
    setLangDropdownOpen(false);
    setCurrencyDropdownOpen(false);
  }, [location.pathname]);

  // Close language/currency dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (langDropdownRef.current && !langDropdownRef.current.contains(e.target as Node)) {
        setLangDropdownOpen(false);
      }
      if (currencyDropdownRef.current && !currencyDropdownRef.current.contains(e.target as Node)) {
        setCurrencyDropdownOpen(false);
      }
    };
    if (langDropdownOpen || currencyDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [langDropdownOpen, currencyDropdownOpen]);

  // Listen for sidebar toggle events from child components
  React.useEffect(() => {
    const handleToggleSidebar = () => {
      setSidebarOpen(prev => !prev);
    };
    window.addEventListener('toggleSidebar', handleToggleSidebar);
    return () => {
      window.removeEventListener('toggleSidebar', handleToggleSidebar);
    };
  }, []);

  return (
    <div className="min-h-screen bg-white">
      {/* Safe-area top bar for phones (under status bar/notch) - matches Login page implementation */}
      <div
        className="fixed inset-x-0 top-0 z-50 pointer-events-none md:hidden"
        style={{
          height: 'max(env(safe-area-inset-top, 0px), 1.5vh)',
          backgroundColor: '#330007',
        }}
      />
      
      {/* Sticky Header Logo - extends full width with all top bar content */}
      <header 
        className="fixed left-0 right-0 z-50 bg-[#330007] border-b border-[#330007] h-16 top-[max(env(safe-area-inset-top,0px),1.5vh)] md:top-0"
      >
        <div className="h-full w-full px-2 sm:px-3 md:px-5 lg:px-6 flex items-center justify-between gap-2">
          {/* Left side: Language dropdown on mobile only */}
          <div className="flex items-center gap-2 sm:gap-3 flex-1">
            <div
              ref={langDropdownRef}
              className="relative lg:hidden"
            >
              <button
                type="button"
                onClick={() => setLangDropdownOpen((o) => !o)}
                className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-white hover:bg-white/10 transition-colors"
                aria-expanded={langDropdownOpen}
                aria-haspopup="listbox"
                aria-label="Select language"
              >
                <Globe className="h-4 w-4 sm:h-5 sm:w-5 text-white flex-shrink-0" />
                <span className="text-xs sm:text-sm font-medium uppercase">{lang}</span>
                <ChevronDown
                  className={`h-3.5 w-3.5 sm:h-4 sm:w-4 text-white/80 transition-transform ${
                    langDropdownOpen ? 'rotate-180' : ''
                  }`}
                />
              </button>
              {langDropdownOpen && (
                <div
                  className="absolute left-0 top-full mt-1 min-w-[120px] py-1 rounded-lg bg-white shadow-lg border border-gray-200 z-[60]"
                  role="listbox"
                >
                  {LANG_OPTIONS.map(({ code, label }) => (
                    <button
                      key={code}
                      type="button"
                      role="option"
                      aria-selected={lang === code}
                      onClick={() => {
                        setLang(code);
                        setLangDropdownOpen(false);
                      }}
                      className={`w-full flex items-center justify-center px-3 py-2 text-sm font-medium transition-colors ${
                        lang === code
                          ? 'bg-[#E7001E] text-white'
                          : 'text-gray-800 hover:bg-gray-100'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Center: Logo - VISUALLY CENTERED BETWEEN CONTENT */}
          <div className="flex items-center justify-center flex-shrink-0">
            <img
              src="/bukki-text.png"
              alt="BUKKi Logo"
              className="h-12 sm:h-14 md:h-16 lg:h-20 w-auto object-contain"
            />
          </div>

          {/* Right side: Language switcher, AI Assistant, Notifications, Account name */}
          <div className="flex items-center gap-x-0.5 sm:gap-x-1 md:gap-x-2 lg:gap-x-4 flex-1 justify-end">
            {/* Language switcher RO|EN|RU - Hidden on mobile (lg and up only) */}
            <div className="hidden lg:flex items-center text-[10px] xs:text-xs sm:text-sm text-white select-none whitespace-nowrap flex-shrink-0">
              <button
                className={`px-0.5 sm:px-1 ${lang === 'ro' ? 'font-semibold opacity-100' : 'opacity-80 hover:opacity-100'} transition-opacity cursor-pointer`}
                onClick={() => setLang('ro')}
              >RO</button>
              <span className="px-0.5 opacity-60 flex-shrink-0">|</span>
              <button
                className={`px-0.5 sm:px-1 ${lang === 'en' ? 'font-semibold opacity-100' : 'opacity-80 hover:opacity-100'} transition-opacity cursor-pointer`}
                onClick={() => setLang('en')}
              >EN</button>
              <span className="px-0.5 opacity-60 flex-shrink-0">|</span>
              <button
                className={`px-0.5 sm:px-1 ${lang === 'ru' ? 'font-semibold opacity-100' : 'opacity-80 hover:opacity-100'} transition-opacity cursor-pointer`}
                onClick={() => setLang('ru')}
              >RU</button>
            </div>
            
            <div className="flex items-center gap-x-1 sm:gap-x-2 flex-shrink-0">
              {/* Currency dropdown */}
              <div ref={currencyDropdownRef} className="relative">
                <button
                  type="button"
                  onClick={() => setCurrencyDropdownOpen((o) => !o)}
                  className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-white hover:bg-white/10 transition-colors"
                  aria-expanded={currencyDropdownOpen}
                  aria-haspopup="listbox"
                  aria-label="Select currency"
                  title={`Currency: ${currency}`}
                >
                  <span className="text-sm font-semibold tabular-nums">
                    {CURRENCY_SYMBOLS[currency]}
                  </span>
                  <ChevronDown
                    className={`h-3.5 w-3.5 text-white/80 transition-transform ${
                      currencyDropdownOpen ? 'rotate-180' : ''
                    }`}
                  />
                </button>
                {currencyDropdownOpen && (
                  <div
                    className="absolute right-0 top-full mt-1 min-w-[140px] py-1 rounded-lg bg-white shadow-lg border border-gray-200 z-[60]"
                    role="listbox"
                  >
                    {CURRENCY_OPTIONS.map(({ code, symbol, label }) => (
                      <button
                        key={code}
                        type="button"
                        role="option"
                        aria-selected={currency === code}
                        onClick={() => {
                          setCurrency(code);
                          setCurrencyDropdownOpen(false);
                        }}
                        className={`w-full flex items-center gap-2 px-3 py-2 text-sm font-medium transition-colors ${
                          currency === code
                            ? 'bg-[#330007] text-white'
                            : 'text-gray-800 hover:bg-gray-100'
                        }`}
                      >
                        <span className="text-base font-bold w-6 text-left">{symbol}</span>
                        <span>{label}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {/* AI Assistant Button */}
              <button
                onClick={() => setShowAIAssistant(true)}
                className="relative p-1.5 sm:p-2 text-white hover:text-gray-200 transition-colors flex-shrink-0"
                title="AI Assistant"
              >
                <Sparkles className="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6" />
              </button>
              {/* Notification Bell */}
              <button
                onClick={() => setShowNotifications(true)}
                className="relative p-1.5 sm:p-2 text-white hover:text-gray-200 transition-colors flex-shrink-0"
                title={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
              >
                <Bell className="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6" />
                {/* Red dot indicator - top right corner of bell icon */}
                {Number(unreadCount) > 0 && (
                  <>
                    {/* Small red dot - always visible */}
                    <span className="absolute top-1 right-1 block h-2 w-2 sm:h-2.5 sm:w-2.5 bg-red-500 rounded-full border border-white z-[100]"></span>
                    {/* Pulsing animation */}
                    <span className="absolute top-1 right-1 block h-2 w-2 sm:h-2.5 sm:w-2.5 bg-red-500 rounded-full animate-ping opacity-75 z-[99]"></span>
                    {/* Count badge - shows number */}
                    <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-[16px] h-[16px] sm:min-w-[18px] sm:h-[18px] px-1 text-[9px] sm:text-[10px] font-bold text-white bg-red-600 rounded-full border-2 border-white shadow-lg z-[100]">
                      {Number(unreadCount) > 99 ? '99+' : Number(unreadCount)}
                    </span>
                  </>
                )}
              </button>
              
              {/* Profile Button */}
              <Link
                to="/profile"
                className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition-colors flex-shrink-0"
                title="My Profile"
              >
                <User className="h-4 w-4 sm:h-5 sm:w-5 text-white flex-shrink-0" />
                <span className="text-xs sm:text-sm text-white whitespace-nowrap hidden md:inline">
                  {user?.firstName}
                </span>
              </Link>
              {!user?.emailVerified && (
                <Link to="/verify-email" className="ml-1 sm:ml-2 px-1.5 sm:px-2 py-0.5 sm:py-1 text-xs rounded bg-yellow-100 text-yellow-800 hover:bg-yellow-200">
                  Verify
                </Link>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Mobile sidebar */}
      <div className={`fixed inset-0 z-[45] lg:hidden ${sidebarOpen ? 'block' : 'hidden'}`}>
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75 z-[45]" onClick={() => setSidebarOpen(false)} />
        <div className="fixed bottom-0 left-0 flex w-52 flex-col backdrop-blur-md z-[46]" style={{
          top: 'calc(64px + max(env(safe-area-inset-top, 0px), 1.5vh))',
          background: 'linear-gradient(to right, rgba(255, 255, 255, 0.95), rgba(255, 255, 255, 0.85), rgba(255, 255, 255, 0.75))'
        }}>
          <div className="flex h-10 items-center justify-between px-2.5">
            <h1 className="text-lg font-bold text-[#E7001E]">BUKKi</h1>
          </div>
          <nav className="flex-1 space-y-0.5 px-1.5 py-1.5">
            {navigation.map((item) => {
              const isActive = location.pathname === item.href;
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`group flex items-center px-2 py-1.5 text-xs font-medium rounded-md ${
                    isActive
                      ? 'bg-red-100 text-red-900'
                      : 'text-gray-600 hover:bg-red-50 hover:text-red-900'
                  }`}
                  onClick={() => setSidebarOpen(false)}
                >
                  <item.icon className="mr-1.5 h-3.5 w-3.5" />
                  {item.name}
                </Link>
              );
            })}
          </nav>
          <div className="border-t border-gray-200 p-2.5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="h-6 w-6 rounded-full bg-accent-100 flex items-center justify-center">
                  <User className="h-3.5 w-3.5 text-accent-600" />
                </div>
              </div>
              <div className="ml-1.5">
                <p className="text-xs font-medium text-gray-700">
                  {user?.firstName} {user?.lastName}
                </p>
                <p className="text-[10px] text-gray-500 capitalize">{user?.role}</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="mt-1.5 flex w-full items-center px-2 py-1.5 text-xs font-medium bg-white text-gray-600 hover:bg-accent-100 hover:text-accent-700 rounded-md transition-colors"
            >
              <LogOut className="mr-1.5 h-3.5 w-3.5" />
{t('signOut')}
            </button>
          </div>
        </div>
      </div>

      {/* Desktop sidebar */}
      <>
        {/* Desktop Sidebar - slides in from left, positioned below header */}
        <div
          className={`hidden lg:fixed lg:left-0 lg:bottom-0 lg:flex lg:flex-col z-40 ${
            sidebarOpen ? 'w-56' : 'w-14'
          }`}
          style={{
            top: 'calc(64px + max(env(safe-area-inset-top, 0px), 1.5vh))',
          }}
        >
          <div className="flex flex-col flex-grow backdrop-blur-md" style={{
            background: 'linear-gradient(to right, rgba(255, 255, 255, 0.95), rgba(255, 255, 255, 0.85), rgba(255, 255, 255, 0.75))'
          }}>
            {/* Hamburger Menu Button - Inside sidebar, above navigation */}
            <div className={`px-1.5 py-1.5 ${sidebarOpen ? '' : 'flex justify-center'}`}>
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="p-1.5 hover:bg-gray-100 rounded-md transition-colors"
                aria-label="Toggle menu"
              >
                <Menu className={`${sidebarOpen ? 'h-5 w-5' : 'h-4 w-4'} text-gray-700`} />
              </button>
            </div>
            <div className={`flex h-12 items-center ${sidebarOpen ? 'justify-start px-3' : 'justify-center'}`}>
              {sidebarOpen ? (
                <h1 className="text-lg font-bold text-[#E7001E]">BUKKi</h1>
              ) : (
                <img
                  src="/logo.png"
                  alt="BUKKi Logo"
                  className="h-6 w-6 object-contain"
                />
              )}
            </div>
            <nav className="flex-1 space-y-0.5 px-1.5 py-2">
              {navigation.map((item) => {
                const isActive = location.pathname === item.href;
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={`group flex items-center ${sidebarOpen ? 'px-2.5 py-2' : 'px-2 py-2'} text-sm font-medium rounded-md ${
                      isActive
                        ? 'bg-red-100 text-red-900'
                        : 'text-gray-600 hover:bg-red-50 hover:text-red-900'
                    } ${sidebarOpen ? 'justify-start' : 'justify-center'}`}
                    title={!sidebarOpen ? item.name : undefined}
                  >
                    <item.icon className={`${sidebarOpen ? 'h-4.5 w-4.5 mr-2' : 'h-5 w-5'}`} />
                    {sidebarOpen && <span>{item.name}</span>}
                  </Link>
                );
              })}
            </nav>
            {sidebarOpen ? (
              <div className="p-3">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="h-7 w-7 rounded-full bg-accent-100 flex items-center justify-center">
                      <User className="h-4 w-4 text-accent-600" />
                    </div>
                  </div>
                  <div className="ml-2">
                    <p className="text-sm font-medium text-gray-700">
                      {user?.firstName} {user?.lastName}
                    </p>
                    <p className="text-xs text-gray-500 capitalize">{user?.role}</p>
                  </div>
                </div>
                <button
                  onClick={handleLogout}
                  className="mt-2 flex w-full items-center px-2 py-1.5 text-sm font-medium bg-white text-gray-600 hover:bg-accent-100 hover:text-accent-700 rounded-md transition-colors"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  {t('signOut')}
                </button>
              </div>
            ) : (
              <div className="p-1.5 space-y-1">
                {/* Profile Icon */}
                <Link
                  to="/profile"
                  className="flex items-center justify-center p-2 text-gray-600 hover:bg-red-50 hover:text-red-900 rounded-md transition-colors"
                  title="Profile"
                >
                  <User className="h-5 w-5" />
                </Link>
                {/* Sign Out Icon */}
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center justify-center p-2 text-gray-600 hover:bg-red-50 hover:text-red-900 rounded-md transition-colors"
                  title="Sign Out"
                >
                  <LogOut className="h-5 w-5" />
                </button>
              </div>
            )}
          </div>
        </div>
      </>

      {/* Main content - always centered, sidebar overlays */}
      <div 
        className={`${sidebarOpen ? 'lg:ml-56' : 'lg:ml-14'} ${sidebarOpen ? 'lg:pointer-events-auto pointer-events-none' : ''} h-screen overflow-hidden`}
        style={{
          paddingTop: 'calc(64px + env(safe-area-inset-top, 0px))',
        }}
      >
        {/* Page content - for Chat, use overflow-hidden and full height so messages fill the screen */}
        <main className={`h-full overflow-auto bg-[#f9fafb] ${location.pathname.startsWith('/chat') || location.pathname === '/messages' ? 'overflow-hidden pb-[calc(3.5rem+env(safe-area-inset-bottom,0px))] lg:pb-0' : ''}`}>
          <div className={`w-full ${location.pathname.startsWith('/chat') || location.pathname === '/messages' || location.pathname === '/' || location.pathname === '/my-bookings' ? 'h-full min-h-0' : ''}`}>
            {children}
          </div>
        </main>
      </div>

      {/* Logout Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showLogoutConfirm}
        title="Leave Account?"
        message="Are you sure you want to log out? You'll need to sign in again to access your account."
        confirmText="Yes, Leave"
        cancelText="Cancel"
        onConfirm={confirmLogout}
        onCancel={cancelLogout}
      />

      {/* Notification Center */}
      {showNotifications && (
        <NotificationCenter 
          onClose={() => {
            setShowNotifications(false);
            // Invalidate and refetch queries when closing to refresh count immediately
            queryClient.invalidateQueries(['unread-notifications-count']);
            queryClient.invalidateQueries(['notifications']);
            queryClient.refetchQueries(['unread-notifications-count']);
          }} 
        />
      )}

      {/* Mobile Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-40 lg:hidden" style={{
        paddingBottom: 'env(safe-area-inset-bottom, 0px)'
      }}>
        <nav className="flex items-center justify-around px-1 py-2">
          {navigation.map((item) => {
            const isActive = location.pathname === item.href;
            return (
              <Link
                key={item.name}
                to={item.href}
                className={`flex flex-col items-center justify-center px-2 py-1.5 rounded-lg transition-colors flex-1 ${
                  isActive
                    ? 'text-[#E7001E]'
                    : 'text-gray-600'
                }`}
                onClick={() => setSidebarOpen(false)}
              >
                <item.icon className="h-5 w-5 mb-0.5" />
                <span className="text-[9px] font-medium text-center leading-tight">{item.name}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* AI Assistant */}
      <AIAssistant 
        isOpen={showAIAssistant} 
        onClose={() => setShowAIAssistant(false)} 
      />
    </div>
  );
};
