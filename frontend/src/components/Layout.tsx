import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useQuery, useQueryClient } from 'react-query';
import { api } from '../services/api';
import {
  Home,
  Search,
  Calendar,
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
  Info
} from 'lucide-react';
import { useI18n } from '../contexts/I18nContext';
import Motif from './Motif';
import { ConfirmDialog } from './ConfirmDialog';
import { NotificationCenter } from './NotificationCenter';
import { AIAssistant } from './AIAssistant';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showAIAssistant, setShowAIAssistant] = useState(false);

  // Emit sidebar state changes as custom events
  React.useEffect(() => {
    window.dispatchEvent(new CustomEvent('sidebarStateChange', { detail: { isOpen: sidebarOpen } }));
  }, [sidebarOpen]);
  const { user, logout } = useAuth();
  const { lang, setLang, t } = useI18n();
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
    { name: t('browseBusinesses'), href: '/businesses', icon: Search },
    { name: t('appInfo'), href: '/info', icon: Info },
  ];

  // Add messages and favorites links for customers
  if (user?.role === 'customer') {
    navigation.splice(2, 0, { name: t('messages'), href: '/chat-list', icon: Mail });
    navigation.splice(3, 0, { name: t('favorites') || 'Favorites', href: '/favorites', icon: Heart });
    // Offers removed - customers can view offers in Messages interface
  }

  if (user?.role === 'business_owner') {
    navigation.splice(2, 0, { name: t('businessDashboard'), href: '/business-dashboard', icon: Building2 });
    navigation.splice(3, 0, { name: t('businessSettings'), href: '/business-settings', icon: Settings });
    navigation.splice(4, 0, { name: t('messages'), href: '/chat', icon: Mail });
    // Create Offer removed - it's available in Business Settings
  }

  if (user?.role === 'employee') {
    navigation.splice(2, 0, { name: 'Business Schedule', href: '/business-dashboard', icon: Building2 });
    navigation.splice(3, 0, { name: t('messages'), href: '/chat-list', icon: Mail });
    // Create Offer is not in menu - it's available in Messages interface
  }

  if (user?.role === 'super_admin') {
    navigation.splice(-1, 0, { name: t('adminDashboard'), href: '/admin-dashboard', icon: Shield });
  }

  // Close modals when route changes (but keep sidebar state)
  React.useEffect(() => {
    setShowNotifications(false);
    setShowAIAssistant(false);
  }, [location.pathname]);

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
      {/* Sticky Header Logo - extends full width with all top bar content */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-[#330007] border-b border-[#330007] shadow-md h-16">
        <div className="w-full h-full px-2 sm:px-3 md:px-5 lg:px-6 flex items-center justify-between gap-2">
          {/* Left side: Hamburger Menu on mobile */}
          <div className="flex items-center gap-2 sm:gap-3 flex-1">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="lg:hidden p-1.5 sm:p-2 text-white hover:text-gray-200 transition-colors flex-shrink-0"
              aria-label="Toggle menu"
            >
              <Menu className="h-5 w-5 sm:h-6 sm:w-6" />
            </button>
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
            {/* Language switcher RO|EN|RU */}
            <div className="flex items-center text-[10px] xs:text-xs sm:text-sm text-white select-none whitespace-nowrap flex-shrink-0">
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
        <div className="fixed top-16 bottom-0 left-0 flex w-52 flex-col backdrop-blur-md z-[46]" style={{
          background: 'linear-gradient(to right, rgba(255, 255, 255, 0.95), rgba(255, 255, 255, 0.85), rgba(255, 255, 255, 0.75))'
        }}>
          <div className="flex h-10 items-center justify-between px-2.5">
            <h1 className="text-lg font-bold text-[#E7001E]">BUKKi</h1>
          </div>
          {/* Mobile language switcher RO|EN|RU */}
          <div className="px-2.5 pb-1.5">
            <div className="inline-flex items-center text-[10px] text-gray-700 select-none">
              <button
                className={`px-0.5 ${lang === 'ro' ? 'text-accent-600 font-semibold' : 'hover:text-accent-600'}`}
                onClick={() => setLang('ro')}
              >RO</button>
              <span className="px-0.5 text-gray-400">|</span>
              <button
                className={`px-0.5 ${lang === 'en' ? 'text-accent-600 font-semibold' : 'hover:text-accent-600'}`}
                onClick={() => setLang('en')}
              >EN</button>
              <span className="px-0.5 text-gray-400">|</span>
              <button
                className={`px-0.5 ${lang === 'ru' ? 'text-accent-600 font-semibold' : 'hover:text-accent-600'}`}
                onClick={() => setLang('ru')}
              >RU</button>
            </div>
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
          className={`hidden lg:fixed lg:left-0 lg:top-16 lg:bottom-0 lg:flex lg:flex-col z-40 ${
            sidebarOpen ? 'w-56' : 'w-14'
          }`}
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
      <div className={`pt-16 ${sidebarOpen ? 'lg:ml-56' : 'lg:ml-14'} ${sidebarOpen ? 'lg:pointer-events-auto pointer-events-none' : ''} h-screen overflow-hidden`}>
        {/* Page content */}
        <main className="h-full bg-white overflow-auto">
          <div className="w-full h-full">
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

      {/* AI Assistant */}
      <AIAssistant 
        isOpen={showAIAssistant} 
        onClose={() => setShowAIAssistant(false)} 
      />
    </div>
  );
};
