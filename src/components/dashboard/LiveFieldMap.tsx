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

const LIVE_DOT_ICON = L.divIcon({
  className: "",
  html: '<span style="display:block;width:16px;height:16px;border-radius:9999px;background:#F97316;border:3px solid white;box-shadow:0 0 0 2px rgba(249,115,22,0.4)"></span>',
  iconSize: [16, 16],
  iconAnchor: [8, 8],
});

// Live positions older than this are treated as stale (app closed/
// backgrounded) and hidden, rather than showing a "live" dot that's
// actually long gone.
const LIVE_STALE_MS = 3 * 60 * 1000;
const LIVE_POLL_MS = 15000;

type MapPin = {
  id: string;
  client_name: string;
  staff_name: string | null;
  status: string;
  service_address: string;
  lat: number;
  lng: number;
};

type LivePin = {
  staffId: string;
  staffName: string;
  lat: number;
  lng: number;
  accuracy: number | null;
  updatedAt: string;
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
  const [livePins, setLivePins] = useState<LivePin[]>([]);
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

  useEffect(() => {
    let active = true;

    async function fetchLive() {
      const { data } = await supabase
        .from("staff_live_locations")
        .select("staff_id, lat, lng, accuracy, updated_at, staff_members(full_name)")
        .eq("shop_id", shop.id);

      if (!active) return;

      const rows = (data ?? []) as unknown as {
        staff_id: string;
        lat: number;
        lng: number;
        accuracy: number | null;
        updated_at: string;
        staff_members: { full_name: string }[] | { full_name: string } | null;
      }[];

      const fresh = rows.filter(
        (row) => Date.now() - new Date(row.updated_at).getTime() < LIVE_STALE_MS
      );

      setLivePins(
        fresh.map((row) => {
          const staffRow = Array.isArray(row.staff_members)
            ? row.staff_members[0]
            : row.staff_members;
          return {
            staffId: row.staff_id,
            staffName: staffRow?.full_name ?? "Technician",
            lat: row.lat,
            lng: row.lng,
            accuracy: row.accuracy,
            updatedAt: row.updated_at,
          };
        })
      );
    }

    fetchLive();
    const interval = setInterval(fetchLive, LIVE_POLL_MS);

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [shop.id]);

  const firstPoint = pins[0] ?? livePins[0];
  const hasAnyPoint = pins.length > 0 || livePins.length > 0;
  const center: [number, number] = firstPoint
    ? [firstPoint.lat, firstPoint.lng]
    : DEFAULT_CENTER;

  return (
    <div className="relative overflow-hidden rounded-2xl shadow-md shadow-black/20">
      <MapContainer
        center={center}
        zoom={hasAnyPoint ? 12 : 4}
        style={{ height: "480px", width: "100%" }}
      >
        <MapRecenter center={center} zoom={hasAnyPoint ? 12 : 4} />
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

        {livePins.map((live) => (
          <Marker key={live.staffId} position={[live.lat, live.lng]} icon={LIVE_DOT_ICON}>
            <Tooltip permanent direction="right" offset={[10, 0]}>
              🟠 {live.staffName} (live)
            </Tooltip>
            <Popup>
              <p className="font-semibold">{live.staffName}</p>
              <p className="text-xs text-slate-600">
                Live position — app currently open
              </p>
              {live.accuracy !== null && (
                <p className="text-xs text-slate-500">
                  Accuracy: ±{Math.round(live.accuracy)}m
                </p>
              )}
              <p className="text-xs text-slate-400">
                Updated {new Date(live.updatedAt).toLocaleTimeString()}
              </p>
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      {!loading && !hasAnyPoint && (
        <div className="pointer-events-none absolute inset-0 z-[1000] flex items-center justify-center bg-slate-900/20">
          <div className="pointer-events-auto mx-6 max-w-sm rounded-2xl bg-white px-6 py-5 text-center shadow-2xl shadow-black/40">
            <p className="text-sm font-semibold text-slate-900">
              No staff pins yet
            </p>
            <p className="mt-1.5 text-xs leading-relaxed text-slate-500">
              A pin appears here once a technician clocks in/out on a job
              (live camera + GPS capture), or an orange live dot shows while
              they have the mobile app open.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
