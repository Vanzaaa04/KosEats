"use client";

import { useEffect, useState } from "react";
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

// Custom Icons
const icons = {
  COURIER: new L.Icon({
    iconUrl: "https://cdn-icons-png.flaticon.com/512/3209/3209935.png",
    iconSize: [45, 45],
    iconAnchor: [22, 22]
  }),
  STORE: new L.Icon({
    iconUrl: "https://cdn-icons-png.flaticon.com/512/3081/3081840.png",
    iconSize: [45, 45],
    iconAnchor: [22, 22]
  }),
  BUYER: new L.Icon({
    iconUrl: "https://cdn-icons-png.flaticon.com/512/2965/2965313.png",
    iconSize: [45, 45],
    iconAnchor: [22, 22]
  })
};

// Component to dynamically update map bounds to fit all markers
function FitBounds({ markers }) {
  const map = useMap();
  useEffect(() => {
    if (map && markers && markers.length > 0) {
      try {
        const bounds = L.latLngBounds(markers.map(m => [m.lat, m.lng]));
        if (markers.length === 1) {
          map.setView([markers[0].lat, markers[0].lng], 16);
        } else {
          map.fitBounds(bounds, { padding: [50, 50] });
        }
      } catch (e) {
        console.warn("Leaflet fitBounds error ignored:", e);
      }
    }
  }, [markers, map]);
  return null;
}

export default function TrackingMap({ markers = [], lat, lng }) {
  // Backwards compatibility for single marker (Courier)
  const mapMarkers = markers.length > 0 ? markers : (lat && lng ? [{ lat, lng, type: "COURIER", label: "Kurir Anda di sini!" }] : []);

  if (mapMarkers.length === 0) return null;
  const initialCenter = [mapMarkers[0].lat, mapMarkers[0].lng];

  return (
    <MapContainer center={initialCenter} zoom={16} style={{ height: "400px", width: "100%", zIndex: 0 }}>
      <FitBounds markers={mapMarkers} />
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {mapMarkers.map((marker, idx) => {
        if (!marker.lat || !marker.lng) return null;
        return (
          <Marker key={idx} position={[marker.lat, marker.lng]} icon={icons[marker.type] || icons.COURIER}>
            <Popup>
              <strong>{marker.type === 'STORE' ? '🏪 Toko / Penjual' : marker.type === 'BUYER' ? '🏠 Lokasi Pembeli' : '🛵 Kurir'}</strong>
              <br/>
              {marker.label}
            </Popup>
          </Marker>
        );
      })}
    </MapContainer>
  );
}
