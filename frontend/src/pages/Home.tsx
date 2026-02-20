import React, { useState, useEffect, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useQuery } from 'react-query';
import { useNavigate } from 'react-router-dom';
import { bookingService, businessService, api, getCurrentApiUrl } from '../services/api';
import { Calendar, Clock, MapPin, ChevronRight, AlertCircle, ChevronLeft, X, Filter, Search, Star, Grid3x3, Layers, Map, List } from 'lucide-react';
import { format, isToday, isTomorrow, isFuture, isPast } from 'date-fns';
import { useAuth } from '../contexts/AuthContext';
import { EmptyBookings, EmptyBusinesses } from '../components/EmptyState';
import { useI18n } from '../contexts/I18nContext';
import { useCurrency } from '../contexts/CurrencyContext';
import { ListSkeleton } from '../components/LoadingSkeleton';
import { FavoriteButton } from '../components/FavoriteButton';
import { Motif } from '../components/Motif';
import { MapView } from '../components/MapView';
import toast from 'react-hot-toast';

function getDistanceKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export const Home: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { t } = useI18n();
  const { formatPrice } = useCurrency();
  const [searchParams] = useSearchParams();
  
  // Get API URL from api instance (uses dynamic mobile detection)
  const getImageApiUrl = () => {
    try {
      return (api as any).defaults?.baseURL || getCurrentApiUrl() || 'http://localhost:3000';
    } catch {
      return 'http://localhost:3000';
    }
  };

  // Search state
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedLocation, setSelectedLocation] = useState('');
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [radius, setRadius] = useState<number>(5);
  const [availableNow, setAvailableNow] = useState<boolean>(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'stack' | 'map'>('grid');
  const [isMobile, setIsMobile] = useState(false);
  
  // Force grid view on mobile when resizing to mobile
  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (mobile) setViewMode('grid');
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);
  const [selectedBusiness, setSelectedBusiness] = useState<any>(null);
  const [businessCardIndex, setBusinessCardIndex] = useState(0);
  const [sortByCategory, setSortByCategory] = useState<boolean>(true); // Default to true for Airbnb style
  const [categoryScrollPositions, setCategoryScrollPositions] = useState<{ [key: string]: number }>({});

  // Bookings state
  const [showBookings, setShowBookings] = useState(false);

  // Listen for toggleBookings event from bottom nav
  useEffect(() => {
    const handleToggleBookings = () => setShowBookings(prev => !prev);
    window.addEventListener('toggleBookings', handleToggleBookings);
    return () => window.removeEventListener('toggleBookings', handleToggleBookings);
  }, []);
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'confirmed' | 'cancelled' | 'completed'>('all');
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'upcoming' | 'past'>('all');
  const [bookingCardIndex, setBookingCardIndex] = useState(0);
  const [bookingMenuOpen, setBookingMenuOpen] = useState(false);
  const [bookingViewMode, setBookingViewMode] = useState<'list' | 'carousel'>('carousel'); // laptop only: list vs hamburger carousel
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [touchStart, setTouchStart] = useState<{ x: number; y: number } | null>(null);
  const [touchEnd, setTouchEnd] = useState<{ x: number; y: number } | null>(null);

  // Debounce search input → searchQuery (300ms)
  useEffect(() => {
    const timer = setTimeout(() => setSearchQuery(searchInput), 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const isBusinessOwner = user?.role === 'business_owner';
  const isEmployee = user?.role === 'employee';

  // Read category from URL query parameter on mount
  useEffect(() => {
    const categoryFromUrl = searchParams.get('category');
    if (categoryFromUrl) {
      setSelectedCategory(categoryFromUrl);
    }
  }, [searchParams]);

  // Listen for sidebar state changes from Layout component
  React.useEffect(() => {
    const handleSidebarChange = (event: any) => {
      setSidebarOpen(event.detail?.isOpen || false);
    };
    window.addEventListener('sidebarStateChange', handleSidebarChange);
    return () => {
      window.removeEventListener('sidebarStateChange', handleSidebarChange);
    };
  }, []);

  // Fetch businesses
  const { data: businesses, isLoading: businessesLoading, error: businessesError, refetch: refetchBusinesses } = useQuery(
    ['businesses', searchQuery, selectedCategory, selectedLocation, userLocation, radius, availableNow],
    async () => {
      // If user has a search query, always use the search API (it supports contains matching)
      if (searchQuery || selectedCategory || selectedLocation) {
        const result = await businessService.search(searchQuery, selectedCategory, selectedLocation);
        // If user also has location, filter by distance client-side
        if (userLocation && result.data) {
          const businesses = Array.isArray(result.data) ? result.data : (result.data.data || []);
          const filtered = businesses.filter((b: any) => {
            if (!b.latitude || !b.longitude) return true;
            const dist = getDistanceKm(userLocation.lat, userLocation.lng, b.latitude, b.longitude);
            return dist <= (radius || 50);
          });
          return { data: filtered };
        }
        return result;
      }
      if (userLocation) {
        return businessService.getNearby(userLocation.lat, userLocation.lng, radius, availableNow);
      }
      return businessService.getAll();
    },
    {
      select: (response) => {
        let businesses: any[] = [];
        if (Array.isArray(response.data)) {
          businesses = response.data;
        } else if (response.data?.data && Array.isArray(response.data.data)) {
          businesses = response.data.data;
        } else if (Array.isArray(response)) {
          businesses = response;
        }

        const approvedBusinesses = businesses.filter((business: any) =>
          business && business.status === 'approved' && business.isActive !== false
        );
        return approvedBusinesses;
      },
      retry: (failureCount, error: any) => {
        if (error?.response?.status === 401) {
          return false;
        }
        if (!error?.response && error?.code === 'ERR_NETWORK') {
          return false;
        }
        return failureCount < 1;
      },
    }
  );

  const shouldFetchMyBusiness = !!user && (user.role === 'business_owner' || user.role === 'employee');
  const { data: myBusiness } = useQuery(
    ['my-business'],
    () => businessService.getMyBusiness().then((r) => r.data),
    { enabled: shouldFetchMyBusiness, staleTime: 60_000 }
  );

  // Group businesses by category for Airbnb-style display
  const businessesByCategory = useMemo(() => {
    let list = (businesses || []) as any[];
    const excludeId = myBusiness?.id;
    if (excludeId) {
      list = list.filter((b: any) => b.id !== excludeId);
    }
    
    // Define category order (restaurants first, then beauty salons, etc.)
    const categoryOrder: { [key: string]: number } = {
      'restaurant': 1,
      'beauty_salon': 2,
      'barber': 2, // Group barber with beauty salon
      'mechanic': 3,
      'tailor': 4,
      'fitness': 5,
      'healthcare': 6,
      'education': 7,
      'consulting': 8,
    };
    
    // Group by category
    const grouped: { [key: string]: any[] } = {};
    list.forEach((business: any) => {
      const category = business.category || 'other';
      if (!grouped[category]) {
        grouped[category] = [];
      }
      grouped[category].push(business);
    });
    
    // Convert to array and sort by category order
    const sortedCategories = Object.entries(grouped).sort(([catA], [catB]) => {
      const orderA = categoryOrder[catA] ?? 999;
      const orderB = categoryOrder[catB] ?? 999;
      return orderA - orderB;
    });
    
    return sortedCategories;
  }, [businesses, myBusiness?.id]);

  const listData: any[] = useMemo(() => {
    return businessesByCategory.flatMap(([_, businesses]) => businesses);
  }, [businessesByCategory]);
  
  // Scroll handlers for category carousels
  const scrollCategory = (category: string, direction: 'left' | 'right') => {
    const container = document.getElementById(`category-${category}`);
    if (container) {
      const scrollAmount = 400;
      const newPosition = direction === 'right' 
        ? container.scrollLeft + scrollAmount
        : container.scrollLeft - scrollAmount;
      container.scrollTo({ left: newPosition, behavior: 'smooth' });
      setCategoryScrollPositions(prev => ({ ...prev, [category]: newPosition }));
    }
  };

  // Fetch bookings
  const { data: bookings, isLoading: bookingsLoading, error: bookingsError, refetch: refetchBookings } = useQuery(
    ['my-bookings', user?.id],
    async () => {
      const allBookingsRes = await bookingService.getAll();
      let allBookings: any[] = [];
      if (Array.isArray(allBookingsRes.data)) {
        allBookings = allBookingsRes.data;
      } else if (allBookingsRes.data?.data && Array.isArray(allBookingsRes.data.data)) {
        allBookings = allBookingsRes.data.data;
      }

      if (isBusinessOwner) {
        try {
          const businessRes = await api.get('/businesses/my-business');
          const business = businessRes.data;
          const businessBookings = business?.id
            ? allBookings.filter((b: any) =>
                b.business?.id === business.id || b.businessId === business.id
              )
            : [];
          const personalBookings = allBookings.filter((b: any) =>
            b.customer?.id === user?.id || b.customerId === user?.id
          );
          const combined = [...businessBookings, ...personalBookings];
          const seen: { [key: string]: boolean } = {};
          return combined.filter((b: any) => {
            if (seen[b.id]) return false;
            seen[b.id] = true;
            return true;
          });
        } catch (error) {
          return allBookings.filter((b: any) =>
            b.customer?.id === user?.id || b.customerId === user?.id
          );
        }
      } else if (isEmployee) {
        try {
          const businessRes = await api.get('/businesses/my-business');
          const business = businessRes.data;
          const businessBookings = business?.id
            ? allBookings.filter((b: any) =>
                b.business?.id === business.id || b.businessId === business.id
              )
            : [];
          const personalBookings = allBookings.filter((b: any) =>
            b.customer?.id === user?.id || b.customerId === user?.id
          );
          const combined = [...businessBookings, ...personalBookings];
          const seen: { [key: string]: boolean } = {};
          return combined.filter((b: any) => {
            if (seen[b.id]) return false;
            seen[b.id] = true;
            return true;
          });
        } catch (error) {
          return allBookings.filter((b: any) =>
            b.customer?.id === user?.id || b.customerId === user?.id
          );
        }
      } else {
        return allBookings.filter((b: any) =>
          b.customer?.id === user?.id || b.customerId === user?.id
        );
      }
    },
    {
      enabled: !!user,
    }
  );

  const formatDate = (date: string) => {
    const appointmentDate = new Date(date);
    if (isToday(appointmentDate)) {
      return `Today, ${format(appointmentDate, 'h:mm a')}`;
    } else if (isTomorrow(appointmentDate)) {
      return `Tomorrow, ${format(appointmentDate, 'h:mm a')}`;
    } else {
      return format(appointmentDate, 'MMM d, yyyy h:mm a');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'confirmed':
        return 'bg-accent-100 text-accent-700';
      case 'pending':
        return 'bg-accent-200 text-accent-800';
      case 'cancelled':
        return 'bg-red-100 text-red-700';
      case 'completed':
        return 'bg-accent-50 text-accent-600';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const filteredBookings = React.useMemo(() => {
    const list = bookings?.filter((booking: any) => {
      const appointmentDate = new Date(booking.appointmentDate);
      if (statusFilter !== 'all' && booking.status?.toLowerCase() !== statusFilter) {
        return false;
      }
      if (dateFilter === 'today' && !isToday(appointmentDate)) {
        return false;
      }
      if (dateFilter === 'upcoming' && !isFuture(appointmentDate)) {
        return false;
      }
      if (dateFilter === 'past' && !isPast(appointmentDate)) {
        return false;
      }
      return true;
    }) || [];
    // Sort by date: closest first (soonest appointment first)
    return [...list].sort((a: any, b: any) => new Date(a.appointmentDate).getTime() - new Date(b.appointmentDate).getTime());
  }, [bookings, statusFilter, dateFilter]);

  // Business card navigation
  const handleNextBusinessCard = () => {
    setBusinessCardIndex((prev) => (prev + 1) % listData.length);
  };

  const handlePrevBusinessCard = () => {
    setBusinessCardIndex((prev) => (prev - 1 + listData.length) % listData.length);
  };

  // Booking card navigation
  const handleNextBookingCard = () => {
    setBookingCardIndex((prev) => (prev + 1) % (filteredBookings?.length || 1));
  };

  const handlePrevBookingCard = () => {
    setBookingCardIndex((prev) => (prev - 1 + (filteredBookings?.length || 1)) % (filteredBookings?.length || 1));
  };

  // Swipe handlers for bookings
  const minSwipeDistance = 50;
  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart({
      x: e.targetTouches[0].clientX,
      y: e.targetTouches[0].clientY,
    });
  };

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd({
      x: e.targetTouches[0].clientX,
      y: e.targetTouches[0].clientY,
    });
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distanceX = touchStart.x - touchEnd.x;
    const distanceY = touchStart.y - touchEnd.y;
    const isLeftSwipe = distanceX > minSwipeDistance;
    const isRightSwipe = distanceX < -minSwipeDistance;
    const isUpSwipe = distanceY > minSwipeDistance;
    const isDownSwipe = distanceY < -minSwipeDistance;

    if (Math.abs(distanceX) > Math.abs(distanceY)) {
      if (isLeftSwipe && filteredBookings && filteredBookings.length > 0) {
        handleNextBookingCard();
      }
      if (isRightSwipe && filteredBookings && filteredBookings.length > 0) {
        handlePrevBookingCard();
      }
    } else {
      if (isUpSwipe && filteredBookings && filteredBookings.length > 0) {
        handleNextBookingCard();
      }
      if (isDownSwipe && filteredBookings && filteredBookings.length > 0) {
        handlePrevBookingCard();
      }
    }
  };

  const categories = [
    'beauty_salon',
    'restaurant',
    'mechanic',
    'tailor',
    'fitness',
    'healthcare',
    'education',
    'consulting',
  ];

  const formatCategory = (category: string) => {
    return category.split('_').map(word =>
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center px-4">
        <div className="text-center">
          <AlertCircle className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">{t('pleaseSignIn') || 'Please Sign In'}</h2>
          <p className="text-gray-600 mb-6">{t('needToSignInToViewBookings') || 'You need to be signed in to view your bookings'}</p>
          <button
            onClick={() => navigate('/login')}
            className="px-6 py-3 bg-accent-500 text-white rounded-lg hover:bg-accent-600 transition-colors font-medium"
          >
            {t('signIn')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <React.Fragment>
      <div className="h-full bg-white overflow-hidden flex flex-col pb-16 lg:pb-0">
      {/* Search Bar */}
      <div className="bg-white py-2 sm:py-3 px-3 shadow-sm flex-shrink-0">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder={t('searchPlaceholder')}
                className="w-full px-4 py-2.5 text-base border-2 border-[#E7001E] rounded-lg focus:outline-none focus:border-[#E7001E] transition-colors pr-10"
              />
              {searchInput ? (
                <button
                  type="button"
                  onClick={() => setSearchInput('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 rounded-full hover:bg-gray-200 transition-colors"
                >
                  <X className="h-4 w-4 text-gray-500" />
                </button>
              ) : (
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              )}
            </div>
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="p-2 transition-colors hover:bg-gray-100 rounded-md"
              title="Filters"
            >
              {menuOpen ? (
                <X className="h-4 w-4 text-gray-700" />
              ) : (
                <Filter className="h-4 w-4 text-gray-700" />
              )}
            </button>
            {/* Bookings Toggle Button - hidden on mobile (available in bottom nav), shown on desktop */}
            {user && (
              <button
                onClick={() => setShowBookings(!showBookings)}
                className={`hidden lg:block p-2 transition-colors rounded-md relative ${
                  showBookings ? 'bg-[#E7001E]/10 text-[#E7001E]' : 'hover:bg-gray-100 text-gray-700'
                }`}
                title={t('myBookings') || 'My Bookings'}
              >
                <Calendar className="h-4 w-4" />
                {(filteredBookings?.length ?? 0) > 0 && (
                  <span className="absolute -top-1 -right-1 bg-[#E7001E] text-white text-[10px] rounded-full w-5 h-5 flex items-center justify-center font-semibold">
                    {filteredBookings?.length ?? 0}
                  </span>
                )}
              </button>
            )}
            {/* View toggle - desktop only; on mobile show map button separately */}
            <div className="hidden md:flex bg-gray-100 rounded-lg p-0.5">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded-md transition-colors ${
                  viewMode === 'grid'
                    ? 'bg-[#E7001E] text-white shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
                title="Grid view"
              >
                <Grid3x3 className="h-4 w-4" />
              </button>
              <button
                onClick={() => setViewMode('stack')}
                className={`p-2 rounded-md transition-colors ${
                  viewMode === 'stack'
                    ? 'bg-[#E7001E] text-white shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
                title="Stack view"
              >
                <Layers className="h-4 w-4" />
              </button>
              <button
                onClick={() => setViewMode('map')}
                className={`p-2 rounded-md transition-colors ${
                  viewMode === 'map'
                    ? 'bg-[#E7001E] text-white shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
                title="Map view"
              >
                <Map className="h-4 w-4" />
              </button>
            </div>
            {/* Grid + Map buttons - mobile only (full view toggle hidden on small screens) */}
            <div className="flex md:hidden bg-gray-100 rounded-lg p-0.5 gap-0.5">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded-md transition-colors ${
                  viewMode === 'grid' ? 'bg-[#E7001E] text-white' : 'text-gray-500 hover:text-gray-700'
                }`}
                title="List view"
              >
                <List className="h-4 w-4" />
              </button>
              <button
                onClick={() => setViewMode('map')}
                className={`p-2 rounded-md transition-colors ${
                  viewMode === 'map' ? 'bg-[#E7001E] text-white' : 'text-gray-500 hover:text-gray-700'
                }`}
                title="Map view"
              >
                <Map className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Filters Sidebar - below navbar; on phone, account for safe-area (notch/status bar) */}
      <div
        className={`fixed right-0 bottom-0 w-72 backdrop-blur-md z-[110] transform transition-transform duration-300 ease-in-out ${
          menuOpen ? 'translate-x-0' : 'translate-x-full'
        } top-[calc(4rem+max(env(safe-area-inset-top,0px),1.5vh))] md:top-16`}
        style={{
          background: 'linear-gradient(to left, rgba(255, 255, 255, 0.95), rgba(255, 255, 255, 0.85), rgba(255, 255, 255, 0.75))'
        }}
      >
        <div className="h-full overflow-y-auto">
          <div className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-900">Filters</h2>
              <button
                onClick={() => setMenuOpen(false)}
                className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
                aria-label="Close menu"
              >
                <X className="h-5 w-5 text-gray-700" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">Category</label>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                >
                  <option value="">All Categories</option>
                  {categories.map((category) => (
                    <option key={category} value={category}>
                      {formatCategory(category)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">Radius</label>
                <select
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                  value={radius}
                  onChange={(e) => setRadius(parseInt(e.target.value))}
                >
                  {[1,3,5,10,20].map(r => <option key={r} value={r}>{r} km</option>)}
                </select>
              </div>
              <div>
                <button
                  type="button"
                  className="w-full px-3 py-2 text-sm bg-[#E7001E] text-white rounded-lg hover:bg-[#330007] transition-colors"
                  onClick={() => {
                    if (!navigator.geolocation) {
                      toast.error('Geolocation not supported');
                      return;
                    }
                    navigator.geolocation.getCurrentPosition(
                      (pos) => setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
                      () => toast.error('Location permission denied'),
                      { enableHighAccuracy: true, timeout: 8000 }
                    );
                  }}
                >
                  Use my location
                </button>
              </div>
              <label className="flex items-center gap-2 text-xs text-gray-700">
                <input
                  type="checkbox"
                  checked={availableNow}
                  onChange={(e) => setAvailableNow(e.target.checked)}
                  className="rounded border-gray-300 text-blue-500 focus:ring-blue-500"
                />
                Available now
              </label>
              <label className="flex items-center gap-2 text-xs text-gray-700">
                <input
                  type="checkbox"
                  checked={sortByCategory}
                  onChange={(e) => setSortByCategory(e.target.checked)}
                  className="rounded border-gray-300 text-blue-500 focus:ring-blue-500"
                />
                Sort by Category
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area - Businesses View */}
      <div className={`flex-1 min-h-0 relative flex flex-col ${viewMode === 'map' ? 'overflow-hidden' : 'overflow-y-auto overflow-x-hidden'}`}>
        {viewMode === 'map' ? (
                <div className="absolute inset-0 z-0">
                  {businessesLoading ? (
                    <div className="w-full px-4">
                      <ListSkeleton count={3} />
                    </div>
                  ) : listData.length === 0 ? (
                    <div className="w-full px-4">
                      <EmptyBusinesses searchQuery={searchInput} onSearch={() => {
                        setSearchInput('');
                        setSelectedCategory('');
                        setSelectedLocation('');
                        setUserLocation(null);
                        setAvailableNow(false);
                      }} />
                    </div>
                  ) : (
                    <div className="absolute inset-0 z-0">
                      <MapView
                        markers={listData
                          .filter((business: any) => {
                            const lat = parseFloat(business.latitude);
                            const lng = parseFloat(business.longitude);
                            return !isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
                          })
                          .map((business: any) => ({
                            id: business.id,
                            name: business.name,
                            category: business.category,
                            address: business.address,
                            city: business.city,
                            state: business.state,
                            phone: business.phone,
                            latitude: parseFloat(business.latitude),
                            longitude: parseFloat(business.longitude),
                            rating: business.rating,
                            reviewCount: business.reviewCount,
                            images: business.images,
                          }))}
                        center={userLocation || undefined}
                        selectedBusiness={selectedBusiness}
                      />
                    </div>
                  )}
                </div>
              ) : viewMode === 'grid' ? (
                <div className="w-full overflow-y-auto overflow-x-hidden py-6 px-4" style={{ WebkitOverflowScrolling: 'touch' }}>
                  {businessesLoading ? (
                    <ListSkeleton count={10} />
                  ) : businessesByCategory.length === 0 ? (
                    <div className="px-4">
                      <EmptyBusinesses searchQuery={searchInput} onSearch={() => {
                        setSearchInput('');
                        setSelectedCategory('');
                        setSelectedLocation('');
                        setUserLocation(null);
                        setAvailableNow(false);
                      }} />
                    </div>
                  ) : (
                    businessesByCategory.map(([category, categoryBusinesses]) => (
                      <div key={category} className="mb-2">
                        {/* Category Header */}
                        <div className="flex items-center justify-between mb-1.5 px-2">
                          <h2 className="text-xl font-semibold text-gray-900">
                            {formatCategory(category)}
                          </h2>
                          {/* Scroll buttons hidden on phone; finger scroll works */}
                          <div className="hidden md:flex items-center gap-2">
                            <button
                              onClick={() => scrollCategory(category, 'left')}
                              className="p-2 rounded-full bg-white shadow-md hover:shadow-lg transition-shadow border border-gray-200"
                              aria-label="Scroll left"
                            >
                              <ChevronLeft className="h-5 w-5 text-gray-700" />
                            </button>
                            <button
                              onClick={() => scrollCategory(category, 'right')}
                              className="p-2 rounded-full bg-white shadow-md hover:shadow-lg transition-shadow border border-gray-200"
                              aria-label="Scroll right"
                            >
                              <ChevronRight className="h-5 w-5 text-gray-700" />
                            </button>
                          </div>
                        </div>
                        
                        {/* Horizontal Scrollable Cards */}
                        <div
                          id={`category-${category}`}
                          className="flex gap-4 overflow-x-auto scrollbar-hide pb-4 px-2"
                          style={{ 
                            scrollbarWidth: 'none', 
                            msOverflowStyle: 'none',
                            WebkitOverflowScrolling: 'touch',
                            overflowY: 'hidden'
                          }}
                        >
                          {categoryBusinesses.map((business: any) => (
                            <Link
                              key={business.id}
                              to={`/businesses/${business.id}`}
                              className="flex-shrink-0 w-64 group"
                              style={{ minWidth: '256px' }}
                            >
                              <div className="bg-white rounded-2xl overflow-hidden hover:shadow-xl transition-all duration-300 cursor-pointer border border-gray-100">
                                {/* Top: light grey with image or motif + heart */}
                                {business.images && business.images.length > 0 ? (
                                  <div className="relative h-40 bg-gray-100 overflow-hidden">
                                    <img
                                      src={(() => {
                                        const img = business.images[0];
                                        if (img.startsWith('http')) return img;
                                        const apiUrl = getImageApiUrl();
                                        const path = img.startsWith('/') ? img : `/${img}`;
                                        return `${apiUrl}${path}`;
                                      })()}
                                      alt={business.name}
                                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                      onError={(e) => {
                                        (e.target as HTMLImageElement).style.display = 'none';
                                      }}
                                    />
                                    <div className="absolute top-2 right-2 z-10">
                                      <FavoriteButton businessId={business.id} size="sm" />
                                    </div>
                                  </div>
                                ) : (
                                  <div className="h-40 bg-gray-100 flex items-center justify-center relative rounded-t-2xl">
                                    <Motif variant="sprig" className="h-10 w-10 text-gray-400" />
                                    <div className="absolute top-2 right-2 z-10">
                                      <FavoriteButton businessId={business.id} size="sm" />
                                    </div>
                                  </div>
                                )}
                                {/* Bottom: white - name, category, rating, location, services */}
                                <div className="p-3 bg-white">
                                  <div className="flex items-start justify-between gap-1 mb-0.5">
                                    <div className="flex-1 min-w-0">
                                      <h3 className="text-sm font-bold text-gray-900 truncate">
                                        {business.name}
                                      </h3>
                                      <p className="text-xs text-gray-500 capitalize truncate">
                                        {formatCategory(business.category)}
                                      </p>
                                    </div>
                                    <div className="flex items-center flex-shrink-0">
                                      <Star className="h-3.5 w-3.5 text-yellow-500 fill-current mr-0.5" />
                                      <span className="text-xs font-semibold text-gray-900">
                                        {Number(business.rating || 0).toFixed(1)}
                                      </span>
                                    </div>
                                  </div>
                                  <div className="text-[10px] text-gray-500 truncate mt-0.5">
                                    {business.city}{business.state ? `, ${business.state}` : ''}
                                  </div>
                                  <div className="flex items-center text-gray-500 mt-1.5 pt-1.5 border-t border-gray-100">
                                    <Clock className="h-3 w-3 mr-1 text-gray-400" />
                                    <span className="text-[10px]">{business.services?.length || 0} services</span>
                                  </div>
                                </div>
                              </div>
                            </Link>
                          ))}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              ) : (
                /* Stack View */
                <div className="relative w-full flex items-start justify-center relative min-h-[500px] overflow-visible pt-2">
                  {businessesLoading ? (
                    <div className="w-full px-4">
                      <ListSkeleton count={3} />
                    </div>
                  ) : listData.length === 0 ? (
                    <div className="px-4">
                      <EmptyBusinesses searchQuery={searchInput} onSearch={() => {
                        setSearchInput('');
                        setSelectedCategory('');
                        setSelectedLocation('');
                        setUserLocation(null);
                        setAvailableNow(false);
                      }} />
                    </div>
                  ) : (
                    <>
                      <button
                        onClick={handlePrevBusinessCard}
                        className="absolute top-1/2 -translate-y-1/2 z-50 p-2 bg-white rounded-full shadow-lg hover:shadow-xl transition-all hover:scale-110 border border-gray-200 right-[calc(50%+380px)]"
                        aria-label="Previous card"
                      >
                        <ChevronLeft className="h-5 w-5 text-gray-700" />
                      </button>
                      <button
                        onClick={handleNextBusinessCard}
                        className="absolute top-1/2 -translate-y-1/2 z-50 p-2 bg-white rounded-full shadow-lg hover:shadow-xl transition-all hover:scale-110 border border-gray-200 left-[calc(50%+380px)]"
                        aria-label="Next card"
                      >
                        <ChevronRight className="h-5 w-5 text-gray-700" />
                      </button>
                      <div className="relative w-full h-[550px] flex items-center justify-center overflow-visible px-2">
                        {listData.map((business: any, index: number) => {
                          const offset = index - businessCardIndex;
                          const isVisible = Math.abs(offset) <= 4;
                          if (!isVisible) return null;

                          let transform = '';
                          let zIndex = 0;
                          let opacity = 1;
                          let scale = 1;

                          if (offset === 0) {
                            transform = 'translateX(0) translateY(0) rotateY(0deg)';
                            zIndex = 30;
                            opacity = 1;
                            scale = 1;
                          } else if (offset > 0) {
                            transform = `translateX(${offset * 100}px) translateY(${offset * 50}px) rotateY(-8deg)`;
                            zIndex = 30 - offset * 10;
                            opacity = 1 - offset * 0.08;
                            scale = 1 - offset * 0.06;
                          } else {
                            transform = `translateX(${offset * 100}px) translateY(${Math.abs(offset) * 50}px) rotateY(8deg)`;
                            zIndex = 30 + offset * 10;
                            opacity = 1 + offset * 0.08;
                            scale = 1 + offset * 0.06;
                          }

                          return (
                            <div
                              key={business.id}
                              className="absolute transition-all duration-500 ease-out"
                              style={{
                                transform: `${transform} scale(${scale})`,
                                zIndex,
                                opacity,
                                width: '350px',
                                height: '420px',
                              }}
                            >
                              <Link
                                to={`/businesses/${business.id}`}
                                className="block h-full bg-white rounded-3xl shadow-2xl overflow-hidden hover:shadow-3xl transition-shadow"
                                onClick={() => setSelectedBusiness(business)}
                              >
                                {business.images && business.images.length > 0 ? (
                                  <div className="relative h-[200px] bg-gray-200 overflow-hidden">
                                    <img
                                      src={(() => {
                                        const img = business.images[0];
                                        if (img.startsWith('http')) return img;
                                        const apiUrl = getImageApiUrl();
                                        const path = img.startsWith('/') ? img : `/${img}`;
                                        return `${apiUrl}${path}`;
                                      })()}
                                      alt={business.name}
                                      className="w-full h-full object-cover"
                                      onError={(e) => {
                                        (e.target as HTMLImageElement).style.display = 'none';
                                      }}
                                    />
                                    <div className="absolute top-3 right-3">
                                      <FavoriteButton businessId={business.id} size="md" />
                                    </div>
                                  </div>
                                ) : (
                                  <div className="h-[200px] bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center relative">
                                    <Motif variant="sprig" className="h-12 w-12 text-gray-400" />
                                    <div className="absolute top-3 right-3">
                                      <FavoriteButton businessId={business.id} size="md" />
                                    </div>
                                  </div>
                                )}
                                <div className="p-3">
                                  <div className="flex items-start justify-between mb-1.5">
                                    <div className="flex-1">
                                      <h3 className="text-base font-bold text-gray-900 mb-1">
                                        {business.name}
                                      </h3>
                                      <p className="text-[10px] text-gray-600 capitalize">
                                        {formatCategory(business.category)}
                                      </p>
                                    </div>
                                    <div className="flex items-center bg-yellow-100 px-1.5 py-0.5 rounded-full">
                                      <Star className="h-3.5 w-3.5 text-yellow-500 fill-current mr-0.5" />
                                      <span className="text-xs font-semibold text-gray-900">
                                        {Number(business.rating || 0).toFixed(1)}
                                      </span>
                                    </div>
                                  </div>
                                  {business.description && (
                                    <p className="text-xs text-gray-600 mb-2 line-clamp-2">
                                      {business.description}
                                    </p>
                                  )}
                                  <div className="flex items-center text-gray-500 mb-2">
                                    <span className="text-[10px]">{business.city}, {business.state}</span>
                                  </div>
                                  <div className="flex items-center pt-2 border-t border-gray-200">
                                    <Clock className="h-3.5 w-3.5 mr-1.5 text-gray-500" />
                                    <span className="text-[10px] text-gray-500">{business.services?.length || 0} services</span>
                                  </div>
                                </div>
                              </Link>
                            </div>
                          );
                        })}
                      </div>
                      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-white px-3 py-1.5 rounded-full shadow-lg z-50">
                        <span className="text-xs font-medium text-gray-700">
                          {businessCardIndex + 1} / {listData.length}
                        </span>
                      </div>
                    </>
                  )}
                </div>
              )}
        </div>
      </div>
      
      {/* Backdrop: block rest of screen when My Bookings is open - focus on bookings only */}
      {showBookings && (
        <div
          className="fixed inset-0 z-[99] bg-black/40 transition-opacity duration-300 md:bg-black/30"
          aria-hidden="true"
          onClick={() => setShowBookings(false)}
        />
      )}

      {/* Bookings Sidebar - Slides in from right on desktop, bottom on mobile */}
      <div
        className={`fixed backdrop-blur-md z-[100] transform transition-transform duration-300 ease-in-out
        ${showBookings 
          ? 'translate-y-0 md:translate-x-0' 
          : 'translate-y-full md:translate-y-0 md:translate-x-full'
        } 
        bottom-0 left-0 right-0 w-full h-[70vh] max-h-[70vh]
        md:top-16 md:right-0 md:left-auto md:w-2/3 md:max-w-2xl md:h-[calc(100vh-4rem)] md:max-h-[calc(100vh-4rem)] md:bottom-auto`}
        style={{
          background: 'linear-gradient(to left, rgba(255, 255, 255, 0.98), rgba(255, 255, 255, 0.95))',
          boxShadow: showBookings ? '0 -4px 20px rgba(0,0,0,0.15), -4px 0 20px rgba(0,0,0,0.1)' : 'none'
        }}
      >
        <div className="relative flex flex-col overflow-hidden h-full">
          {/* Bookings Header */}
          <div className="bg-white px-4 py-3 flex-shrink-0 flex items-center justify-between border-b border-gray-200 z-10">
            <h1 className="text-lg font-bold text-gray-900">{t('myBookings') || 'My Bookings'}</h1>
            <div className="flex items-center gap-2">
              {/* Laptop only: toggle list vs carousel view */}
              <div className="hidden md:flex bg-gray-100 rounded-lg p-0.5">
                <button
                  onClick={() => setBookingViewMode('list')}
                  className={`p-1.5 rounded-md transition-colors ${
                    bookingViewMode === 'list'
                      ? 'bg-[#E7001E] text-white shadow-sm'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                  title="List view"
                  aria-label="List view"
                >
                  <List className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setBookingViewMode('carousel')}
                  className={`p-1.5 rounded-md transition-colors ${
                    bookingViewMode === 'carousel'
                      ? 'bg-[#E7001E] text-white shadow-sm'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                  title="Carousel view"
                  aria-label="Carousel view"
                >
                  <Layers className="h-4 w-4" />
                </button>
              </div>
              <button
                onClick={() => {
                  const current = bookingViewMode === 'carousel' && filteredBookings?.length > 0
                    ? filteredBookings[bookingCardIndex]
                    : null;
                  if (current) {
                    navigate(`/my-bookings?bookingId=${current.id}&date=${format(new Date(current.appointmentDate), 'yyyy-MM-dd')}`);
                  } else {
                    navigate('/my-bookings');
                  }
                }}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs rounded-lg bg-accent-500 text-white hover:bg-accent-600 transition-colors font-medium"
                title={t('viewAllBookingsInCalendar') || 'View All Bookings in Calendar'}
              >
                <Calendar className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{t('calendar')}</span>
              </button>
              <button
                onClick={() => setBookingMenuOpen(!bookingMenuOpen)}
                className={`p-1.5 transition-colors rounded-md ${
                  bookingMenuOpen 
                    ? 'bg-accent-100 hover:bg-accent-200' 
                    : 'hover:bg-gray-100'
                }`}
                aria-label={t('filters')}
                title={bookingMenuOpen ? (t('closeFilters') || 'Close Filters') : (t('filters') || 'Filters')}
              >
                <Filter className="h-4 w-4 text-gray-700" />
              </button>
              <button
                onClick={() => setShowBookings(false)}
                className="p-1.5 transition-colors hover:bg-gray-100 rounded-md"
                aria-label="Close bookings"
              >
                <X className="h-4 w-4 text-gray-700" />
              </button>
            </div>
          </div>

          {/* Bookings Filters - Inline collapsible; on phone, above cards via z-index */}
          <div 
            className="bg-white border-b border-gray-200 overflow-hidden transition-all duration-300 ease-in-out relative z-20 md:z-auto"
            style={{
              maxHeight: bookingMenuOpen ? '200px' : '0px',
              opacity: bookingMenuOpen ? 1 : 0
            }}
          >
            <div className="px-4 py-3">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold text-gray-900">{t('filters')}</h2>
                <button
                  onClick={() => setBookingMenuOpen(false)}
                  className="p-1 hover:bg-gray-100 rounded-md transition-colors"
                  aria-label="Close filters"
                >
                  <X className="h-4 w-4 text-gray-700" />
                </button>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">{t('status')}</label>
                  <select
                    value={statusFilter}
                    onChange={(e) => {
                      setStatusFilter(e.target.value as any);
                      setBookingCardIndex(0);
                    }}
                    className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded-lg focus:outline-none focus:border-accent-500"
                  >
                    <option value="all">{t('all')}</option>
                    <option value="pending">{t('pending')}</option>
                    <option value="confirmed">{t('confirmed')}</option>
                    <option value="completed">{t('completed')}</option>
                    <option value="cancelled">{t('cancelled')}</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">{t('date')}</label>
                  <select
                    value={dateFilter}
                    onChange={(e) => {
                      setDateFilter(e.target.value as any);
                      setBookingCardIndex(0);
                    }}
                    className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded-lg focus:outline-none focus:border-accent-500"
                  >
                    <option value="all">{t('all')}</option>
                    <option value="today">{t('today')}</option>
                    <option value="upcoming">{t('upcoming')}</option>
                    <option value="past">{t('past')}</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Bookings Display - Inside sidebar; top animates down when filters open */}
          <div
            className="absolute inset-x-0 bottom-0 overflow-y-auto z-10 md:z-auto transition-[top] duration-300 ease-in-out"
            style={{
              top: bookingMenuOpen ? 'calc(3.5rem + 200px)' : '3.5rem',
              minHeight: 0,
            }}
          >
            {bookingsLoading ? (
              <div className="flex-1 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent-500"></div>
              </div>
            ) : !bookings || bookings.length === 0 ? (
              <div className="flex-1 flex items-center justify-center p-4">
                <EmptyBookings onCreateBooking={() => setShowBookings(false)} />
              </div>
            ) : filteredBookings.length === 0 ? (
              <div className="flex-1 flex items-center justify-center text-center p-4">
                <div>
                  <AlertCircle className="h-10 w-10 sm:h-12 sm:w-12 text-gray-400 mx-auto mb-2" />
                  <h2 className="text-base sm:text-lg font-bold text-gray-900 mb-1.5 px-4">
                    {(() => {
                      const translated = t('noBookingsMatchFilters');
                      return translated && translated !== 'noBookingsMatchFilters' ? translated : 'No bookings match your filters';
                    })()}
                  </h2>
                  <button
                    onClick={() => {
                      setStatusFilter('all');
                      setDateFilter('all');
                      setBookingCardIndex(0);
                    }}
                    className="px-3 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm bg-accent-500 text-white rounded-lg hover:bg-accent-600 transition-colors font-medium"
                  >
                    {(() => {
                      const translated = t('clearFilters');
                      return translated && translated !== 'clearFilters' ? translated : 'Clear Filters';
                    })()}
                  </button>
                </div>
              </div>
            ) : (
              <>
                {/* Phone: vertical scrollable list - compact cards */}
                <div className="md:hidden space-y-3 px-2 py-3 overflow-y-auto" style={{ WebkitOverflowScrolling: 'touch' }}>
                  {filteredBookings.map((booking: any) => (
                    <Link
                      key={booking.id}
                      to={`/my-bookings?bookingId=${booking.id}&date=${format(new Date(booking.appointmentDate), 'yyyy-MM-dd')}`}
                      className="block group"
                    >
                      <div className="bg-white rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 cursor-pointer border border-gray-100">
                        {booking.business?.images && booking.business.images.length > 0 ? (
                          <div className="relative h-44 bg-gray-200 overflow-hidden">
                            <img
                              src={(() => {
                                const img = booking.business.images[0];
                                if (img.startsWith('http')) return img;
                                const apiUrl = getImageApiUrl();
                                const path = img.startsWith('/') ? img : `/${img}`;
                                return `${apiUrl}${path}`;
                              })()}
                              alt={booking.business?.name}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display = 'none';
                              }}
                            />
                            <div className="absolute top-2 right-2 z-10">
                              <div className={`px-1.5 py-0.5 rounded-full text-[9px] font-semibold shadow ${getStatusColor(booking.status)}`}>
                                {booking.status}
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="h-44 bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center relative">
                            <Calendar className="h-10 w-10 text-gray-400" />
                            <div className="absolute top-2 right-2 z-10">
                              <div className={`px-1.5 py-0.5 rounded-full text-[9px] font-semibold shadow ${getStatusColor(booking.status)}`}>
                                {booking.status}
                              </div>
                            </div>
                          </div>
                        )}
                        <div className="p-3">
                          <div className="flex items-start justify-between mb-1.5">
                            <div className="flex-1 min-w-0">
                              <h3 className="text-sm font-semibold text-gray-900 truncate mb-0.5">
                                {booking.service?.name || 'Service'}
                              </h3>
                              <p className="text-[11px] text-gray-600 truncate">
                                {booking.business?.name || 'Business'}
                              </p>
                            </div>
                            <div className="flex items-center ml-1.5 flex-shrink-0">
                              <Star className="h-3 w-3 text-yellow-500 fill-current mr-0.5" />
                              <span className="text-[11px] font-semibold text-gray-900">
                                {Number(booking.business?.rating ?? 0).toFixed(1)}
                              </span>
                            </div>
                          </div>
                          <div className="flex flex-col gap-0.5 text-gray-600 text-[11px]">
                            <div className="flex items-center">
                              <Calendar className="h-3 w-3 mr-1 flex-shrink-0" />
                              <span>{formatDate(booking.appointmentDate)}</span>
                            </div>
                            <div className="flex items-center">
                              <Clock className="h-3 w-3 mr-1" />
                              <span>{booking.service?.duration ?? 0} min</span>
                              {booking.totalAmount != null && (
                                <>
                                  <span className="mx-1 text-gray-300">·</span>
                                  <span className="font-semibold text-accent-500">{formatPrice(Number(booking.totalAmount ?? 0))}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>

                {/* Laptop/PC: list view - compact cards, only when bookingViewMode === 'list' */}
                {bookingViewMode === 'list' && (
                  <div className="hidden md:block space-y-3 px-2 py-3 overflow-y-auto h-full" style={{ WebkitOverflowScrolling: 'touch' }}>
                    {filteredBookings.map((booking: any) => (
                      <Link
                        key={booking.id}
                        to={`/my-bookings?bookingId=${booking.id}&date=${format(new Date(booking.appointmentDate), 'yyyy-MM-dd')}`}
                        className="block group"
                      >
                        <div className="bg-white rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 cursor-pointer border border-gray-100">
                          {booking.business?.images && booking.business.images.length > 0 ? (
                            <div className="relative h-44 md:h-80 bg-gray-200 overflow-hidden">
                              <img
                                src={(() => {
                                  const img = booking.business.images[0];
                                  if (img.startsWith('http')) return img;
                                  const apiUrl = getImageApiUrl();
                                  const path = img.startsWith('/') ? img : `/${img}`;
                                  return `${apiUrl}${path}`;
                                })()}
                                alt={booking.business?.name}
                                className="w-full h-full object-contain md:object-cover group-hover:scale-105 transition-transform duration-300 bg-gray-200"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).style.display = 'none';
                                }}
                              />
                              <div className="absolute top-2 right-2 z-10">
                                <div className={`px-1.5 py-0.5 rounded-full text-[9px] font-semibold shadow ${getStatusColor(booking.status)}`}>
                                  {booking.status}
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div className="h-44 md:h-80 bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center relative">
                              <Calendar className="h-10 w-10 text-gray-400" />
                              <div className="absolute top-2 right-2 z-10">
                                <div className={`px-1.5 py-0.5 rounded-full text-[9px] font-semibold shadow ${getStatusColor(booking.status)}`}>
                                  {booking.status}
                                </div>
                              </div>
                            </div>
                          )}
                          <div className="p-3">
                            <div className="flex items-start justify-between mb-1.5">
                              <div className="flex-1 min-w-0">
                                <h3 className="text-sm font-semibold text-gray-900 truncate mb-0.5">
                                  {booking.service?.name || 'Service'}
                                </h3>
                                <p className="text-[11px] text-gray-600 truncate">
                                  {booking.business?.name || 'Business'}
                                </p>
                              </div>
                              <div className="flex items-center ml-1.5 flex-shrink-0">
                                <Star className="h-3 w-3 text-yellow-500 fill-current mr-0.5" />
                                <span className="text-[11px] font-semibold text-gray-900">
                                  {Number(booking.business?.rating ?? 0).toFixed(1)}
                                </span>
                              </div>
                            </div>
                            <div className="flex flex-col gap-0.5 text-gray-600 text-[11px]">
                              <div className="flex items-center">
                                <Calendar className="h-3 w-3 mr-1 flex-shrink-0" />
                                <span>{formatDate(booking.appointmentDate)}</span>
                              </div>
                              <div className="flex items-center">
                                <Clock className="h-3 w-3 mr-1" />
                                <span>{booking.service?.duration ?? 0} min</span>
                                {booking.totalAmount != null && (
                                  <>
                                    <span className="mx-1 text-gray-300">·</span>
                                    <span className="font-semibold text-accent-500">{formatPrice(Number(booking.totalAmount ?? 0))}</span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}

                {/* Laptop/PC: carousel (hamburger style) - one card at a time with prev/next - only when bookingViewMode === 'carousel' */}
                {bookingViewMode === 'carousel' && (
                <div className="hidden md:flex relative w-full h-full min-h-0 flex-col items-center justify-center px-2 py-4">
                  <div className="relative w-full flex-1 flex items-center justify-center min-h-[480px]">
                    <button
                      onClick={handlePrevBookingCard}
                      className="absolute left-2 z-40 p-2 bg-white rounded-full shadow-lg hover:shadow-xl transition-all hover:scale-110 border border-gray-200"
                      aria-label="Previous booking"
                    >
                      <ChevronLeft className="h-5 w-5 text-gray-700" />
                    </button>
                    <button
                      onClick={handleNextBookingCard}
                      className="absolute right-2 z-40 p-2 bg-white rounded-full shadow-lg hover:shadow-xl transition-all hover:scale-110 border border-gray-200"
                      aria-label="Next booking"
                    >
                      <ChevronRight className="h-5 w-5 text-gray-700" />
                    </button>
                    {filteredBookings.map((booking: any, index: number) => {
                      const offset = index - bookingCardIndex;
                      const isVisible = Math.abs(offset) <= 2;
                      if (!isVisible) return null;
                      let transform = '';
                      let zIndex = 10;
                      let opacity = 1;
                      let scale = 1;
                      if (offset === 0) {
                        transform = 'translateX(0) translateY(0)';
                        zIndex = 30;
                      } else if (offset > 0) {
                        transform = `translateX(${Math.min(offset * 70, 100)}px) translateY(${offset * 35}px)`;
                        zIndex = 30 - offset * 5;
                        opacity = 1 - offset * 0.08;
                        scale = 1 - offset * 0.05;
                      } else {
                        transform = `translateX(${Math.max(offset * 70, -100)}px) translateY(${Math.abs(offset) * 40}px)`;
                        zIndex = 30 + offset * 5;
                        opacity = 1 + offset * 0.08;
                        scale = 1 + offset * 0.04;
                      }
                      return (
                        <Link
                          key={booking.id}
                          to={`/my-bookings?bookingId=${booking.id}&date=${format(new Date(booking.appointmentDate), 'yyyy-MM-dd')}`}
                          className="absolute transition-all duration-300 ease-out w-[420px]"
                          style={{
                            transform: `${transform} scale(${scale})`,
                            zIndex,
                            opacity: Math.max(0.75, Math.min(1, opacity)),
                          }}
                        >
                          <div className="bg-white rounded-2xl overflow-hidden shadow-xl hover:shadow-2xl transition-all border border-gray-100 cursor-pointer">
                            {/* Top: light grey with image or motif + status */}
                            {booking.business?.images && booking.business.images.length > 0 ? (
                              <div className="relative h-[220px] bg-gray-100 overflow-hidden">
                                <img
                                  src={(() => {
                                    const img = booking.business.images[0];
                                    if (img.startsWith('http')) return img;
                                    const apiUrl = getImageApiUrl();
                                    const path = img.startsWith('/') ? img : `/${img}`;
                                    return `${apiUrl}${path}`;
                                  })()}
                                  alt={booking.business?.name}
                                  className="w-full h-full object-cover"
                                  onError={(e) => {
                                    (e.target as HTMLImageElement).style.display = 'none';
                                  }}
                                />
                                <div className="absolute top-3 right-3">
                                  <div className={`px-2.5 py-1.5 rounded-full text-xs font-semibold shadow ${getStatusColor(booking.status)}`}>
                                    {booking.status}
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <div className="h-[220px] bg-gray-100 flex items-center justify-center relative rounded-t-2xl">
                                <Calendar className="h-14 w-14 text-gray-400" />
                                <div className="absolute top-3 right-3">
                                  <div className={`px-2.5 py-1.5 rounded-full text-xs font-semibold shadow ${getStatusColor(booking.status)}`}>
                                    {booking.status}
                                  </div>
                                </div>
                              </div>
                            )}
                            {/* Bottom: white - service name, business, rating, duration, price */}
                            <div className="p-5 bg-white">
                              <div className="flex items-start justify-between gap-3 mb-2">
                                <div className="flex-1 min-w-0">
                                  <h3 className="text-lg font-bold text-gray-900 truncate">
                                    {booking.service?.name || 'Service'}
                                  </h3>
                                  <p className="text-sm text-gray-500 mt-0.5 truncate">
                                    {booking.business?.name || 'Business'}
                                  </p>
                                </div>
                                <div className="flex items-center flex-shrink-0">
                                  <Star className="h-5 w-5 text-yellow-500 fill-current mr-0.5" />
                                  <span className="text-base font-semibold text-gray-900">
                                    {Number(booking.business?.rating ?? 0).toFixed(1)}
                                  </span>
                                </div>
                              </div>
                              <div className="flex items-center text-gray-500 mt-2 pt-2 border-t border-gray-100">
                                <Calendar className="h-4 w-4 mr-2 text-gray-400 flex-shrink-0" />
                                <span className="text-sm">{formatDate(booking.appointmentDate)}</span>
                              </div>
                              <div className="flex items-center text-gray-500 mt-1">
                                <Clock className="h-4 w-4 mr-2 text-gray-400" />
                                <span className="text-sm">{booking.service?.duration ?? 0} min</span>
                                {booking.totalAmount != null && (
                                  <>
                                    <span className="mx-2 text-gray-300">·</span>
                                    <span className="text-base font-semibold text-accent-500">{formatPrice(Number(booking.totalAmount ?? 0))}</span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                  <div className="flex-shrink-0 mt-2 px-3 py-1.5 bg-white rounded-full shadow border border-gray-200 text-xs font-medium text-gray-700">
                    {bookingCardIndex + 1} / {filteredBookings.length}
                  </div>
                </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </React.Fragment>
  );
};

export default Home;
