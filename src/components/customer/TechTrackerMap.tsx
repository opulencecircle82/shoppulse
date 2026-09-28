"use client";

import { useEffect } from "react";
import { MapContainer, TileLayer, Marker, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })
  ._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

// The same green engineer-head dot the owner sees on the Live Field Map.
const TECH_DOT_ICON = L.icon({
  iconUrl: "/images/technician-marker-live.svg",
  iconSize: [40, 40],
  iconAnchor: [20, 20],
});

type Point = { lat: number; lng: number };

// Keeps the technician (and the customer's address, when known) in frame as
// the technician moves. The map itself can't be dragged, same as the other
// small maps in the app, so the view has to do the following.
function FitToPoints({ points }: { points: Point[] }) {
  const map = useMap();
  const key = points.map((p) => `${p.lat.toFixed(5)},${p.lng.toFixed(5)}`).join("|");

  useEffect(() => {
    if (points.length === 1) {
      map.setView([points[0].lat, points[0].lng], 16);
    } else {
      map.fitBounds(
        L.latLngBounds(points.map((p): [number, number] => [p.lat, p.lng])),
        { padding: [44, 44], maxZoom: 16 }
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, key]);

  return null;
}

/** Live map for a customer following their technician to their door. */
export default function TechTrackerMap({
  technician,
  destination,
}: {
  technician: Point;
  destination: Point | null;
}) {
  const points = destination ? [technician, destination] : [technician];

  return (
    <div className="overflow-hidden rounded-xl shadow-md shadow-black/30">
      <MapContainer
        center={[technician.lat, technician.lng]}
        zoom={15}
        dragging={false}
        scrollWheelZoom={false}
        doubleClickZoom={false}
        touchZoom={false}
        boxZoom={false}
        keyboard={false}
        style={{ height: "220px", width: "100%" }}
      >
        <FitToPoints points={points} />
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {destination && <Marker position={[destination.lat, destination.lng]} />}
        <Marker position={[technician.lat, technician.lng]} icon={TECH_DOT_ICON} />
      </MapContainer>
    </div>
  );
}
