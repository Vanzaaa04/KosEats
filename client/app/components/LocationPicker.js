"use client";

import { useEffect, useState, useRef } from "react";
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix default icon issue with webpack
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png"
});

function MapEvents({ setPosition }) {
  useMapEvents({
    click(e) {
      setPosition(e.latlng);
    },
  });
  return null;
}

function ChangeView({ center }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, map.getZoom());
  }, [center, map]);
  return null;
}

export default function LocationPicker({ defaultLat = -7.280, defaultLng = 112.795, onLocationChange }) {
  const [position, setPosition] = useState({ lat: defaultLat, lng: defaultLng });
  const [isLocating, setIsLocating] = useState(false);
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      onLocationChange(position);
      return;
    }
    const fetchAddress = async () => {
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${position.lat}&lon=${position.lng}`);
        const data = await res.json();
        if (data && data.display_name) {
          onLocationChange({ ...position, address: data.display_name });
          return;
        }
      } catch (err) {
        console.error("Reverse geocoding failed:", err);
      }
      onLocationChange(position);
    };
    
    // Only fetch address if we are actually picking a new location to prevent initial spam
    fetchAddress();
  }, [position]);

  const handleGetCurrentLocation = () => {
    setIsLocating(true);
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setPosition({ lat: pos.coords.latitude, lng: pos.coords.longitude });
          setIsLocating(false);
        },
        (err) => {
          console.error(err);
          alert("Gagal mendapatkan lokasi. Pastikan izin GPS diaktifkan.");
          setIsLocating(false);
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    } else {
      alert("Browser Anda tidak mendukung geolokasi.");
      setIsLocating(false);
    }
  };

  return (
    <div style={{ position: "relative" }}>
      <button 
        type="button" 
        onClick={handleGetCurrentLocation}
        className="btn btn-secondary btn-sm"
        style={{ position: "absolute", top: 10, right: 10, zIndex: 1000 }}
        disabled={isLocating}
      >
        {isLocating ? "Mencari satelit..." : "📍 Gunakan Lokasi Saat Ini"}
      </button>
      <MapContainer center={position} zoom={16} style={{ height: "300px", width: "100%", borderRadius: "8px", zIndex: 0 }}>
        <ChangeView center={position} />
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <Marker position={position} />
        <MapEvents setPosition={setPosition} />
      </MapContainer>
      <p className="text-xs text-muted" style={{ marginTop: "0.5rem" }}>
        Titik biru menunjukkan lokasi. Klik di peta untuk menggeser pin lokasi.
      </p>
    </div>
  );
}
