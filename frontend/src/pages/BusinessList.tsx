import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useQuery } from 'react-query';
import { businessService } from '../services/api';
import { Search, Star, Clock, Menu, ChevronLeft, ChevronRight, MapPin, Grid3x3, Layers, Map, Filter, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { ListSkeleton } from '../components/LoadingSkeleton';
import { FavoriteButton } from '../components/FavoriteButton';
import { EmptyBusinesses } from '../components/EmptyState';
import { Motif } from '../components/Motif';
import { MapView } from '../components/MapView';

export const BusinessList: React.FC = () => {
  const [searchParams] = useSearchParams();
  const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000';
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedLocation, setSelectedLocation] = useState('');
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [radius, setRadius] = useState<number>(5);
  const [availableNow, setAvailableNow] = useState<boolean>(false);
  const [selectedBusiness, setSelectedBusiness] = useState<any>(null);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'stack' | 'map'>('grid'); // Default to grid view

  // Read category from URL query parameter on mount
  useEffect(() => {
    const categoryFromUrl = searchParams.get('category');
    if (categoryFromUrl) {
      console.log('[BusinessList] Setting category from URL:', categoryFromUrl);
      setSelectedCategory(categoryFromUrl);
    }
  }, [searchParams]);

  // Don't auto-detect user location - let user manually enable it
  // This ensures all businesses load by default
  useEffect(() => {
    // Disabled auto-location to show all businesses by default
    // User can manually enable location filter using the sidebar button
  }, []);

  const { data: businesses, isLoading, error, refetch } = useQuery(
    ['businesses', searchQuery, selectedCategory, selectedLocation, userLocation, radius, availableNow],
    () => {
      if (userLocation) {
        console.log('[BusinessList] Fetching nearby businesses:', { lat: userLocation.lat, lng: userLocation.lng, radius });
        return businessService.getNearby(userLocation.lat, userLocation.lng, radius, availableNow);
      }
      if (searchQuery || selectedCategory || selectedLocation) {
        console.log('[BusinessList] Searching businesses:', { searchQuery, selectedCategory, selectedLocation });
        return businessService.search(searchQuery, selectedCategory, selectedLocation);
      }
      console.log('[BusinessList] Fetching all businesses');
      return businessService.getAll();
    },
    {
      select: (response) => {
        console.log('[BusinessList] Raw API response:', response);
        let businesses: any[] = [];
        if (Array.isArray(response.data)) {
          businesses = response.data;
        } else if (response.data?.data && Array.isArray(response.data.data)) {
          businesses = response.data.data;
        } else if (Array.isArray(response)) {
          businesses = response;
        }

        console.log('[BusinessList] Extracted businesses:', businesses.length);
        console.log('[BusinessList] Business statuses:', businesses.map(b => ({ name: b.name, status: b.status, isActive: b.isActive })));

        const approvedBusinesses = businesses.filter((business: any) =>
          business && business.status === 'approved' && business.isActive !== false
        );
        console.log('[BusinessList] Approved businesses:', approvedBusinesses.length);
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
      onError: (error: any) => {
        console.error('[BusinessList] Error fetching businesses:', {
          message: error.message,
          response: error.response?.data,
          status: error.response?.status,
          url: error.config?.url,
          baseURL: error.config?.baseURL,
        });
      },
    }
  );

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


  useEffect(() => {
    if (!error) return;
    const anyErr: any = error as any;
    const serverMessage = anyErr?.response?.data?.message;
    const status = anyErr?.response?.status;
    const errorMessage = anyErr?.message;

    console.error('[BusinessList] Error loading businesses:', {
      message: errorMessage,
      status: status,
      serverMessage: serverMessage,
      response: anyErr?.response?.data,
      url: anyErr?.config?.url,
      baseURL: anyErr?.config?.baseURL,
      code: anyErr?.code,
      isNetworkError: !anyErr?.response,
    });

    const detail = Array.isArray(serverMessage) ? serverMessage.join(', ') : (serverMessage || errorMessage || 'Unknown error');
    const prefix = status ? `Error ${status}: ` : '';

    if (!anyErr?.response) {
      toast.error(`Failed to load businesses. Network error - please check your connection.`);
    } else {
      toast.error(`${prefix}Failed to load businesses. ${detail}`);
    }
  }, [error]);

  const listData: any[] = (businesses || []) as any[];

  // Card navigation - loops infinitely
  const handleNextCard = () => {
    setCurrentCardIndex((prev) => (prev + 1) % listData.length);
  };

  const handlePrevCard = () => {
    setCurrentCardIndex((prev) => (prev - 1 + listData.length) % listData.length);
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] sm:min-h-[calc(100vh-5rem)] bg-white flex flex-col">
      {/* Search Bar with Blue Border and View Toggle - centered */}
      <div className="bg-white py-2 sm:py-3 px-3 shadow-sm">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search"
                className="w-full px-4 py-2.5 text-base border-2 border-[#E7001E] rounded-lg focus:outline-none focus:border-[#E7001E] transition-colors pr-10"
              />
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            </div>
            {/* Filters Button */}
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

            {/* View Mode Toggle */}
            <div className="flex bg-gray-100 rounded-lg p-0.5">
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
          </div>
        </div>
      </div>

      {/* Retractable Sidebar with Filters */}
      <>
        {/* Sidebar Panel - slides in from right */}
        <div
          className={`fixed top-16 right-0 bottom-0 w-72 backdrop-blur-md z-[110] transform transition-transform duration-300 ease-in-out ${
            menuOpen ? 'translate-x-0' : 'translate-x-full'
          }`}
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
              </div>
            </div>
          </div>
        </div>
      </>

      {/* Main Content: Grid or Stacked Cards */}
      {viewMode === 'map' ? (
        /* Map View - Full width, no padding */
        <div className="flex-1 w-full relative z-0">
          {isLoading ? (
            <div className="w-full px-4">
              <ListSkeleton count={3} />
            </div>
          ) : listData.length === 0 ? (
            <div className="w-full px-4">
              <EmptyBusinesses onSearch={() => {
                setSearchQuery('');
                setSelectedCategory('');
                setSelectedLocation('');
                setUserLocation(null);
                setAvailableNow(false);
              }} />
            </div>
          ) : (
            <div className="w-full h-[calc(100vh-100px)] relative z-0">
              <MapView
                markers={listData.map((business: any) => ({
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
      ) : (
      <div className="flex-1 w-full pt-2 overflow-visible">
        <div className="w-full flex items-start justify-center relative min-h-[500px] overflow-visible">
          {isLoading ? (
            <div className="w-full px-4">
              <ListSkeleton count={3} />
            </div>
          ) : listData.length === 0 ? (
            <div className="px-4">
              <EmptyBusinesses onSearch={() => {
                setSearchQuery('');
                setSelectedCategory('');
                setSelectedLocation('');
                setUserLocation(null);
                setAvailableNow(false);
              }} />
            </div>
          ) : viewMode === 'grid' ? (
            /* Grid View - Airbnb Style */
            <div className="w-full grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3 py-3 px-2">
              {listData.map((business: any) => (
                <Link
                  key={business.id}
                  to={`/businesses/${business.id}`}
                  className="group"
                >
                  <div className="bg-white rounded-xl overflow-hidden hover:shadow-xl transition-shadow duration-300">
                    {/* Business Image */}
                    {business.images && business.images.length > 0 ? (
                      <div className="relative h-48 bg-gray-200 overflow-hidden">
                        <img
                          src={`${business.images[0].startsWith('http') ? '' : API_BASE_URL}${business.images[0]}`}
                          alt={business.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          onError={(e) => {
                            console.error(`Failed to load business image: ${API_BASE_URL}${business.images[0]}`);
                            e.currentTarget.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="300"%3E%3Crect fill="%23f3f4f6" width="400" height="300"/%3E%3C/svg%3E';
                          }}
                        />
                        <div className="absolute top-2 right-2 z-10">
                          <FavoriteButton businessId={business.id} size="sm" />
                        </div>
                      </div>
                    ) : (
                      <div className="h-48 bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center relative">
                        <Motif variant="sprig" className="h-12 w-12 text-gray-400" />
                        <div className="absolute top-2 right-2 z-10">
                          <FavoriteButton businessId={business.id} size="sm" />
                        </div>
                      </div>
                    )}

                    {/* Business Info */}
                    <div className="p-3">
                      <div className="flex items-start justify-between mb-1.5">
                        <div className="flex-1 min-w-0">
                          <h3 className="text-base font-semibold text-gray-900 truncate">
                            {business.name}
                          </h3>
                          <p className="text-xs text-gray-600 capitalize">
                            {formatCategory(business.category)}
                          </p>
                        </div>
                        <div className="flex items-center ml-2">
                          <Star className="h-3.5 w-3.5 text-yellow-500 fill-current mr-1" />
                          <span className="text-xs font-semibold text-gray-900">
                            {Number(business.rating || 0).toFixed(1)}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center text-gray-500 text-xs mb-1.5">
                        <MapPin className="h-3.5 w-3.5 mr-1" />
                        <span className="truncate">{business.city}, {business.state}</span>
                      </div>

                      <div className="flex items-center text-gray-500 text-xs">
                        <Clock className="h-3.5 w-3.5 mr-1" />
                        <span>{business.services?.length || 0} services</span>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            /* Stack View - Original Design */
            <div className="relative w-full max-w-6xl mx-auto h-[550px] flex items-center justify-center overflow-visible px-2">
              {/* Navigation Buttons - always visible since list loops */}
              <button
                onClick={handlePrevCard}
                className="absolute left-0 z-50 p-2 bg-white rounded-full shadow-lg hover:shadow-xl transition-all hover:scale-110"
                aria-label="Previous card"
              >
                <ChevronLeft className="h-5 w-5 text-gray-700" />
              </button>

              <button
                onClick={handleNextCard}
                className="absolute right-0 z-50 p-2 bg-white rounded-full shadow-lg hover:shadow-xl transition-all hover:scale-110"
                aria-label="Next card"
              >
                <ChevronRight className="h-5 w-5 text-gray-700" />
              </button>

              {/* Stacked Cards */}
              <div className="relative w-full h-full flex items-center justify-center">
                {listData.map((business: any, index: number) => {
                  const offset = index - currentCardIndex;
                  const isVisible = Math.abs(offset) <= 4;

                  if (!isVisible) return null;

                  // Calculate transform and z-index based on position
                  let transform = '';
                  let zIndex = 0;
                  let opacity = 1;
                  let scale = 1;

                  if (offset === 0) {
                    // Front card
                    transform = 'translateX(0) translateY(0) rotateY(0deg)';
                    zIndex = 30;
                    opacity = 1;
                    scale = 1;
                  } else if (offset > 0) {
                    // Cards to the right (behind) - much more spread out horizontally
                    transform = `translateX(${offset * 100}px) translateY(${offset * 50}px) rotateY(-8deg)`;
                    zIndex = 30 - offset * 10;
                    opacity = 1 - offset * 0.15;
                    scale = 1 - offset * 0.06;
                  } else {
                    // Cards to the left (behind) - much more spread out horizontally
                    transform = `translateX(${offset * 100}px) translateY(${Math.abs(offset) * 50}px) rotateY(8deg)`;
                    zIndex = 30 + offset * 10;
                    opacity = 1 + offset * 0.15;
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
                        {/* Business Image */}
                        {business.images && business.images.length > 0 ? (
                          <div className="relative h-[200px] bg-gray-200">
                            <img
                              src={`${business.images[0].startsWith('http') ? '' : API_BASE_URL}${business.images[0]}`}
                              alt={business.name}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                console.error(`Failed to load business image: ${API_BASE_URL}${business.images[0]}`);
                                e.currentTarget.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="300"%3E%3Crect fill="%23f3f4f6" width="400" height="300"/%3E%3C/svg%3E';
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

                        {/* Business Info */}
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

              {/* Card Counter */}
              <div className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-white px-3 py-1.5 rounded-full shadow-lg z-50">
                <span className="text-xs font-medium text-gray-700">
                  {currentCardIndex + 1} / {listData.length}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
      )}

      {/* Error banner */}
      {error && (
        <div className="w-full px-2 pb-3">
          <div className="p-3 rounded-lg border-2 border-red-300 bg-red-50 text-red-700 flex items-center justify-between shadow-lg">
            <div className="mr-3">
              <div className="text-sm font-semibold">We couldn't load businesses.</div>
              <div className="text-xs opacity-90">Please check your connection or try again.</div>
            </div>
            <button className="px-3 py-1.5 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium" onClick={() => refetch()}>
              Retry
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default BusinessList;
