import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import { useI18n } from '../contexts/I18nContext';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default markers in react-leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
  iconUrl: require('leaflet/dist/images/marker-icon.png'),
  shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
});

interface AddressDetails {
  postalCode?: string;
  city?: string;
  state?: string;
  country?: string;
  countryCode?: string;
}

interface MapAddressSelectorProps {
  onLocationSelect: (lat: number, lng: number, address: string, details?: AddressDetails) => void;
  initialLat?: number;
  initialLng?: number;
  initialAddress?: string;
}

interface LocationData {
  lat: number;
  lng: number;
  address: string;
}

const MapClickHandler: React.FC<{
  onLocationSelect: (lat: number, lng: number, address: string, details?: AddressDetails) => void;
}> = ({ onLocationSelect }) => {
  useMapEvents({
    click: async (e) => {
      const { lat, lng } = e.latlng;
      
      try {
        // Reverse geocoding to get address from coordinates
        const response = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1`,
          { headers: { 'User-Agent': 'BUKKi-Booking/1.0' } }
        );
        if (!response.ok) throw new Error(`Geocoding failed: ${response.status}`);
        const data = await response.json();
        
        const address = data?.display_name || `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
        
        // Extract address details
        const addressDetails: AddressDetails = {};
        if (data?.address) {
          addressDetails.postalCode = data.address.postcode || data.address.postal_code || '';
          addressDetails.city = data.address.city || data.address.town || data.address.village || '';
          addressDetails.state = data.address.state || data.address.region || '';
          addressDetails.country = data.address.country || '';
          addressDetails.countryCode = data.address.country_code?.toUpperCase() || '';
        }
        
        onLocationSelect(lat, lng, address, addressDetails);
      } catch (error) {
        console.error('Error getting address:', error);
        onLocationSelect(lat, lng, `${lat.toFixed(6)}, ${lng.toFixed(6)}`);
      }
    },
  });

  return null;
};

export const MapAddressSelector: React.FC<MapAddressSelectorProps> = ({
  onLocationSelect,
  initialLat = 44.4268,
  initialLng = 26.1025,
  initialAddress = ''
}) => {
  const { t } = useI18n();
  const [location, setLocation] = useState<LocationData>({
    lat: initialLat,
    lng: initialLng,
    address: initialAddress
  });
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (initialLat && initialLng && initialAddress) {
      setLocation({
        lat: initialLat,
        lng: initialLng,
        address: initialAddress
      });
    }
  }, [initialLat, initialLng, initialAddress]);

  const handleLocationSelect = (lat: number, lng: number, address: string, details?: AddressDetails) => {
    setLocation({ lat, lng, address });
    onLocationSelect(lat, lng, address, details);
  };

  const handleSearchAddress = async (searchTerm: string) => {
    if (!searchTerm.trim()) return;
    
    setIsLoading(true);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchTerm)}&limit=1&addressdetails=1`,
        { headers: { 'User-Agent': 'BUKKi-Booking/1.0' } }
      );
      const data = await response.json();
      
      if (data.length > 0) {
        const result = data[0];
        const lat = parseFloat(result.lat);
        const lng = parseFloat(result.lon);
        const address = result.display_name;
        
        // Extract address details
        const addressDetails: AddressDetails = {};
        if (result.address) {
          addressDetails.postalCode = result.address.postcode || result.address.postal_code || '';
          addressDetails.city = result.address.city || result.address.town || result.address.village || '';
          addressDetails.state = result.address.state || result.address.region || '';
          addressDetails.country = result.address.country || '';
          addressDetails.countryCode = result.address.country_code?.toUpperCase() || '';
        }
        
        setLocation({ lat, lng, address });
        onLocationSelect(lat, lng, address, addressDetails);
      } else {
        // If no results found, show a message
        console.warn('No address found for:', searchTerm);
      }
    } catch (error) {
      console.error('Error searching address:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full">
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {t('searchAddressOptional')}
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            className="input flex-1"
            placeholder={t('searchAddressPlaceholder')}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                handleSearchAddress(e.currentTarget.value);
              }
            }}
          />
          <button
            type="button"
            onClick={(e) => {
              const input = e.currentTarget.previousElementSibling as HTMLInputElement;
              handleSearchAddress(input.value);
            }}
            disabled={isLoading}
            className="btn bg-[#330007] hover:bg-[#4a000a] text-white border-0 disabled:opacity-50 px-6 py-3 min-w-[100px]"
          >
            {isLoading ? t('searching') : t('search')}
          </button>
        </div>
        <p className="text-xs text-gray-500 mt-1">
          {t('searchAddressHint')}
        </p>
      </div>

      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {t('selectedLocation')}
        </label>
        <div className="p-3 bg-gray-50 rounded-lg">
          <p className="text-sm text-gray-600">
            <strong>{t('addressLabel')}</strong> {location.address}
          </p>
          <p className="text-sm text-gray-500 mt-1">
            <strong>{t('coordinates')}</strong> {location.lat.toFixed(6)}, {location.lng.toFixed(6)}
          </p>
        </div>
      </div>

      <div className="mb-4">
        <p className="text-sm text-gray-600 mb-2">
          {t('mapClickInstruction')}
        </p>
        <div className="border-2 border-gray-300 rounded-lg overflow-hidden" style={{ height: '400px' }}>
          <MapContainer
            center={[location.lat, location.lng]}
            zoom={13}
            style={{ height: '100%', width: '100%' }}
            key={`${location.lat}-${location.lng}`}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <Marker position={[location.lat, location.lng]} />
            <MapClickHandler onLocationSelect={handleLocationSelect} />
          </MapContainer>
        </div>
      </div>

      <div className="bg-[#fef2f2] border border-[#fecaca] rounded-lg p-3">
        <div className="text-sm text-[#330007]">
          <strong>📍 {t('locationSelection')}</strong>
          <ul className="mt-1 text-xs text-[#991b1b] list-disc list-inside">
            <li>{t('locationHint1')}</li>
            <li>{t('locationHint2')}</li>
            <li>{t('locationHint3')}</li>
            <li>{t('locationHint4')}</li>
          </ul>
        </div>
      </div>
    </div>
  );
};
