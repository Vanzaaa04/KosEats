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

import "leaflet-routing-machine";

// Component to dynamically draw route between origin and destination
function RoutingMachine({ origin, destination }) {
  const map = useMap();
  useEffect(() => {
    if (!map || !origin || !destination) return;
    
    let routingControl;
    try {
      routingControl = L.Routing.control({
        waypoints: [
          L.latLng(origin.lat, origin.lng),
          L.latLng(destination.lat, destination.lng)
        ],
        routeWhileDragging: false,
        addWaypoints: false,
        fitSelectedRoutes: false,
        show: false, // hide textual instructions
        lineOptions: {
          styles: [{ color: "#27AE60", weight: 5, opacity: 0.8 }]
        },
        createMarker: function() { return null; } // we already draw markers manually
      }).addTo(map);
    } catch (e) {
      console.warn("Leaflet routing error:", e);
    }

    return () => {
      try {
        if (routingControl && map) {
          map.removeControl(routingControl);
        }
      } catch (e) {
        console.warn(e);
      }
    };
  }, [map, origin, destination]);
  return null;
}

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

  // Try to find origin (STORE or moving COURIER) and destination (BUYER) for routing
  const buyerMarker = mapMarkers.find(m => m.type === "BUYER");
  const movingMarker = mapMarkers.find(m => m.type === "COURIER" || m.label.includes("Bergerak") || m.label.includes("Sedang Mengantar"));
  const storeMarker = mapMarkers.find(m => m.type === "STORE");
  
  // If moving marker is available, route from moving to buyer. Else from store to buyer.
  const routeOrigin = movingMarker || storeMarker;
  const routeDestination = buyerMarker;

  return (
    <MapContainer center={initialCenter} zoom={16} style={{ height: "400px", width: "100%", zIndex: 0 }}>
      <FitBounds markers={mapMarkers} />
      {routeOrigin && routeDestination && (
        <RoutingMachine origin={routeOrigin} destination={routeDestination} />
      )}
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
