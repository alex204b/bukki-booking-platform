import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useI18n } from '../contexts/I18nContext';
import { useQuery } from 'react-query';
import { businessService, bookingService } from '../services/api';
import { Search, Calendar, Star, MapPin, Clock, ArrowRight, TrendingUp, Building2, Mail, Phone, Facebook, Twitter, Instagram, Linkedin } from 'lucide-react';
import { GeometricSymbol } from '../components/GeometricSymbols';
import { Logo, LogoWhite } from '../components/Logo';

export const Home: React.FC = () => {
  const { user } = useAuth();
  const { t } = useI18n();

  // Fetch real category counts from API
  const { data: categoryCounts, isLoading: countsLoading } = useQuery(
    'category-counts',
    () => businessService.getCategoryCounts(),
    {
      select: (response) => response.data,
    }
  );

  // Fetch upcoming bookings for dashboard widget
  const { data: bookings } = useQuery(
    'upcoming-bookings',
    () => bookingService.getAll(),
    {
      enabled: user?.role === 'customer',
      select: (response) => {
        const now = new Date();
        return response.data.filter((booking: any) => {
          const appointmentDate = new Date(booking.appointmentDate);
          return appointmentDate >= now && booking.status !== 'cancelled';
        }).slice(0, 3); // Get next 3 upcoming
      },
    }
  );

  // Fetch trending/popular businesses
  const { data: trendingBusinesses } = useQuery(
    'trending-businesses',
    () => businessService.getAll(),
    {
      select: (response) => {
        return response.data
          .filter((b: any) => b.status === 'approved' && b.isActive)
          .sort((a: any, b: any) => (b.reviewCount || 0) - (a.reviewCount || 0))
          .slice(0, 6);
      },
    }
  );

  // Map category keys to display names and icons
  const categoryMap: Record<string, { name: string; icon: string; key: string }> = {
    beauty_salon: { name: t('categoryBeautySalon'), icon: '💄', key: 'beauty_salon' },
    restaurant: { name: t('categoryRestaurant'), icon: '🍽️', key: 'restaurant' },
    mechanic: { name: t('categoryMechanic'), icon: '🔧', key: 'mechanic' },
    tailor: { name: t('categoryTailor'), icon: '✂️', key: 'tailor' },
    fitness: { name: t('categoryFitness'), icon: '💪', key: 'fitness' },
    healthcare: { name: t('categoryHealthcare'), icon: '🏥', key: 'healthcare' },
    education: { name: t('categoryEducation'), icon: '📚', key: 'education' },
    consulting: { name: t('categoryConsulting'), icon: '💼', key: 'consulting' },
    other: { name: t('categoryOther'), icon: '🏢', key: 'other' },
  };

  // Build categories array with real counts - show ALL categories like before
  const categories = Object.entries(categoryMap)
    .map(([key, info]) => ({
      ...info,
      count: categoryCounts?.[key] || 0,
    }))
    // Don't filter - show all categories even if count is 0
    .sort((a, b) => b.count - a.count); // Sort by count descending

  const features = [
    {
      title: t('easyBooking'),
      description: t('bookAppointmentsInFewClicks'),
      icon: Calendar,
    },
    {
      title: t('realTimeAvailability'),
      description: t('seeAvailableSlotsInstantly'),
      icon: Clock,
    },
    {
      title: t('qrCheckIn'),
      description: t('quickAndContactlessCheckIn'),
      icon: Search,
    },
    {
      title: t('locationBased'),
      description: t('findBusinessesNearYou'),
      icon: MapPin,
    },
  ];

  return (
    <div className="space-y-0 w-full">
      {/* Hero Section - Mobile Optimized */}
      <div className="bg-gradient-to-br from-primary-500 via-primary-600 to-primary-700 p-4 sm:p-6 md:p-10 lg:p-16 text-white relative overflow-hidden shadow-2xl rounded-xl sm:rounded-2xl md:rounded-3xl mx-4 sm:mx-6 lg:mx-6">
        {/* Animated background elements - smaller on mobile */}
        <div className="absolute top-2 right-2 sm:top-4 sm:right-4 opacity-20 animate-pulse">
          <GeometricSymbol variant="sun" size={60} strokeWidth={4} color="white" className="sm:hidden" />
          <GeometricSymbol variant="sun" size={120} strokeWidth={6} color="white" className="hidden sm:block" />
        </div>
        <div className="absolute bottom-2 left-2 sm:bottom-4 sm:left-4 opacity-15 animate-pulse" style={{ animationDelay: '1s' }}>
          <GeometricSymbol variant="mountain" size={50} strokeWidth={3} color="white" className="sm:hidden" />
          <GeometricSymbol variant="mountain" size={100} strokeWidth={5} color="white" className="hidden sm:block" />
        </div>
        {/* Gradient overlay for depth */}
        <div className="absolute inset-0 bg-gradient-to-t from-primary-800/20 to-transparent rounded-xl sm:rounded-2xl md:rounded-3xl"></div>
        <div className="relative z-10 transform transition-all duration-300">
          <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-bold mb-2 sm:mb-3 md:mb-4 animate-fade-in">
            {t('welcomeBack')}, {user?.firstName}! 👋
          </h1>
          <p className="text-sm sm:text-base md:text-xl lg:text-2xl xl:text-3xl text-primary-100 mb-2 sm:mb-3 font-medium animate-fade-in" style={{ animationDelay: '0.1s' }}>
            {t('bookAnyLocalService')} <span className="font-bold bg-white/20 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-lg inline-block text-xs sm:text-sm md:text-base">{t('seconds')}</span>
          </p>
          {/* Social Proof Ticker - compact on mobile */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs sm:text-sm md:text-base lg:text-lg text-primary-100 mb-4 sm:mb-6 md:mb-8 animate-fade-in" style={{ animationDelay: '0.2s' }}>
            <span className="flex items-center gap-1 sm:gap-2 bg-white/10 px-2 sm:px-3 py-1 sm:py-1.5 rounded-full backdrop-blur-sm">
              <Star className="h-3 w-3 sm:h-4 sm:w-4 md:h-5 md:w-5 fill-yellow-300 text-yellow-300 animate-pulse" />
              <span className="font-semibold">4.9</span> <span className="hidden sm:inline">{t('avgRating')}</span>
            </span>
            <span className="w-1 h-1 bg-white/60 rounded-full hidden sm:inline"></span>
            <span className="bg-white/10 px-2 sm:px-3 py-1 sm:py-1.5 rounded-full backdrop-blur-sm">{t('cities')}</span>
            <span className="w-1 h-1 bg-white/60 rounded-full hidden sm:inline"></span>
            <span className="bg-white/10 px-2 sm:px-3 py-1 sm:py-1.5 rounded-full backdrop-blur-sm">{t('businessesCount')}</span>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 md:gap-6 animate-fade-in" style={{ animationDelay: '0.3s' }}>
            <Link
              to="/businesses"
              className="btn bg-white text-primary-600 hover:bg-gray-50 hover:scale-105 font-semibold group px-4 sm:px-6 md:px-8 py-2.5 sm:py-3 md:py-4 text-sm sm:text-base md:text-lg shadow-xl transition-all duration-300 hover:shadow-2xl flex items-center justify-center"
            >
              <Search className="mr-2 h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6 group-hover:scale-110 transition-transform" />
              {t('browseBusinesses')}
              <ArrowRight className="ml-2 h-4 w-4 sm:h-5 sm:w-5 group-hover:translate-x-1 transition-transform" />
            </Link>
            {user?.role === 'customer' && (
              <Link
                to="/my-bookings"
                className="btn btn-outline border-2 border-white text-white hover:bg-white hover:text-primary-600 hover:scale-105 font-semibold px-4 sm:px-6 md:px-8 py-2.5 sm:py-3 md:py-4 text-sm sm:text-base md:text-lg shadow-xl transition-all duration-300 hover:shadow-2xl flex items-center justify-center"
              >
                <Calendar className="mr-2 h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6" />
                {t('myBookings')}
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Personal Dashboard Bar - Mobile Optimized */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4 md:gap-6 lg:gap-8 px-4 sm:px-6 lg:px-6 py-4 sm:py-6 md:py-8">
        {/* Upcoming Bookings Widget */}
        <div className="card p-3 sm:p-4 md:p-6 lg:p-8 relative hover:shadow-xl transition-all duration-300 group hover:-translate-y-1 border border-gray-100 bg-white">
          <div className="absolute top-1 right-1 sm:top-2 sm:right-2 opacity-10">
            <GeometricSymbol variant="cross" size={30} strokeWidth={3} color="#f97316" className="sm:hidden" />
            <GeometricSymbol variant="cross" size={40} strokeWidth={4} color="#f97316" className="hidden sm:block" />
          </div>
          <div className="flex items-start justify-between">
            <div className="flex items-start">
              <div className="p-1.5 sm:p-2 bg-primary-100 rounded-lg group-hover:scale-110 transition-transform">
                <Calendar className="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6 text-primary-600" />
              </div>
              <div className="ml-2 sm:ml-3 md:ml-4 flex-1">
                <p className="text-xs sm:text-sm md:text-base lg:text-lg font-medium text-gray-600">{t('upcoming')}</p>
                <p className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900">
                  {bookings?.length || 0}
                </p>
                {(!bookings || bookings.length === 0) && (
                  <Link
                    to="/businesses"
                    className="text-xs sm:text-sm md:text-base text-primary-600 hover:text-primary-700 font-medium mt-1 sm:mt-2 inline-flex items-center gap-1 group/link"
                  >
                    {t('findNow')}
                    <ArrowRight className="h-3 w-3 sm:h-4 sm:w-4 group-hover/link:translate-x-1 transition-transform" />
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>
        
        {/* Favorites Widget */}
        <div className="card p-3 sm:p-4 md:p-6 lg:p-8 relative hover:shadow-xl transition-all duration-300 group hover:-translate-y-1 border border-gray-100 bg-white">
          <div className="absolute top-1 right-1 sm:top-2 sm:right-2 opacity-10">
            <GeometricSymbol variant="star" size={30} strokeWidth={3} color="#22c55e" className="sm:hidden" />
            <GeometricSymbol variant="star" size={40} strokeWidth={4} color="#22c55e" className="hidden sm:block" />
          </div>
          <div className="flex items-start justify-between">
            <div className="flex items-start">
              <div className="p-1.5 sm:p-2 bg-success-100 rounded-lg group-hover:scale-110 transition-transform">
                <Star className="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6 text-success-600" />
              </div>
              <div className="ml-2 sm:ml-3 md:ml-4 flex-1">
                <p className="text-xs sm:text-sm md:text-base lg:text-lg font-medium text-gray-600">{t('favorites')}</p>
                <p className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900">0</p>
                <Link
                  to="/businesses"
                  className="text-xs sm:text-sm md:text-base text-success-600 hover:text-success-700 font-medium mt-1 sm:mt-2 inline-flex items-center gap-1 group/link"
                >
                  {t('saveYourSpots')}
                  <ArrowRight className="h-3 w-3 sm:h-4 sm:w-4 group-hover/link:translate-x-1 transition-transform" />
                </Link>
              </div>
            </div>
          </div>
        </div>
        
        {/* My Businesses Widget */}
        {user?.role === 'business_owner' ? (
          <div className="card p-3 sm:p-4 md:p-6 lg:p-8 relative hover:shadow-xl transition-all duration-300 group hover:-translate-y-1 border border-gray-100 bg-white">
            <div className="absolute top-1 right-1 sm:top-2 sm:right-2 opacity-10">
              <GeometricSymbol variant="diamond" size={30} strokeWidth={3} color="#a855f7" className="sm:hidden" />
              <GeometricSymbol variant="diamond" size={40} strokeWidth={4} color="#a855f7" className="hidden sm:block" />
            </div>
            <div className="flex items-start justify-between">
              <div className="flex items-start">
                <div className="p-1.5 sm:p-2 bg-accent-100 rounded-lg group-hover:scale-110 transition-transform">
                  <Building2 className="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6 text-accent-600" />
                </div>
                <div className="ml-2 sm:ml-3 md:ml-4 flex-1">
                  <p className="text-xs sm:text-sm md:text-base lg:text-lg font-medium text-gray-600">{t('myBusinesses')}</p>
                  <p className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900">1</p>
                  <Link
                    to="/business-dashboard"
                    className="text-xs sm:text-sm md:text-base text-accent-600 hover:text-accent-700 font-medium mt-1 sm:mt-2 inline-flex items-center gap-1 group/link"
                  >
                    {t('manage')}
                    <ArrowRight className="h-3 w-3 sm:h-4 sm:w-4 group-hover/link:translate-x-1 transition-transform" />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="card p-3 sm:p-4 md:p-6 lg:p-8 relative hover:shadow-xl transition-all duration-300 group hover:-translate-y-1 border border-gray-100 bg-white">
            <div className="absolute top-1 right-1 sm:top-2 sm:right-2 opacity-10">
              <GeometricSymbol variant="diamond" size={30} strokeWidth={3} color="#a855f7" className="sm:hidden" />
              <GeometricSymbol variant="diamond" size={40} strokeWidth={4} color="#a855f7" className="hidden sm:block" />
            </div>
            <div className="flex items-start justify-between">
              <div className="flex items-start">
                <div className="p-1.5 sm:p-2 bg-accent-100 rounded-lg group-hover:scale-110 transition-transform">
                  <MapPin className="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6 text-accent-600" />
                </div>
                <div className="ml-2 sm:ml-3 md:ml-4 flex-1">
                  <p className="text-xs sm:text-sm md:text-base lg:text-lg font-medium text-gray-600">{t('nearby')}</p>
                  <p className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900">-</p>
                  <Link
                    to="/businesses"
                    className="text-xs sm:text-sm md:text-base text-accent-600 hover:text-accent-700 font-medium mt-1 sm:mt-2 inline-flex items-center gap-1 group/link"
                  >
                    {t('explore')}
                    <ArrowRight className="h-3 w-3 sm:h-4 sm:w-4 group-hover/link:translate-x-1 transition-transform" />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Trending Businesses Section */}
      {trendingBusinesses && trendingBusinesses.length > 0 && (
        <div className="px-4 sm:px-6 lg:px-6 py-4 sm:py-6 md:py-8">
          <div className="flex items-center justify-between mb-4 sm:mb-6">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <div className="p-1.5 sm:p-2 bg-primary-100 rounded-lg">
                <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-primary-600" />
              </div>
              <h2 className="text-lg sm:text-2xl md:text-3xl lg:text-4xl font-bold text-gray-900">{t('trendingNearby')}</h2>
            </div>
            <Link
              to="/businesses"
              className="text-xs sm:text-sm md:text-base lg:text-lg text-primary-600 hover:text-primary-700 font-medium flex items-center gap-1 transition-all duration-300 hover:gap-2 group"
            >
              {t('viewAll')}
              <ArrowRight className="h-3 w-3 sm:h-4 sm:w-4 md:h-5 md:w-5 transition-transform group-hover:translate-x-1" />
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 md:gap-6 overflow-x-auto pb-2">
            {trendingBusinesses.slice(0, 6).map((business: any) => (
              <Link
                key={business.id}
                to={`/businesses/${business.id}`}
                className="card p-3 sm:p-4 hover:shadow-xl transition-all duration-300 group hover:-translate-y-1 border border-gray-100 bg-white"
              >
                <div className="flex items-start gap-2 sm:gap-3 md:gap-4">
                  {business.logo ? (
                    <img
                      src={business.logo}
                      alt={business.name}
                      className="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 rounded-lg object-cover flex-shrink-0"
                    />
                  ) : (
                    <div className="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 rounded-lg bg-primary-100 flex items-center justify-center flex-shrink-0">
                      <Building2 className="h-6 w-6 sm:h-7 sm:w-7 md:h-8 md:w-8 text-primary-600" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm sm:text-base md:text-lg lg:text-xl font-semibold text-gray-900 truncate group-hover:text-primary-600 transition-colors">
                      {business.name}
                    </h3>
                    <p className="text-xs sm:text-sm md:text-base text-gray-500 capitalize">{business.category?.replace('_', ' ')}</p>
                    <div className="flex items-center gap-1.5 sm:gap-2 mt-1 sm:mt-2">
                      {business.rating > 0 && (
                        <div className="flex items-center gap-0.5 sm:gap-1">
                          <Star className="h-3 w-3 sm:h-4 sm:w-4 fill-yellow-400 text-yellow-400" />
                          <span className="text-xs sm:text-sm font-medium">{business.rating.toFixed(1)}</span>
                        </div>
                      )}
                      {business.reviewCount > 0 && (
                        <span className="text-xs sm:text-sm text-gray-500">({business.reviewCount} {t('reviews')})</span>
                      )}
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Categories - Horizontal Scrollable Chips */}
      <div className="px-4 sm:px-6 lg:px-6 py-4 sm:py-6 md:py-8">
        <div className="flex items-center gap-1.5 sm:gap-2 mb-4 sm:mb-6">
          <div className="p-1.5 sm:p-2 bg-primary-100 rounded-lg">
            <Search className="h-4 w-4 sm:h-5 sm:w-5 text-primary-600" />
          </div>
          <h2 className="text-lg sm:text-2xl md:text-3xl lg:text-4xl font-bold text-gray-900">{t('browseByCategory')}</h2>
        </div>
        {countsLoading ? (
          <div className="flex gap-3 sm:gap-4 md:gap-6 overflow-x-auto pb-2 -mx-4 sm:-mx-6 lg:-mx-6 px-4 sm:px-6 lg:px-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="flex-shrink-0 w-full sm:w-[calc((100%-1rem)/2)] lg:w-[calc((100%-2rem)/3)] card p-3 sm:p-4 md:p-5 text-center animate-pulse">
                <div className="h-8 w-8 sm:h-10 sm:w-10 md:h-12 md:w-12 bg-gray-200 rounded mx-auto mb-2 sm:mb-3"></div>
                <div className="h-4 sm:h-5 bg-gray-200 rounded mb-1 sm:mb-2"></div>
                <div className="h-3 sm:h-4 bg-gray-200 rounded"></div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex gap-3 sm:gap-4 md:gap-6 overflow-x-auto pb-2 scrollbar-hide -mx-4 sm:-mx-6 lg:-mx-6 px-4 sm:px-6 lg:px-6">
            {categories.map((category) => (
              <Link
                key={category.key}
                to={`/businesses?category=${category.key}`}
                className="flex-shrink-0 w-full sm:w-[calc((100%-1rem)/2)] lg:w-[calc((100%-2rem)/3)] card p-3 sm:p-4 md:p-5 text-center hover:shadow-xl transition-all duration-300 hover:scale-110 hover:-translate-y-1 border border-gray-100 bg-white"
              >
                <div className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl mb-2 sm:mb-3">{category.icon}</div>
                <h3 className="font-medium text-gray-900 text-sm sm:text-base md:text-lg mb-1 sm:mb-2">{category.name}</h3>
                <p className="text-xs sm:text-sm md:text-base text-gray-500">
                  {category.count} {category.count === 1 ? t('spot') : t('spots')}
                </p>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Features */}
      <div className="px-4 sm:px-6 lg:px-6 py-4 sm:py-6 md:py-8">
        <div className="flex items-center gap-1.5 sm:gap-2 mb-4 sm:mb-6">
          <div className="p-1.5 sm:p-2 bg-primary-100 rounded-lg">
            <Star className="h-4 w-4 sm:h-5 sm:w-5 text-primary-600 fill-primary-600" />
          </div>
          <h2 className="text-lg sm:text-2xl md:text-3xl lg:text-4xl font-bold text-gray-900">{t('whyChooseBukki')}</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-6 pb-4">
          {features.map((feature, index) => (
            <div 
              key={feature.title} 
              className="card p-3 sm:p-4 md:p-6 text-center hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border border-gray-100 bg-white group"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div className="p-2 sm:p-3 md:p-4 bg-gradient-to-br from-primary-100 to-primary-50 rounded-full w-fit mx-auto mb-2 sm:mb-3 md:mb-4 group-hover:scale-110 transition-transform duration-300">
                <feature.icon className="h-5 w-5 sm:h-6 sm:w-6 md:h-8 md:w-8 text-primary-600" />
              </div>
              <h3 className="text-sm sm:text-base md:text-lg lg:text-xl font-semibold text-gray-900 mb-1 sm:mb-2 group-hover:text-primary-600 transition-colors">{feature.title}</h3>
              <p className="text-xs sm:text-sm md:text-base text-gray-600">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Super Admin CTA */}
      {user?.role === 'super_admin' && (
        <div className="bg-gradient-to-r from-accent-600 to-accent-800 p-8 text-white mt-0">
          <div>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              {t('platformAdministration')}
            </h2>
            <p className="text-xl md:text-2xl text-accent-100 mb-6">
              {t('managePlatform')}
            </p>
            <Link
              to="/admin-dashboard"
              className="btn bg-white text-accent-600 hover:bg-gray-100 btn-lg text-lg"
            >
              {t('adminDashboard')}
            </Link>
          </div>
        </div>
      )}

      {/* Footer Section - Orange Design */}
      <footer className="bg-orange-600 overflow-hidden -mx-2 sm:-mx-4 lg:-mx-6 lg:w-[calc(100vw-16rem+3rem)]">
        <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-6">
          {/* Owner-onboarding banner */}
          {user?.role === 'customer' && (
            <div className="p-4">
              <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
                <div className="flex items-center gap-3 text-white">
                  <div>
                    <p className="text-lg md:text-xl font-semibold text-white">{t('ownABusiness')}</p>
                    <p className="text-base text-white">
                      {t('addItIn60Seconds')}
                    </p>
                  </div>
                </div>

                <Link
                  to="/business-onboarding"
                  className="flex items-center gap-2 rounded-lg bg-white border-2 border-orange-600 px-5 py-2.5 text-base md:text-lg font-semibold text-orange-600 hover:bg-orange-50 transition-all whitespace-nowrap"
                >
                  {t('addYourBusiness')}
                  <ArrowRight className="h-5 w-5" />
                </Link>
              </div>
            </div>
          )}

          {/* Separator Line */}
          {user?.role === 'customer' && (
            <div className="border-t border-white/30 mx-4"></div>
          )}

          {/* Main Footer Content */}
          <div className="px-4 py-12 text-white">
            <div className="grid grid-cols-1 gap-10 md:grid-cols-4">
              {/* Company Info */}
              <div className="space-y-4">
                <h3 className="text-2xl md:text-3xl font-bold text-white">BUKKi</h3>
                <p className="text-base md:text-lg leading-relaxed text-white/90">
                  {t('bookAnyLocalServiceFooter')}
                </p>
                <div className="flex gap-4">
                  {[Facebook, Twitter, Instagram, Linkedin].map((Icon, i) => (
                    <button
                      key={i}
                      type="button"
                      className="rounded-full border-2 border-white p-2 transition-all hover:bg-white/20"
                      aria-label={`Social media link ${i + 1}`}
                    >
                      <Icon className="h-6 w-6 text-white" />
                    </button>
                  ))}
                </div>
              </div>

              {/* Quick Links */}
              <div>
                <h4 className="mb-4 text-lg md:text-xl font-semibold">{t('quickLinks')}</h4>
                <ul className="space-y-2 text-base">
                  {[
                    { to: '/businesses', label: t('browseBusinesses') },
                    { to: '/my-bookings', label: t('myBookings') },
                    { to: '/business-onboarding', label: t('addYourBusiness') },
                    { to: '/profile', label: t('profile') },
                  ].map((l) => (
                    <li key={l.to}>
                      <Link
                        to={l.to}
                        className="inline-block text-white hover:text-orange-200 transition-colors"
                      >
                        {l.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Support */}
              <div>
                <h4 className="mb-4 text-lg md:text-xl font-semibold">{t('support')}</h4>
                <ul className="space-y-2 text-base">
                  {[t('helpCenter'), t('contactUs'), t('privacyPolicy'), t('termsOfService')].map(
                    (txt) => (
                      <li key={txt}>
                        <button
                          type="button"
                          className="inline-block text-white hover:text-orange-200 transition-colors"
                          aria-label={txt}
                        >
                          {txt}
                        </button>
                      </li>
                    )
                  )}
                </ul>
              </div>

              {/* Contact */}
              <div>
                <h4 className="mb-4 text-lg md:text-xl font-semibold">{t('contact')}</h4>
                <ul className="space-y-3 text-base">
                  <li className="flex items-center gap-2 text-white">
                    <Mail className="h-5 w-5" />
                    <a href="mailto:support@bukki.com" className="hover:text-orange-200">
                      support@bukki.com
                    </a>
                  </li>
                  <li className="flex items-center gap-2 text-white">
                    <Phone className="h-5 w-5" />
                    <a href="tel:+1234567890" className="hover:text-orange-200">
                      +1 (234) 567-890
                    </a>
                  </li>
                  <li className="flex items-start gap-2 text-white">
                    <MapPin className="h-5 w-5 mt-0.5" />
                    <span className="leading-tight">
                      123 Business Street
                      <br />
                      City, State 12345
                    </span>
                  </li>
                </ul>
              </div>
            </div>

            {/* Copyright */}
            <div className="mt-10 pt-6 text-center text-base text-white/80">
              © {new Date().getFullYear()} BUKKi. {t('allRightsReserved')}.
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};
