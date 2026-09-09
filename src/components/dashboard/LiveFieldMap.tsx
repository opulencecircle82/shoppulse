"use client";

import { Fragment, useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Circle, Popup } from "react-leaflet";
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
  status: string;
  service_address: string;
  lat: number;
  lng: number;
};

const DEFAULT_CENTER: [number, number] = [39.8283, -98.5795];

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
    <div className="relative overflow-hidden rounded-xl border border-slate-700">
      <MapContainer
        center={center}
        zoom={pins.length > 0 ? 12 : 4}
        style={{ height: "480px", width: "100%" }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {pins.map((pin) => (
          <Fragment key={pin.id}>
            <Marker position={[pin.lat, pin.lng]}>
              <Popup>
                <p className="font-semibold">{pin.client_name}</p>
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
        <div className="pointer-events-none absolute inset-x-0 bottom-4 flex justify-center">
          <div className="pointer-events-auto rounded-lg border border-slate-700 bg-brand-slate/90 px-4 py-2.5 text-center text-xs text-slate-300 shadow-lg backdrop-blur">
            No GPS check-ins yet — pins appear here once technicians clock in
            via the ShopPulse mobile app.
          </div>
        </div>
      )}
    </div>
  );
}
