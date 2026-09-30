"use client";

import { Fragment, useEffect, useRef, useState, type ReactNode } from "react";
import { MapContainer, TileLayer, Marker, Circle, Popup, Tooltip, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { supabase } from "@/lib/supabase/client";
import type { Shop } from "@/lib/supabase/types";
import { buildMapPlaces, type MapPlace, type MapRow } from "@/lib/dashboard/mapPlaces";

delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })
  ._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

// The same cartoon engineer-head design, in a green circle (no pin tail,
// since a live position is a moving point, not a placed pin) instead of
// a plain orange dot — still visually distinct from the blue job pins
// below via color/shape, but recognizably "a technician" either way.
const LIVE_DOT_ICON = L.icon({
  iconUrl: "/images/technician-marker-live.svg",
  iconSize: [36, 36],
  iconAnchor: [18, 18],
  popupAnchor: [0, -18],
});

// A friendly cartoon engineer-head pin instead of the generic default
// Leaflet marker, so both the owner (here) and the customer (see
// ShopLocationMap's technician mode) recognize a job pin as "a
// technician was here" at a glance.
const TECH_MARKER_ICON = L.icon({
  iconUrl: "/images/technician-marker.svg",
  iconSize: [40, 48],
  iconAnchor: [20, 48],
  popupAnchor: [0, -46],
});

// The business itself — the orange storefront pin the customer also sees on their tracking map.
const SHOP_MARKER_ICON = L.icon({
  iconUrl: "/images/shop-marker.svg",
  iconSize: [34, 41],
  iconAnchor: [17, 41],
  popupAnchor: [0, -38],
});

// Live positions older than this are treated as stale (app closed/
// backgrounded) and hidden, rather than showing a "live" dot that's
// actually long gone.
const LIVE_STALE_MS = 3 * 60 * 1000;
const LIVE_POLL_MS = 15000;
const PLACES_POLL_MS = 30000;

type LivePin = {
  staffId: string;
  staffName: string;
  lat: number;
  lng: number;
  accuracy: number | null;
  updatedAt: string;
};

const DEFAULT_CENTER: [number, number] = [39.8283, -98.5795];
// Where the map looks before there is anything to show, for a shop that hasn't pinned its own location yet.
const PHILIPPINES_CENTER: [number, number] = [12.8797, 121.774];
// Zoom for the shop's own neighbourhood (streets and nearby barangays), wider than a single job.
const SHOP_AREA_ZOOM = 14;

const CLOSE_ZOOM = 17;

// Leaflet's permanent tooltips are single-line by default (`white-space: nowrap`) and don't reposition
// themselves for the edge of the map, so a long one (a client's name plus job number) can run off the side
// of this map — especially the narrow docked panel. Wrapping the text keeps every tooltip a fixed width no
// matter what it says, so it can spill onto a second line instead of past the map's edge. Inline styles,
// not a class, since they need to win over Leaflet's own `.leaflet-tooltip` rule regardless of CSS order.
function TooltipText({ children }: { children: ReactNode }) {
  return (
    <span style={{ display: "inline-block", maxWidth: 130, whiteSpace: "normal", textAlign: "center", lineHeight: 1.25 }}>
      {children}
    </span>
  );
}

// The owner can freely drag and zoom this map (unlike the small, locked preview maps elsewhere in
// the app), so this only frames every pin automatically when data first arrives or the number of
// pins changes, and again whenever a live position drifts outside what's currently on screen —
// never on every 15s poll while everything is still in view, so a pan or zoom the owner made by hand
// isn't reset for no reason. The "Recenter" button refits on demand.
function MapFitPoints({
  points,
  recenterSignal,
}: {
  points: [number, number][];
  recenterSignal: number;
}) {
  const map = useMap();
  const fittedCountRef = useRef(0);

  function fit() {
    if (points.length === 0) return;
    if (points.length === 1) {
      map.setView(points[0], CLOSE_ZOOM);
    } else {
      map.fitBounds(L.latLngBounds(points), { padding: [110, 90], maxZoom: CLOSE_ZOOM });
    }
  }

  const pointsKey = points.map(([lat, lng]) => `${lat.toFixed(5)},${lng.toFixed(5)}`).join("|");

  useEffect(() => {
    if (points.length === 0) {
      fittedCountRef.current = 0;
      return;
    }
    const countChanged = points.length !== fittedCountRef.current;
    const someOutside = points.some((point) => !map.getBounds().contains(point));
    if (countChanged || someOutside) {
      fittedCountRef.current = points.length;
      fit();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pointsKey]);

  useEffect(() => {
    if (recenterSignal === 0) return;
    fit();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recenterSignal]);

  return null;
}

// "MAIN" is a stand-in for `branch_id is null` — the header switcher's own value for that
// choice, since a real query param can't carry SQL's NULL.
export type MapBranchFilter = "MAIN" | (string & {});

export default function LiveFieldMap({
  shop,
  fill = false,
  branchFilter = null,
}: {
  shop: Shop;
  fill?: boolean;
  /** Owner's header switcher — null/undefined shows every branch, matching today's behavior. */
  branchFilter?: MapBranchFilter | null;
}) {
  const [places, setPlaces] = useState<MapPlace[]>([]);
  const [livePins, setLivePins] = useState<LivePin[]>([]);
  const [loading, setLoading] = useState(true);
  const [recenterSignal, setRecenterSignal] = useState(0);

  // Where the shop's clients are — one pin per client, however many of their jobs are open or finished there.
  useEffect(() => {
    let active = true;

    async function fetchPlaces() {
      let query = supabase.from("job_tickets_map_view").select("*").eq("shop_id", shop.id);
      if (branchFilter === "MAIN") query = query.is("branch_id", null);
      else if (branchFilter) query = query.eq("branch_id", branchFilter);
      const { data } = await query;
      if (!active) return;
      setPlaces(buildMapPlaces((data ?? []) as MapRow[]));
      setLoading(false);
    }

    const id = setTimeout(fetchPlaces, 0);
    const interval = setInterval(fetchPlaces, PLACES_POLL_MS);

    return () => {
      active = false;
      clearTimeout(id);
      clearInterval(interval);
    };
  }, [shop.id, branchFilter]);

  useEffect(() => {
    let active = true;

    async function fetchLive() {
      const { data } = await supabase
        .from("staff_live_locations")
        .select("staff_id, lat, lng, accuracy, updated_at, staff_members(full_name, branch_id)")
        .eq("shop_id", shop.id);

      if (!active) return;

      const rows = (data ?? []) as unknown as {
        staff_id: string;
        lat: number;
        lng: number;
        accuracy: number | null;
        updated_at: string;
        staff_members: { full_name: string; branch_id: string | null }[] | { full_name: string; branch_id: string | null } | null;
      }[];

      const fresh = rows.filter(
        (row) => Date.now() - new Date(row.updated_at).getTime() < LIVE_STALE_MS
      );

      const matchesBranch = (branchId: string | null) => {
        if (branchFilter === "MAIN") return branchId === null;
        if (branchFilter) return branchId === branchFilter;
        return true;
      };

      setLivePins(
        fresh
          .filter((row) => {
            const staffRow = Array.isArray(row.staff_members) ? row.staff_members[0] : row.staff_members;
            return matchesBranch(staffRow?.branch_id ?? null);
          })
          .map((row) => {
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
  }, [shop.id, branchFilter]);

  const firstPoint = places[0] ?? livePins[0];
  const hasAnyPoint = places.length > 0 || livePins.length > 0;
  // With no jobs or technicians to show yet, look at the shop's own neighbourhood — not the middle of the
  // United States. An unpinned shop in the Philippines gets the Philippines.
  const shopPoint: [number, number] | null =
    shop.latitude !== null && shop.longitude !== null ? [shop.latitude, shop.longitude] : null;
  const inPhilippines = shop.country?.toLowerCase() === "philippines";
  const center: [number, number] = firstPoint
    ? [firstPoint.lat, firstPoint.lng]
    : (shopPoint ?? (inPhilippines ? PHILIPPINES_CENTER : DEFAULT_CENTER));
  const startZoom = hasAnyPoint ? CLOSE_ZOOM : shopPoint ? SHOP_AREA_ZOOM : inPhilippines ? 5 : 4;

  return (
    <div
      className={`relative overflow-hidden ${
        fill ? "h-full" : "rounded-2xl shadow-md shadow-slate-900/5"
      }`}
    >
      <MapContainer
        center={center}
        zoom={startZoom}
        maxZoom={19}
        style={{ height: fill ? "100%" : "480px", width: "100%" }}
      >
        <MapFitPoints
          points={[
            ...places.map((place): [number, number] => [place.lat, place.lng]),
            ...livePins.map((live): [number, number] => [live.lat, live.lng]),
          ]}
          recenterSignal={recenterSignal}
        />
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          maxZoom={19}
        />
        {shopPoint && (
          <Marker position={shopPoint} icon={SHOP_MARKER_ICON}>
            <Tooltip permanent direction="top" offset={[0, -38]}>
              <TooltipText>{shop.shop_name}</TooltipText>
            </Tooltip>
            <Popup>
              <p className="font-semibold">{shop.shop_name}</p>
              <p className="text-xs text-slate-600">Your business</p>
            </Popup>
          </Marker>
        )}

        {places.map((place) => {
          const primary = place.jobs[0];
          const extra = place.jobs.length - 1;
          return (
            <Fragment key={place.key}>
              {/* Blue pin: a job is still open here. Engineer pin: only finished work, where a technician took proof photos. */}
              <Marker position={[place.lat, place.lng]} {...(place.hasOpen ? {} : { icon: TECH_MARKER_ICON })}>
                <Tooltip permanent direction={place.hasOpen ? "bottom" : "top"} offset={place.hasOpen ? [0, -4] : [0, -46]}>
                  <TooltipText>
                    Client: {place.clientName} · {primary.label}
                    {!primary.open && primary.tech ? ` · Tech: ${primary.tech}` : ""}
                    {extra > 0 ? ` (+${extra} more)` : ""}
                  </TooltipText>
                </Tooltip>
                <Popup>
                  <p className="font-semibold">Client: {place.clientName}</p>
                  <p className="text-xs">{place.address}</p>
                  <ul className="mt-1.5 space-y-1">
                    {place.jobs.map((job) => (
                      <li key={job.id} className="text-xs text-slate-600">
                        <span className="font-semibold">{job.label}</span> · {job.service}
                        <br />
                        {job.stage}
                        {job.tech ? ` · Tech: ${job.tech}` : ""}
                      </li>
                    ))}
                  </ul>
                </Popup>
              </Marker>
              {place.hasProof && shop.geofence_enforced && (
                <Circle
                  center={[place.lat, place.lng]}
                  radius={shop.geofence_radius_meters}
                  pathOptions={{ color: "#10B981", fillOpacity: 0.1 }}
                />
              )}
            </Fragment>
          );
        })}

        {livePins.map((live) => (
          <Marker key={live.staffId} position={[live.lat, live.lng]} icon={LIVE_DOT_ICON}>
            <Tooltip permanent direction="right" offset={[20, 0]}>
              <TooltipText>🟢 Tech: {live.staffName} (live)</TooltipText>
            </Tooltip>
            <Popup>
              <p className="font-semibold">Tech: {live.staffName}</p>
              <p className="text-xs text-slate-600">
                Live position — app currently open
              </p>
              {live.accuracy !== null && (
                <p className="text-xs text-slate-500">
                  Accuracy: ±{Math.round(live.accuracy)}m
                </p>
              )}
              <p className="text-xs text-slate-500">
                Updated {new Date(live.updatedAt).toLocaleTimeString()}
              </p>
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      {hasAnyPoint && (
        <button
          type="button"
          onClick={() => setRecenterSignal((n) => n + 1)}
          className="absolute right-3 top-3 z-[1000] rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-md shadow-slate-900/5 hover:text-brand-blue"
        >
          Recenter
        </button>
      )}

      {!loading && !hasAnyPoint && (
        <div
          className={`pointer-events-none absolute inset-0 z-[1000] flex justify-center bg-slate-900/20 ${
            shopPoint ? "items-end pb-6" : "items-center"
          }`}
        >
          <div className="pointer-events-auto mx-6 max-w-sm rounded-2xl bg-white px-6 py-5 text-center shadow-2xl shadow-slate-900/10">
            <p className="text-sm font-semibold text-slate-900">
              No staff pins yet
            </p>
            <p className="mt-1.5 text-xs leading-relaxed text-slate-500">
              A pin appears here once a technician clocks in/out on a job
              (live camera + GPS capture), or a green live marker shows while
              they have the mobile app open.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
