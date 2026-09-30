"use client";

import { useEffect } from "react";
import { MapContainer, TileLayer, Marker, Polyline, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { LatLng } from "@/lib/tech/navigation";

delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })
  ._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

// The same green engineer-head dot the owner and the customer see elsewhere for a live position.
const TECH_DOT_ICON = L.icon({
  iconUrl: "/images/technician-marker-live.svg",
  iconSize: [40, 40],
  iconAnchor: [20, 20],
});

/** Keeps the camera centred on the technician while turn-by-turn is running — always follows, the
 * way a real navigation app's default camera does, rather than waiting for the position to drift
 * out of frame. There's nothing here to "leave alone" once the technician pans, since this map isn't
 * draggable in the first place (matching every other small map in this app). */
function FollowPosition({ position, zoom }: { position: LatLng; zoom: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView([position.lat, position.lng], zoom);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [position.lat, position.lng, zoom]);
  return null;
}

export default function TechNavMap({
  position,
  destination,
  routeGeometry,
}: {
  /** Null until the first GPS fix comes in. */
  position: LatLng | null;
  destination: LatLng;
  routeGeometry: LatLng[];
}) {
  const center = position ?? destination;

  return (
    <MapContainer
      center={[center.lat, center.lng]}
      zoom={17}
      dragging={false}
      scrollWheelZoom={false}
      doubleClickZoom={false}
      touchZoom={false}
      boxZoom={false}
      keyboard={false}
      zoomControl={false}
      style={{ height: "100%", width: "100%" }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {position && <FollowPosition position={position} zoom={17} />}
      {routeGeometry.length > 1 && (
        <Polyline
          positions={routeGeometry.map((p): [number, number] => [p.lat, p.lng])}
          pathOptions={{ color: "#2563EB", weight: 6, opacity: 0.85 }}
        />
      )}
      <Marker position={[destination.lat, destination.lng]} />
      {position && <Marker position={[position.lat, position.lng]} icon={TECH_DOT_ICON} />}
    </MapContainer>
  );
}
