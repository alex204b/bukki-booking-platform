import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from 'react-query';
import { businessService } from '../services/api';
import { Search, MapPin, Star, Clock } from 'lucide-react';
import MapView from '../components/MapView';
import { geocodeAddress } from '../utils/geocode';
import { GeometricSymbol } from '../components/GeometricSymbols';
import toast from 'react-hot-toast';

export const BusinessList: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedLocation, setSelectedLocation] = useState('');
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [radius, setRadius] = useState<number>(5);
  const [availableNow, setAvailableNow] = useState<boolean>(false);

  const { data: businesses, isLoading, error } = useQuery(
    ['businesses', searchQuery, selectedCategory, selectedLocation, userLocation, radius, availableNow],
    () => {
      if (userLocation) {
        return businessService.getNearby(userLocation.lat, userLocation.lng, radius, availableNow);
      }
      if (searchQuery || selectedCategory || selectedLocation) {
        return businessService.search(searchQuery, selectedCategory, selectedLocation);
      }
      return businessService.getAll();
    },
    {
      select: (response) => response.data,
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

  if (error) {
    toast.error('Failed to load businesses');
  }

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
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Search businesses..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input pl-10"
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
        <div className="card p-4">
          <GeoResolvedMap businesses={listData} center={userLocation || undefined} />
        </div>
      ) : null}

      {/* Results */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
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
                  <h3 className="text-lg font-semibold text-gray-900 mb-1">
                    {business.name}
                  </h3>
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
                <span className="text-sm font-medium text-primary-600">
                  View Details →
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}

      {businesses?.length === 0 && !isLoading && (
        <div className="text-center py-12">
          <div className="text-gray-400 mb-4">
            <Search className="h-12 w-12 mx-auto" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No businesses found</h3>
          <p className="text-gray-600">Try adjusting your search criteria</p>
        </div>
      )}
    </div>
  );
};

// Resolve addresses to coordinates on the fly via OSM Nominatim (no API key)
const GeoResolvedMap: React.FC<{ businesses: any[]; center?: { lat: number; lng: number } }> = ({ businesses, center }) => {
  const [markers, setMarkers] = React.useState<any[]>([]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const items: any[] = [];
      for (const b of businesses) {
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
      if (mounted) setMarkers(items);
    })();
    return () => {
      mounted = false;
    };
  }, [businesses]);

  if (markers.length === 0) {
    return <div className="text-sm text-gray-500 px-2 py-1">Resolving map locations…</div>;
  }

  return <MapView markers={markers} />;
};
