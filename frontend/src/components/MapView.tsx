import React from 'react';
import { Link } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from 'react-leaflet';
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
    <div style={{ height: 500 }} className="rounded-lg overflow-hidden border">
      <MapContainer center={defaultCenter as any} zoom={12} style={{ height: '100%', width: '100%' }}>
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
              <Popup>
                <div className="space-y-2">
                  <div className={`font-semibold ${isSelected ? 'text-orange-600' : ''}`}>
                    {b.name} {isSelected && '📍'}
                  </div>
                  {b.category && <div className="text-sm text-gray-600 capitalize">{b.category}</div>}
                  {b.address && (
                    <div className="text-sm text-gray-600">{b.address}{b.city ? `, ${b.city}` : ''}</div>
                  )}
                  <div className="flex flex-col gap-1 pt-1">
                    <Link
                      to={`/businesses/${b.id}`}
                      className="text-sm bg-primary-600 text-white px-3 py-1 rounded hover:bg-primary-700 transition-colors font-medium text-center"
                    >
                      Make a Booking
                    </Link>
                    <a
                      className="text-primary-600 text-sm underline text-center"
                      href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
                        `${b.latitude},${b.longitude}`
                      )}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Get directions
                    </a>
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


