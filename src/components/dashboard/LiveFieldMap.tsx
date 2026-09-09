"use client";

import { Fragment, useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Circle, Popup, Tooltip, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { supabase } from "@/lib/supabase/client";
import type { Shop } from "@/lib/supabase/types";

delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })
  ._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

type MapPin = {
  id: string;
  client_name: string;
  staff_name: string | null;
  status: string;
  service_address: string;
  lat: number;
  lng: number;
};

const DEFAULT_CENTER: [number, number] = [39.8283, -98.5795];

// react-leaflet's MapContainer only applies `center`/`zoom` on the initial
// mount — it does not reactively recenter when they change afterward. Pins
// load asynchronously, so without this, the map would stay stuck on
// DEFAULT_CENTER even after a technician's first real GPS check-in loads.
function MapRecenter({
  center,
  zoom,
}: {
  center: [number, number];
  zoom: number;
}) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, zoom);
  }, [map, center, zoom]);
  return null;
}

export default function LiveFieldMap({ shop }: { shop: Shop }) {
  const [pins, setPins] = useState<MapPin[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const id = setTimeout(async () => {
      const { data } = await supabase
        .from("job_tickets_map_view")
        .select("*")
        .eq("shop_id", shop.id);

      if (!active) return;

      const rows = (data ?? []) as {
        id: string;
        client_name: string;
        staff_name: string | null;
        status: string;
        service_address: string;
        start_lat: number | null;
        start_lng: number | null;
        end_lat: number | null;
        end_lng: number | null;
      }[];

      const mapped: MapPin[] = rows
        .map((row) => {
          const lat = row.end_lat ?? row.start_lat;
          const lng = row.end_lng ?? row.start_lng;
          if (lat === null || lng === null || lat === undefined || lng === undefined) {
            return null;
          }
          return {
            id: row.id,
            client_name: row.client_name,
            staff_name: row.staff_name,
            status: row.status,
            service_address: row.service_address,
            lat,
            lng,
          };
        })
        .filter((p): p is MapPin => p !== null);

      setPins(mapped);
      setLoading(false);
    }, 0);

    return () => {
      active = false;
      clearTimeout(id);
    };
  }, [shop.id]);

  const center: [number, number] =
    pins.length > 0 ? [pins[0].lat, pins[0].lng] : DEFAULT_CENTER;

  return (
    <div className="relative overflow-hidden rounded-2xl shadow-md shadow-black/20">
      <MapContainer
        center={center}
        zoom={pins.length > 0 ? 12 : 4}
        style={{ height: "480px", width: "100%" }}
      >
        <MapRecenter center={center} zoom={pins.length > 0 ? 12 : 4} />
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {pins.map((pin) => (
          <Fragment key={pin.id}>
            <Marker position={[pin.lat, pin.lng]}>
              <Tooltip permanent direction="top" offset={[0, -38]}>
                {pin.client_name || "Unnamed job"}
                {pin.staff_name ? ` — ${pin.staff_name}` : ""}
              </Tooltip>
              <Popup>
                <p className="font-semibold">{pin.client_name}</p>
                {pin.staff_name && (
                  <p className="text-xs text-slate-600">Tech: {pin.staff_name}</p>
                )}
                <p className="text-xs">{pin.service_address}</p>
                <p className="text-xs">{pin.status}</p>
              </Popup>
            </Marker>
            <Circle
              center={[pin.lat, pin.lng]}
              radius={shop.geofence_radius_meters}
              pathOptions={{ color: "#10B981", fillOpacity: 0.1 }}
            />
          </Fragment>
        ))}
      </MapContainer>

      {!loading && pins.length === 0 && (
        <div className="pointer-events-none absolute inset-0 z-[1000] flex items-center justify-center bg-slate-900/20">
          <div className="pointer-events-auto mx-6 max-w-sm rounded-2xl bg-white px-6 py-5 text-center shadow-2xl shadow-black/40">
            <p className="text-sm font-semibold text-slate-900">
              No staff pins yet
            </p>
            <p className="mt-1.5 text-xs leading-relaxed text-slate-500">
              A pin appears here only after a technician actually clocks in or
              out on a job from the mobile app (live camera + GPS capture) —
              not just from changing a job&apos;s status in the dashboard.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
