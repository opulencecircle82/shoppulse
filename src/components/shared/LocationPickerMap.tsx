"use client";

import { useEffect, useRef, useState } from "react";
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { geocodeCountry, searchAddress, type GeocodeResult } from "@/lib/geo/geocode";
import { distanceKm } from "@/lib/geo/distance";

delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })
  ._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

// Manila, as a last-resort default center before a country is even known.
const DEFAULT_CENTER: [number, number] = [14.5995, 120.9842];
const COUNTRY_ZOOM = 6;
const PIN_ZOOM = 16;
// How far a new pin may land from the device's own GPS reading, while `enforceNearMe` is on —
// account creation should reflect roughly where the person actually is, not an address looked up
// from anywhere in the world. Kept tight (matches the order of magnitude of job-site geofencing
// elsewhere in the app) rather than the ~20km "nearby" radius used for browsing shops, which answers
// a different question (how far will a customer travel) than this one (are you really here).
const MAX_DISTANCE_METERS = 500;

function ClickToPlacePin({
  disabled,
  onPick,
}: {
  disabled: boolean;
  onPick: (lat: number, lng: number) => void;
}) {
  useMapEvents({
    click(e) {
      if (disabled) return;
      onPick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

/** Recenters the live map imperatively — `MapContainer`'s own `center` prop only applies once, at
 * first mount, so moving to a newly-picked country or a GPS fix that arrives afterward needs this. */
function RecenterView({ target, zoom }: { target: [number, number]; zoom: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView(target, zoom);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target[0], target[1], zoom]);
  return null;
}

/**
 * Shared by the owner's business-location picker, the customer signup's home-location picker, and
 * branch creation — supports an automatic pin (device GPS), a manual one (tap/drag), and a typed
 * address search, since a typed address alone is unreliable here (many addresses have no formal
 * street or house number) and GPS alone can be off by a building or two.
 */
export default function LocationPickerMap({
  latitude,
  longitude,
  onChange,
  label = "Pin Your Exact Location",
  description = "Search your address, tap the map, or use your current location.",
  tone = "dark",
  country = null,
  /** Account creation only: refuses a pin further than 500m from the device's own GPS position,
   * so the address on file is really where the person setting it up is standing. Never set this for
   * editing an existing address afterward, or for a business's branch (a different location on
   * purpose) — both are legitimate reasons to place a pin away from wherever the owner is right now. */
  enforceNearMe = false,
}: {
  latitude: number | null;
  longitude: number | null;
  onChange: (lat: number, lng: number) => void;
  label?: string;
  description?: string;
  /** "light" for the owner dashboard, "dark" for the customer app. */
  tone?: "dark" | "light";
  /** Recenters the map here the moment it's picked, before any pin exists. */
  country?: string | null;
  enforceNearMe?: boolean;
}) {
  const light = tone === "light";
  const hasPin = latitude !== null && longitude !== null;
  const [locating, setLocating] = useState(false);
  const [myLocation, setMyLocation] = useState<{ lat: number; lng: number } | null>(null);
  // Starts already "locating" (rather than flipping to it from an effect) whenever enforceNearMe
  // is on, so the very first render already shows the right waiting state.
  const [gpsStatus, setGpsStatus] = useState<"idle" | "locating" | "ready" | "denied">(() =>
    enforceNearMe && navigator.geolocation ? "locating" : "idle"
  );
  const [countryCenter, setCountryCenter] = useState<[number, number] | null>(null);
  const [pinError, setPinError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<GeocodeResult[]>([]);

  const center: [number, number] = hasPin ? [latitude, longitude] : DEFAULT_CENTER;

  // Read inside an async GPS callback without retriggering the effect on every pin change.
  const hasPinRef = useRef(hasPin);
  useEffect(() => {
    hasPinRef.current = hasPin;
  });

  // `enforceNearMe` can't check anything without a GPS fix of its own, so it asks for one right
  // away instead of waiting for "Use my current location" to be tapped — and since setup only
  // happens while someone is actually there, it goes ahead and places the pin on that reading too,
  // rather than making them tap a button to confirm what the device already told us. They can still
  // nudge it afterward (drag, tap, search) within the same enforced radius.
  useEffect(() => {
    if (!enforceNearMe || !navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const here = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setMyLocation(here);
        setGpsStatus("ready");
        if (!hasPinRef.current) onChange(here.lat, here.lng);
      },
      () => setGpsStatus("denied"),
      { enableHighAccuracy: true, timeout: 15000 }
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enforceNearMe]);

  // Recenter to the freshly-picked country — re-geocodes only when the country itself changes, not
  // every time a pin is cleared. `preferredView` below prefers a GPS fix over this once one exists
  // (under enforceNearMe), so it's harmless if this result arrives after that.
  useEffect(() => {
    if (!country) return;
    let active = true;
    geocodeCountry(country).then((result) => {
      if (active && result) setCountryCenter([result.lat, result.lng]);
    });
    return () => {
      active = false;
    };
  }, [country]);

  function useMyLocation() {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const here = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setMyLocation(here);
        setGpsStatus("ready");
        setLocating(false);
        // This pin IS the fresh GPS reading, so it trivially satisfies enforceNearMe — go straight
        // to onChange rather than through placePin, whose distance check would otherwise still be
        // comparing against the stale myLocation state from before this callback ran.
        setPinError(null);
        onChange(here.lat, here.lng);
      },
      () => {
        setGpsStatus((s) => (s === "locating" ? "denied" : s));
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 15000 }
    );
  }

  /** Returns whether the pin was actually accepted — callers that can visually pre-empt the move
   * (a dragged marker) need to know when to snap back. */
  function placePin(lat: number, lng: number): boolean {
    if (enforceNearMe) {
      if (!myLocation) {
        setPinError("We need your current location first — please allow location access and try again.");
        return false;
      }
      const meters = distanceKm(myLocation, { lat, lng }) * 1000;
      if (meters > MAX_DISTANCE_METERS) {
        setPinError(
          `That's ${meters >= 1000 ? `${(meters / 1000).toFixed(1)} km` : `${Math.round(meters)} m`} from where you are right now — the pin has to be within ${MAX_DISTANCE_METERS} m.`
        );
        return false;
      }
    }
    setPinError(null);
    onChange(lat, lng);
    return true;
  }

  async function handleSearch() {
    const query = search.trim();
    if (!query) return;
    setSearching(true);
    setPinError(null);
    const rows = await searchAddress(query, country);
    setSearching(false);
    setResults(rows);
  }

  function pickResult(result: GeocodeResult) {
    placePin(result.lat, result.lng);
    setResults([]);
    setSearch(result.displayName);
  }

  const waitingOnGps = enforceNearMe && gpsStatus === "locating";
  const gpsDenied = enforceNearMe && gpsStatus === "denied";
  const inputClass = `w-full rounded-xl px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-brand-blue focus:outline-none ${
    light
      ? "border border-slate-200 bg-slate-50 text-slate-900 placeholder:text-slate-400"
      : "bg-white/5 text-white placeholder:text-slate-500"
  }`;

  // Deliberately NOT gated on hasPin: under enforceNearMe the GPS fix and the pin it places land in
  // the same render, and `RecenterView` only re-fires when this target's actual coordinates change —
  // so once GPS (or a picked country) has resolved once, further manual drags/taps/searches are left
  // alone instead of being fought back to this view on every render.
  const preferredView: [number, number] | null =
    enforceNearMe && myLocation ? [myLocation.lat, myLocation.lng] : countryCenter;
  const preferredZoom = enforceNearMe && myLocation ? PIN_ZOOM : COUNTRY_ZOOM;

  return (
    <div>
      <div className="flex items-center justify-between">
        <label className={`block text-sm font-medium ${light ? "text-slate-700" : "text-slate-300"}`}>
          {label}
        </label>
        <button
          type="button"
          onClick={useMyLocation}
          disabled={locating}
          className={`text-xs font-medium text-brand-blue disabled:opacity-60 ${light ? "hover:text-brand-blue-dark" : "hover:text-blue-400"}`}
        >
          {locating ? "Locating..." : "Use my current location"}
        </button>
      </div>
      <p className={`mt-1 text-xs ${light ? "text-slate-500" : "text-slate-400"}`}>{description}</p>

      <div className="relative mt-2">
        <div className="flex gap-2">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleSearch();
              }
            }}
            placeholder="Search an address..."
            disabled={waitingOnGps}
            className={`${inputClass} disabled:cursor-not-allowed disabled:opacity-60`}
          />
          <button
            type="button"
            onClick={handleSearch}
            disabled={searching || waitingOnGps || !search.trim()}
            className={`shrink-0 rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
              light
                ? "border border-slate-300 text-slate-900 hover:border-brand-blue hover:text-brand-blue"
                : "bg-white/10 text-white hover:bg-white/15"
            }`}
          >
            {searching ? "..." : "Search"}
          </button>
        </div>
        {results.length > 0 && (
          <ul
            className={`absolute z-[1001] mt-1 w-full overflow-hidden rounded-xl shadow-lg ${
              light ? "border border-slate-200 bg-white" : "border border-white/10 bg-brand-navy"
            }`}
          >
            {results.map((result, index) => (
              <li key={index}>
                <button
                  type="button"
                  onClick={() => pickResult(result)}
                  className={`block w-full truncate px-3.5 py-2.5 text-left text-xs ${
                    light ? "text-slate-700 hover:bg-slate-50" : "text-slate-300 hover:bg-white/5"
                  }`}
                >
                  {result.displayName}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {waitingOnGps && (
        <p className={`mt-2 text-xs ${light ? "text-slate-500" : "text-slate-400"}`}>
          Getting your current location — this map needs it to make sure your pin is really where you are...
        </p>
      )}
      {gpsDenied && (
        <p className="mt-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-500">
          We couldn&apos;t get your location. Please allow location access for this site, then{" "}
          <button type="button" onClick={useMyLocation} className="font-semibold underline">
            try again
          </button>
          .
        </p>
      )}

      <div
        className={`mt-2 overflow-hidden rounded-xl shadow-sm ${light ? "shadow-slate-900/10" : "shadow-black/20"} ${
          waitingOnGps ? "pointer-events-none opacity-50" : ""
        }`}
        style={{ overscrollBehavior: "contain" }}
      >
        <MapContainer
          center={center}
          zoom={hasPin ? PIN_ZOOM : COUNTRY_ZOOM}
          style={{ height: "280px", width: "100%" }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {preferredView && <RecenterView target={preferredView} zoom={preferredZoom} />}
          <ClickToPlacePin disabled={waitingOnGps} onPick={placePin} />
          {hasPin && (
            <Marker
              position={[latitude, longitude]}
              draggable={!waitingOnGps}
              eventHandlers={{
                dragend: (e) => {
                  const marker = e.target as L.Marker;
                  const pos = marker.getLatLng();
                  const accepted = placePin(pos.lat, pos.lng);
                  // A rejected drag still leaves the marker at its new spot visually — snap it back.
                  if (!accepted) marker.setLatLng([latitude, longitude]);
                },
              }}
            />
          )}
        </MapContainer>
      </div>

      {pinError && <p className="mt-1.5 text-xs text-red-500">{pinError}</p>}

      {hasPin && (
        <p className={`mt-1.5 text-xs ${light ? "text-slate-500" : "text-slate-400"}`}>
          {latitude.toFixed(5)}, {longitude.toFixed(5)}
        </p>
      )}
    </div>
  );
}
