"use client";

import { MapContainer, TileLayer, Marker } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })
  ._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

// Same cartoon engineer-head pin used on the owner's Live Field Map, so a
// technician's live position reads the same way for the customer tracking
// them here (see LiveFieldMap.tsx for the shared design rationale).
const TECH_MARKER_ICON = L.icon({
  iconUrl: "/images/technician-marker.svg",
  iconSize: [40, 48],
  iconAnchor: [20, 48],
  popupAnchor: [0, -46],
});

export default function ShopLocationMap({
  latitude,
  longitude,
  variant = "shop",
}: {
  latitude: number;
  longitude: number;
  /** "technician" is used to show a technician's live position (e.g. on
   * the client ticket page) instead of the shop's own static address. */
  variant?: "shop" | "technician";
}) {
  return (
    <div className="overflow-hidden rounded-xl shadow-md shadow-black/20">
      <MapContainer
        center={[latitude, longitude]}
        zoom={16}
        dragging={false}
        scrollWheelZoom={false}
        doubleClickZoom={false}
        style={{ height: "180px", width: "100%" }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Marker
          position={[latitude, longitude]}
          icon={variant === "technician" ? TECH_MARKER_ICON : undefined}
        />
      </MapContainer>
    </div>
  );
}
