import React from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
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
}

export const MapView: React.FC<MapViewProps> = ({ markers }) => {
  const defaultCenter = markers.length
    ? [markers[0].latitude, markers[0].longitude]
    : [40.7128, -74.006];

  return (
    <div style={{ height: 500 }} className="rounded-lg overflow-hidden border">
      <MapContainer center={defaultCenter as any} zoom={12} style={{ height: '100%', width: '100%' }}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {markers.map((b) => (
          <Marker key={b.id} position={[b.latitude, b.longitude] as any}>
            <Popup>
              <div className="space-y-1">
                <div className="font-semibold">{b.name}</div>
                {b.category && <div className="text-sm text-gray-600 capitalize">{b.category}</div>}
                {b.address && (
                  <div className="text-sm text-gray-600">{b.address}{b.city ? `, ${b.city}` : ''}</div>
                )}
                <a
                  className="text-primary-600 text-sm underline"
                  href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
                    `${b.latitude},${b.longitude}`
                  )}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  Get directions
                </a>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
};

export default MapView;


