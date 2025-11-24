import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default markers in react-leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
  iconUrl: require('leaflet/dist/images/marker-icon.png'),
  shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
});

interface MapAddressSelectorProps {
  onLocationSelect: (lat: number, lng: number, address: string) => void;
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
  onLocationSelect: (lat: number, lng: number, address: string) => void;
}> = ({ onLocationSelect }) => {
  useMapEvents({
    click: async (e) => {
      const { lat, lng } = e.latlng;
      
      try {
        // Reverse geocoding to get address from coordinates
        const response = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1`
        );
        const data = await response.json();
        
        const address = data.display_name || `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
        onLocationSelect(lat, lng, address);
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

  const handleLocationSelect = (lat: number, lng: number, address: string) => {
    setLocation({ lat, lng, address });
    onLocationSelect(lat, lng, address);
  };

  const handleSearchAddress = async (searchTerm: string) => {
    if (!searchTerm.trim()) return;
    
    setIsLoading(true);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchTerm)}&limit=1&addressdetails=1`
      );
      const data = await response.json();
      
      if (data.length > 0) {
        const result = data[0];
        const lat = parseFloat(result.lat);
        const lng = parseFloat(result.lon);
        const address = result.display_name;
        
        setLocation({ lat, lng, address });
        onLocationSelect(lat, lng, address);
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
          Search Address (Optional)
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            className="input flex-1"
            placeholder="Type your business address to search..."
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
            className="btn btn-primary disabled:opacity-50"
          >
            {isLoading ? 'Searching...' : 'Search'}
          </button>
        </div>
        <p className="text-xs text-gray-500 mt-1">
          💡 You can search for your address or click directly on the map to select your location
        </p>
      </div>

      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Selected Location
        </label>
        <div className="p-3 bg-gray-50 rounded-lg">
          <p className="text-sm text-gray-600">
            <strong>Address:</strong> {location.address}
          </p>
          <p className="text-sm text-gray-500 mt-1">
            <strong>Coordinates:</strong> {location.lat.toFixed(6)}, {location.lng.toFixed(6)}
          </p>
        </div>
      </div>

      <div className="mb-4">
        <p className="text-sm text-gray-600 mb-2">
          <strong>Step 2:</strong> Click on the map to select your exact business location:
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

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
        <div className="text-sm text-blue-800">
          <strong>📍 Location Selection:</strong>
          <ul className="mt-1 text-xs text-blue-700 list-disc list-inside">
            <li>Search for your address above, or</li>
            <li>Click directly on the map to select your exact business location</li>
            <li>The red marker shows your selected location</li>
            <li>You can drag the map to explore and find the perfect spot</li>
          </ul>
        </div>
      </div>
    </div>
  );
};
