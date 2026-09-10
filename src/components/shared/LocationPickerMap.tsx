"use client";

import { useState } from "react";
import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })
  ._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

// Manila, as a reasonable default center for a first-time pin placement.
const DEFAULT_CENTER: [number, number] = [14.5995, 120.9842];

function ClickToPlacePin({
  onPick,
}: {
  onPick: (lat: number, lng: number) => void;
}) {
  useMapEvents({
    click(e) {
      onPick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

/**
 * Shared by the owner's business-location picker and the customer
 * signup's home-location picker — supports both an automatic pin (device
 * GPS via "Use my current location") and a manual one (tap/drag on the
 * map), since a typed address alone is unreliable here (many addresses
 * have no formal street/house number).
 */
export default function LocationPickerMap({
  latitude,
  longitude,
  onChange,
  label = "Pin Your Exact Location",
  description = "Tap anywhere on the map to drop a pin, or use your current location.",
}: {
  latitude: number | null;
  longitude: number | null;
  onChange: (lat: number, lng: number) => void;
  label?: string;
  description?: string;
}) {
  const hasPin = latitude !== null && longitude !== null;
  const [locating, setLocating] = useState(false);

  const center: [number, number] = hasPin ? [latitude, longitude] : DEFAULT_CENTER;

  function useMyLocation() {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        onChange(pos.coords.latitude, pos.coords.longitude);
        setLocating(false);
      },
      () => setLocating(false),
      { enableHighAccuracy: true, timeout: 15000 }
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <label className="block text-sm font-medium text-slate-600">
          {label}
        </label>
        <button
          type="button"
          onClick={useMyLocation}
          disabled={locating}
          className="text-xs font-medium text-brand-blue hover:text-blue-400 disabled:opacity-60"
        >
          {locating ? "Locating..." : "Use my current location"}
        </button>
      </div>
      <p className="mt-1 text-xs text-slate-400">{description}</p>
      <div className="mt-2 overflow-hidden rounded-xl shadow-sm shadow-black/20">
        <MapContainer
          center={center}
          zoom={hasPin ? 16 : 12}
          style={{ height: "280px", width: "100%" }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <ClickToPlacePin onPick={onChange} />
          {hasPin && (
            <Marker
              position={[latitude, longitude]}
              draggable
              eventHandlers={{
                dragend: (e) => {
                  const marker = e.target as L.Marker;
                  const pos = marker.getLatLng();
                  onChange(pos.lat, pos.lng);
                },
              }}
            />
          )}
        </MapContainer>
      </div>
      {hasPin && (
        <p className="mt-1.5 text-xs text-slate-400">
          {latitude.toFixed(5)}, {longitude.toFixed(5)}
        </p>
      )}
    </div>
  );
}
