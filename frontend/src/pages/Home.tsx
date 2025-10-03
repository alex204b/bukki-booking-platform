import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useI18n } from '../contexts/I18nContext';
import { Search, Calendar, Star, MapPin, Clock } from 'lucide-react';
import { GeometricSymbol } from '../components/GeometricSymbols';

export const Home: React.FC = () => {
  const { user } = useAuth();
  const { t } = useI18n();

  const categories = [
    { name: 'Beauty Salons', icon: '💄', count: 24 },
    { name: 'Restaurants', icon: '🍽️', count: 18 },
    { name: 'Mechanics', icon: '🔧', count: 12 },
    { name: 'Tailors', icon: '✂️', count: 8 },
    { name: 'Fitness', icon: '💪', count: 15 },
    { name: 'Healthcare', icon: '🏥', count: 22 },
  ];

  const features = [
    {
      title: t('easyBooking'),
      description: 'Book appointments in just a few clicks',
      icon: Calendar,
    },
    {
      title: t('realTimeAvailability'),
      description: 'See available slots instantly',
      icon: Clock,
    },
    {
      title: t('qrCheckIn'),
      description: 'Quick and contactless check-in',
      icon: Search,
    },
    {
      title: t('locationBased'),
      description: 'Find businesses near you',
      icon: MapPin,
    },
  ];

  return (
    <div className="space-y-8">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-primary-500 to-primary-700 rounded-lg p-8 text-white relative overflow-hidden">
        <div className="absolute top-4 right-4 opacity-20">
          <GeometricSymbol variant="sun" size={80} strokeWidth={6} color="white" />
        </div>
        <div className="absolute bottom-4 left-4 opacity-15">
          <GeometricSymbol variant="mountain" size={60} strokeWidth={5} color="white" />
        </div>
        <div className="max-w-3xl relative z-10">
          <h1 className="text-4xl font-bold mb-4">
            Welcome back, {user?.firstName}! 👋
          </h1>
          <p className="text-xl text-primary-100 mb-6">
            Discover and book services from local businesses in your area. 
            From beauty salons to restaurants, we've got you covered.
          </p>
          <div className="flex flex-col sm:flex-row gap-4">
            <Link
              to="/businesses"
              className="btn bg-white text-primary-600 hover:bg-gray-100 btn-lg"
            >
              <Search className="mr-2 h-5 w-5" />
              Browse Businesses
            </Link>
            {user?.role === 'customer' && (
              <Link
                to="/my-bookings"
                className="btn btn-outline border-white text-white hover:bg-white hover:text-primary-600 btn-lg"
              >
                <Calendar className="mr-2 h-5 w-5" />
                My Bookings
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card p-6 relative">
          <div className="absolute top-2 right-2 opacity-10">
            <GeometricSymbol variant="cross" size={40} strokeWidth={4} color="#f97316" />
          </div>
          <div className="flex items-center">
            <div className="p-2 bg-primary-100 rounded-lg">
              <Calendar className="h-6 w-6 text-primary-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">{t('totalBookings')}</p>
              <p className="text-2xl font-bold text-gray-900">0</p>
            </div>
          </div>
        </div>
        
        <div className="card p-6 relative">
          <div className="absolute top-2 right-2 opacity-10">
            <GeometricSymbol variant="star" size={40} strokeWidth={4} color="#22c55e" />
          </div>
          <div className="flex items-center">
            <div className="p-2 bg-success-100 rounded-lg">
              <Star className="h-6 w-6 text-success-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">{t('favoriteBusinesses')}</p>
              <p className="text-2xl font-bold text-gray-900">0</p>
            </div>
          </div>
        </div>
        
        <div className="card p-6 relative">
          <div className="absolute top-2 right-2 opacity-10">
            <GeometricSymbol variant="diamond" size={40} strokeWidth={4} color="#a855f7" />
          </div>
          <div className="flex items-center">
            <div className="p-2 bg-accent-100 rounded-lg">
              <MapPin className="h-6 w-6 text-accent-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">{t('nearbyBusinesses')}</p>
              <p className="text-2xl font-bold text-gray-900">0</p>
            </div>
          </div>
        </div>
      </div>

      {/* Categories */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-6">{t('browseByCategory')}</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {categories.map((category) => (
            <Link
              key={category.name}
              to={`/businesses?category=${category.name.toLowerCase().replace(' ', '_')}`}
              className="card p-4 text-center hover:shadow-md transition-shadow"
            >
              <div className="text-3xl mb-2">{category.icon}</div>
              <h3 className="font-medium text-gray-900">{category.name}</h3>
              <p className="text-sm text-gray-500">{category.count} businesses</p>
            </Link>
          ))}
        </div>
      </div>

      {/* Features */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Why Choose BookIt?</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature) => (
            <div key={feature.title} className="card p-6 text-center">
              <div className="p-3 bg-primary-100 rounded-full w-fit mx-auto mb-4">
                <feature.icon className="h-6 w-6 text-primary-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">{feature.title}</h3>
              <p className="text-sm text-gray-600">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Business Owner CTA */}
      {user?.role === 'business_owner' && (
        <div className="bg-gradient-to-r from-secondary-600 to-secondary-800 rounded-lg p-8 text-white">
          <div className="max-w-3xl">
            <h2 className="text-3xl font-bold mb-4">
              Manage Your Business
            </h2>
            <p className="text-xl text-secondary-100 mb-6">
              Access your business dashboard to manage services, view bookings, 
              and track your business performance.
            </p>
            <Link
              to="/business-dashboard"
              className="btn bg-white text-secondary-600 hover:bg-gray-100 btn-lg"
            >
              Go to Dashboard
            </Link>
          </div>
        </div>
      )}

      {/* Super Admin CTA */}
      {user?.role === 'super_admin' && (
        <div className="bg-gradient-to-r from-accent-600 to-accent-800 rounded-lg p-8 text-white">
          <div className="max-w-3xl">
            <h2 className="text-3xl font-bold mb-4">
              Platform Administration
            </h2>
            <p className="text-xl text-accent-100 mb-6">
              Manage the platform, approve businesses, and monitor system performance.
            </p>
            <Link
              to="/admin-dashboard"
              className="btn bg-white text-accent-600 hover:bg-gray-100 btn-lg"
            >
              Admin Dashboard
            </Link>
          </div>
        </div>
      )}
    </div>
  );
};
