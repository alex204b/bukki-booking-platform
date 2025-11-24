import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from 'react-query';
import { businessService } from '../services/api';
import { Search, MapPin, Star, Clock } from 'lucide-react';
import MapView from '../components/MapView';
import { geocodeAddress } from '../utils/geocode';
import { GeometricSymbol } from '../components/GeometricSymbols';
import toast from 'react-hot-toast';
import { useI18n } from '../contexts/I18nContext';
import { SearchAutocomplete } from '../components/SearchAutocomplete';
import { ListSkeleton } from '../components/LoadingSkeleton';
import { FavoriteButton } from '../components/FavoriteButton';
import { EmptyBusinesses } from '../components/EmptyState';

export const BusinessList: React.FC = () => {
  const { t } = useI18n();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedLocation, setSelectedLocation] = useState(''); // Location filter
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [radius, setRadius] = useState<number>(5);
  const [availableNow, setAvailableNow] = useState<boolean>(false);
  const [selectedBusiness, setSelectedBusiness] = useState<any>(null);

  const { data: businesses, isLoading, error, refetch } = useQuery(
    ['businesses', searchQuery, selectedCategory, selectedLocation, userLocation, radius, availableNow],
    () => {
      if (userLocation) {
        return businessService.getNearby(userLocation.lat, userLocation.lng, radius, availableNow);
      }
      if (searchQuery || selectedCategory || selectedLocation) {
        return businessService.search(searchQuery, selectedCategory, selectedLocation);
      }
      return businessService.getAll(); // This should return all businesses regardless of status
    },
    {
      select: (response) => {
        // Handle different response structures
        const businesses = Array.isArray(response.data) ? response.data : (Array.isArray(response) ? response : []);
        
        // Filter out pending businesses - only show approved businesses to customers
        const approvedBusinesses = businesses.filter((business: any) => 
          business && business.status === 'approved' && business.isActive !== false
        );
        return approvedBusinesses;
      },
      retry: (failureCount, error: any) => {
        // Don't retry on 401 (authentication errors)
        if (error?.response?.status === 401) {
          return false;
        }
        // Don't retry on network errors (backend not running)
        if (!error?.response && error?.code === 'ERR_NETWORK') {
          return false;
        }
        // Retry other errors up to 1 time
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

  const handleViewOnMap = (business: any) => {
    if (business.latitude && business.longitude) {
      setSelectedBusiness(business);
      // Scroll to map section
      const mapElement = document.getElementById('business-map');
      if (mapElement) {
        mapElement.scrollIntoView({ behavior: 'smooth' });
      }
    } else {
      toast.error('This business does not have location data');
    }
  };

  useEffect(() => {
    if (!error) return;
    const anyErr: any = error as any;
    const serverMessage = anyErr?.response?.data?.message;
    const status = anyErr?.response?.status;
    const errorMessage = anyErr?.message;
    
    // Log detailed error for debugging
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
    
    const detail = Array.isArray(serverMessage) ? serverMessage.join(', ') : (serverMessage || errorMessage || t('unknownError'));
    const prefix = status ? `Error ${status}: ` : '';
    
    // Show more helpful error message
    if (!anyErr?.response) {
      // Network error - no response from server
      toast.error(`${t('failedToLoadBusinesses') || 'Failed to load businesses'}. Network error - please check your connection.`);
    } else {
      toast.error(`${prefix}${t('failedToLoadBusinesses') || 'Failed to load businesses'}. ${detail}`);
    }
  }, [error, t]);

  // Fallback mock businesses (address-only) to help verify the UI even if API is empty
  const mockBusinesses = [
    {
      id: 'mock-1',
      name: 'Empire State Barbers',
      category: 'beauty_salon',
      description: 'Classic cuts in Midtown.',
      address: '350 5th Ave',
      city: 'New York',
      state: 'NY',
      zipCode: '10118',
      rating: 4.7,
      services: [],
    },
    {
      id: 'mock-2',
      name: 'Times Square Tailor',
      category: 'tailor',
      description: 'Alterations while you wait.',
      address: '1560 Broadway',
      city: 'New York',
      state: 'NY',
      zipCode: '10036',
      rating: 4.6,
      services: [],
    },
    {
      id: 'mock-3',
      name: 'Brooklyn Auto Clinic',
      category: 'mechanic',
      description: 'Reliable neighborhood shop.',
      address: '200 Cadman Plaza W',
      city: 'Brooklyn',
      state: 'NY',
      zipCode: '11201',
      rating: 4.5,
      services: [],
    },
  ];

  const listData: any[] = (businesses?.length ? businesses : mockBusinesses) as any[];

  return (
    <div className="space-y-6 relative">
      <div className="pointer-events-none absolute -z-10 right-4 top-4 opacity-10">
        <GeometricSymbol variant="totem" size={120} strokeWidth={6} color="#f97316" />
      </div>
      <div className="pointer-events-none absolute -z-10 left-4 bottom-4 opacity-8">
        <GeometricSymbol variant="wave" size={80} strokeWidth={5} color="#eab308" />
      </div>
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Browse Businesses</h1>
        <p className="text-gray-600 mt-2">Discover and book services from local businesses</p>
      </div>

      {/* Search and Filters */}
      <div className="card p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
          <div className="md:col-span-2">
            <SearchAutocomplete
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder="Search businesses..."
            />
          </div>
          
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="input"
          >
            <option value="">All Categories</option>
            {categories.map((category) => (
              <option key={category} value={category}>
                {formatCategory(category)}
              </option>
            ))}
          </select>
          
          <div className="flex gap-2">
            <button
              type="button"
              className="btn btn-outline"
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
            <select className="input w-28" value={radius} onChange={(e) => setRadius(parseInt(e.target.value))}>
              {[1,3,5,10,20].map(r => <option key={r} value={r}>{r} km</option>)}
            </select>
          </div>

          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input type="checkbox" checked={availableNow} onChange={(e) => setAvailableNow(e.target.checked)} />
            Available now
          </label>
        </div>
      </div>

      {/* Map */}
      {listData.length ? (
        <div id="business-map" className="card p-4">
          <GeoResolvedMap 
            businesses={listData} 
            center={userLocation || undefined} 
            selectedBusiness={selectedBusiness}
          />
        </div>
      ) : null}

      {/* Error banner */}
      {error ? (
        <div className="p-4 rounded-md border border-red-200 bg-red-50 text-red-700 flex items-center justify-between">
          <div className="mr-4">
            <div className="font-medium">We couldn't load businesses.</div>
            <div className="text-sm opacity-80">Please check your connection or try again.</div>
          </div>
          <button className="btn btn-sm btn-outline" onClick={() => refetch()}>Retry</button>
        </div>
      ) : null}

      {/* Results */}
      {isLoading ? (
        <ListSkeleton count={6} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {listData.map((business: any) => (
            <Link
              key={business.id}
              to={`/businesses/${business.id}`}
              className="card p-6 hover:shadow-lg transition-shadow"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-lg font-semibold text-gray-900">
                      {business.name}
                    </h3>
                    <FavoriteButton businessId={business.id} size="sm" />
                  </div>
                  <p className="text-sm text-gray-600 mb-2">
                    {formatCategory(business.category)}
                  </p>
                </div>
                <div className="flex items-center">
                  <Star className="h-4 w-4 text-yellow-400 fill-current" />
                  <span className="text-sm text-gray-600 ml-1">
                    {business.rating.toFixed(1)}
                  </span>
                </div>
              </div>
              
              {business.description && (
                <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                  {business.description}
                </p>
              )}
              
              <div className="flex items-center text-sm text-gray-500 mb-4">
                <MapPin className="h-4 w-4 mr-1" />
                <span>{business.city}, {business.state}</span>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center text-sm text-gray-500">
                  <Clock className="h-4 w-4 mr-1" />
                  <span>{business.services?.length || 0} services</span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleViewOnMap(business);
                    }}
                    className="text-xs bg-blue-100 text-blue-600 px-2 py-1 rounded hover:bg-blue-200 transition-colors"
                  >
                    View on Map
                  </button>
                  <span className="text-sm font-medium text-primary-600">
                    View Details →
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {listData.length === 0 && !isLoading && (
        <EmptyBusinesses onSearch={() => {
          setSearchQuery('');
          setSelectedCategory('');
          setSelectedLocation('');
          setUserLocation(null);
          setAvailableNow(false);
        }} />
      )}
    </div>
  );
};

// Use stored coordinates or fallback to geocoding
const GeoResolvedMap: React.FC<{ businesses: any[]; center?: { lat: number; lng: number }; selectedBusiness?: any }> = ({ businesses, center, selectedBusiness }) => {
  const [markers, setMarkers] = React.useState<any[]>([]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const items: any[] = [];
      for (const b of businesses) {
        // Use stored coordinates if available
        if (b.latitude && b.longitude) {
          items.push({
            id: b.id,
            name: b.name,
            category: b.category,
            address: b.address,
            city: b.city,
            state: b.state,
            latitude: parseFloat(b.latitude), // Ensure it's a decimal number
            longitude: parseFloat(b.longitude), // Ensure it's a decimal number
          });
        } else {
          // Fallback to geocoding for businesses without coordinates
          const address = `${b.address || ''}, ${b.city || ''}, ${b.state || ''} ${b.zipCode || ''}`.trim();
          if (!address || address === ', ,') continue;
          const point = await geocodeAddress(address);
          if (point) {
            items.push({
              id: b.id,
              name: b.name,
              category: b.category,
              address: b.address,
              city: b.city,
              state: b.state,
              latitude: point.lat,
              longitude: point.lon,
            });
          }
        }
      }
      if (mounted) setMarkers(items);
    })();
    return () => {
      mounted = false;
    };
  }, [businesses]);

  if (markers.length === 0) {
    return <div className="text-sm text-gray-500 px-2 py-1">Loading map locations…</div>;
  }

  // If a business is selected, center the map on that business
  const mapCenter = selectedBusiness && selectedBusiness.latitude && selectedBusiness.longitude 
    ? { lat: selectedBusiness.latitude, lng: selectedBusiness.longitude }
    : center ? { lat: center.lat, lng: center.lng } : undefined;

  return <MapView markers={markers} center={mapCenter} selectedBusiness={selectedBusiness} />;
};
