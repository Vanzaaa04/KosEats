"use client";

import { useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

// Fix default icon issue with webpack
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png"
});

// Custom icon for courier
const courierIcon = new L.Icon({
  iconUrl: "https://cdn-icons-png.flaticon.com/512/3209/3209935.png",
  iconSize: [40, 40],
  iconAnchor: [20, 20]
});

// Component to dynamically update map center
function ChangeView({ center }) {
  const map = useMap();
  useEffect(() => {
    if (map && center && center[0] !== undefined && center[1] !== undefined) {
      try {
        map.setView(center, map.getZoom());
      } catch (e) {
        console.warn("Leaflet setView error ignored during fast refresh:", e);
      }
    }
  }, [center, map]);
  return null;
}

export default function TrackingMap({ lat, lng }) {
  if (lat === undefined || lng === undefined) return null;
  const position = [lat, lng];

  return (
    <MapContainer center={position} zoom={16} style={{ height: "400px", width: "100%", zIndex: 0 }}>
      <ChangeView center={position} />
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <Marker position={position} icon={courierIcon}>
        <Popup>Kurir Anda di sini!</Popup>
      </Marker>
    </MapContainer>
  );
}
