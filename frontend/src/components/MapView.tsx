import React from 'react';
import { Link } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from 'react-leaflet';
import { Star } from 'lucide-react';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
// Fix default marker icons path when bundling with CRA
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

type BusinessMarker = {
  id: string;
  name: string;
  category?: string;
  address?: string;
  city?: string;
  state?: string;
  phone?: string;
  latitude: number;
  longitude: number;
  rating?: number;
  reviewCount?: number;
  images?: string[];
};

interface MapViewProps {
  markers: BusinessMarker[];
  center?: { lat: number; lng: number };
  selectedBusiness?: any;
}

const SetView: React.FC<{ center: { lat: number; lng: number }; zoom?: number }> = ({ center, zoom = 12 }) => {
  const map = useMap();
  React.useEffect(() => {
    map.setView([center.lat, center.lng] as any, zoom);
  }, [center.lat, center.lng, zoom, map]);
  return null;
};

export const MapView: React.FC<MapViewProps> = ({ markers, center, selectedBusiness }) => {
  const defaultCenter = markers.length
    ? [markers[0].latitude, markers[0].longitude]
    : [40.7128, -74.006];

  return (
    <div className="h-full w-full overflow-hidden relative z-0">
      <MapContainer center={defaultCenter as any} zoom={12} style={{ height: '100%', width: '100%', position: 'relative', zIndex: 0 }}>
        {center ? <SetView center={center} /> : null}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {markers.map((b) => {
          const isSelected = selectedBusiness && selectedBusiness.id === b.id;
          return (
            <Marker
              key={b.id}
              position={[b.latitude, b.longitude] as any}
            >
              <Popup maxWidth={320} className="custom-popup">
                <div className="overflow-hidden">
                  {/* Business Image */}
                  {b.images && b.images.length > 0 ? (
                    <div className="w-full h-40 bg-gray-200 -mt-5 -mx-5 mb-3">
                      <img
                        src={`${b.images[0].startsWith('http') ? '' : process.env.REACT_APP_API_URL || 'http://localhost:3000'}${b.images[0]}`}
                        alt={b.name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    </div>
                  ) : (
                    <div className="w-full h-40 bg-gradient-to-br from-gray-200 to-gray-300 -mt-5 -mx-5 mb-3 flex items-center justify-center">
                      <svg className="w-16 h-16 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                    </div>
                  )}

                  <div className="px-1">
                    <div className="mb-3">
                      {/* Business Name & Rating */}
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="text-lg font-bold text-gray-900 flex-1">
                          {b.name}
                        </h3>
                        {(b.rating !== undefined && b.rating > 0) && (
                          <div className="flex items-center ml-2 bg-yellow-50 px-2 py-1 rounded">
                            <Star className="h-4 w-4 text-yellow-500 fill-current mr-1" />
                            <span className="text-sm font-semibold text-gray-900">
                              {Number(b.rating || 0).toFixed(1)}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Category */}
                      {b.category && (
                        <p className="text-sm text-gray-600 capitalize mb-3">
                          {b.category.replace(/_/g, ' ')}
                        </p>
                      )}

                      {/* Location */}
                      {(b.address || b.city) && (
                        <div className="flex items-start text-sm text-gray-500 mb-2">
                          <svg className="w-4 h-4 mr-1 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                          <span>
                            {b.address && <>{b.address}</>}
                            {b.city && <>{b.address ? ', ' : ''}{b.city}, {b.state}</>}
                          </span>
                        </div>
                      )}

                      {/* Reviews */}
                      {(b.reviewCount !== undefined && b.reviewCount > 0) && (
                        <div className="text-xs text-gray-500 mb-3">
                          {b.reviewCount} {b.reviewCount === 1 ? 'review' : 'reviews'}
                        </div>
                      )}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-col gap-2 pt-3 border-t border-gray-200">
                      <Link
                        to={`/businesses/${b.id}`}
                        className="w-full bg-primary-600 !text-white px-4 py-2.5 rounded-lg hover:bg-primary-700 transition-colors font-medium text-center text-sm shadow-sm no-underline"
                        style={{ color: '#ffffff', textDecoration: 'none' }}
                      >
                        View Details & Book
                      </Link>
                      <a
                        className="w-full bg-white border-2 border-gray-200 !text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 hover:border-gray-300 transition-colors font-medium text-center text-sm flex items-center justify-center gap-1 no-underline"
                        style={{ color: '#374151', textDecoration: 'none' }}
                        href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
                          `${b.latitude},${b.longitude}`
                        )}`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                        </svg>
                        Get Directions
                      </a>
                    </div>
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}
        {center ? (
          <>
            <Marker position={[center.lat, center.lng] as any}>
              <Popup>Your location</Popup>
            </Marker>
            <Circle center={[center.lat, center.lng] as any} radius={300} pathOptions={{ color: '#2563eb', fillOpacity: 0.15 }} />
          </>
        ) : null}
      </MapContainer>
    </div>
  );
};

export default MapView;


