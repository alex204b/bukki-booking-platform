import React from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default markers in react-leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
  iconUrl: require('leaflet/dist/images/marker-icon.png'),
  shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
});

interface Business {
  id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  category: string;
  rating: number;
  reviewCount: number;
  latitude: number;
  longitude: number;
  phone?: string;
  email?: string;
  website?: string;
}

interface BusinessMapProps {
  businesses: Business[];
  center?: [number, number];
  zoom?: number;
  onBusinessClick?: (business: Business) => void;
}

export const BusinessMap: React.FC<BusinessMapProps> = ({
  businesses,
  center = [44.4268, 26.1025], // Default to Bucharest
  zoom = 13,
  onBusinessClick
}) => {
  const getCategoryIcon = (category: string) => {
    // You can customize icons based on business category
    return L.icon({
      iconUrl: require('leaflet/dist/images/marker-icon.png'),
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
      shadowSize: [41, 41]
    });
  };

  return (
    <div className="w-full h-96 rounded-lg overflow-hidden border-2 border-gray-300">
      <MapContainer
        center={center}
        zoom={zoom}
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        {businesses.map((business) => (
          <Marker
            key={business.id}
            position={[business.latitude, business.longitude]}
            icon={getCategoryIcon(business.category)}
            eventHandlers={{
              click: () => onBusinessClick?.(business)
            }}
          >
            <Popup>
              <div className="p-2">
                <h3 className="font-semibold text-lg text-gray-800">{business.name}</h3>
                <p className="text-sm text-gray-600 mb-2">{business.address}</p>
                <p className="text-sm text-gray-500 mb-2">
                  {business.city}, {business.state}
                </p>
                <div className="flex items-center mb-2">
                  <span className="text-yellow-500">★</span>
                  <span className="text-sm font-medium ml-1">
                    {business.rating.toFixed(1)} ({business.reviewCount} reviews)
                  </span>
                </div>
                <p className="text-xs text-gray-500 capitalize">
                  {business.category.replace('_', ' ')}
                </p>
                {business.phone && (
                  <p className="text-xs text-blue-600 mt-1">📞 {business.phone}</p>
                )}
                {business.website && (
                  <a 
                    href={business.website} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-xs text-blue-600 hover:underline"
                  >
                    🌐 Website
                  </a>
                )}
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
};
