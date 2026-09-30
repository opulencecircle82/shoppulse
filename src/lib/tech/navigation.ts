import { haversineDistanceMeters } from "./gps";

export type LatLng = { lat: number; lng: number };

export type RouteStep = {
  instruction: string;
  /** Meters of driving covered by this step, from the previous maneuver to this one. */
  distanceMeters: number;
  /** Where this step's maneuver happens — the point a technician needs to reach to complete it. */
  location: LatLng;
};

export type Route = {
  /** The full driving path, dense enough to draw as a line and to check "am I still on it". */
  geometry: LatLng[];
  steps: RouteStep[];
  distanceMeters: number;
  durationSeconds: number;
};

// OSRM's public demo server — free, no key, matching the rest of this app's map stack (Leaflet/OSM
// tiles, Nominatim geocoding). It's explicitly NOT meant for production load (no uptime guarantee,
// rate-limited), so every caller here must treat a failure as routine, not exceptional, and fall
// back to a plain "open in Google Maps" link rather than blocking the technician from navigating.
const OSRM_ROUTE_URL = "https://router.project-osrm.org/route/v1/driving";

type OsrmManeuver = {
  type: string;
  modifier?: string;
  location: [number, number];
};

function buildInstruction(maneuver: OsrmManeuver, streetName: string): string {
  const onto = streetName ? ` onto ${streetName}` : "";

  if (maneuver.type === "depart") return `Head out${onto}`;
  if (maneuver.type === "arrive") return "You have arrived at your destination";

  switch (maneuver.modifier) {
    case "left":
      return `Turn left${onto}`;
    case "right":
      return `Turn right${onto}`;
    case "slight left":
      return `Bear left${onto}`;
    case "slight right":
      return `Bear right${onto}`;
    case "sharp left":
      return `Make a sharp left${onto}`;
    case "sharp right":
      return `Make a sharp right${onto}`;
    case "uturn":
      return "Make a U-turn";
    case "straight":
      return `Continue straight${onto}`;
    default:
      break;
  }

  if (maneuver.type === "roundabout" || maneuver.type === "rotary") {
    return `Enter the roundabout${streetName ? `, then exit onto ${streetName}` : ""}`;
  }
  if (maneuver.type === "merge") return `Merge${onto}`;
  if (maneuver.type === "fork") return `Keep to the fork${onto}`;
  if (maneuver.type === "end of road") return `At the end of the road, turn${onto}`;
  if (maneuver.type === "new name" || maneuver.type === "continue") return `Continue${onto}`;

  return `Continue${onto}`;
}

/** Fetches a driving route between two points, or null if OSRM is unreachable/rate-limited/can't
 * find one — callers must treat that as "fall back to Google Maps", never as a hard error. */
export async function fetchRoute(from: LatLng, to: LatLng): Promise<Route | null> {
  try {
    const url = `${OSRM_ROUTE_URL}/${from.lng},${from.lat};${to.lng},${to.lat}?steps=true&geometries=geojson&overview=full`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    if (data.code !== "Ok" || !data.routes?.[0]) return null;

    const route = data.routes[0];
    const leg = route.legs[0];
    const geometry: LatLng[] = route.geometry.coordinates.map(([lng, lat]: [number, number]) => ({
      lat,
      lng,
    }));
    const steps: RouteStep[] = leg.steps.map(
      (step: { maneuver: OsrmManeuver; distance: number; name: string }) => ({
        instruction: buildInstruction(step.maneuver, step.name),
        distanceMeters: step.distance,
        location: { lat: step.maneuver.location[1], lng: step.maneuver.location[0] },
      })
    );

    return {
      geometry,
      steps,
      distanceMeters: route.distance,
      durationSeconds: route.duration,
    };
  } catch {
    return null;
  }
}

/** How close `point` gets to any sampled point along the route — a cheap stand-in for a true
 * point-to-segment distance, good enough given how densely OSRM samples its route geometry. */
export function distanceToRouteMeters(point: LatLng, geometry: LatLng[]): number {
  let min = Infinity;
  for (const p of geometry) {
    const d = haversineDistanceMeters(point.lat, point.lng, p.lat, p.lng);
    if (d < min) min = d;
  }
  return min;
}

export function formatDistance(meters: number): string {
  if (meters < 1000) return `${Math.round(meters / 10) * 10} m`;
  return `${(meters / 1000).toFixed(1)} km`;
}

export function formatDuration(seconds: number): string {
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min`;
  return `${Math.floor(minutes / 60)} hr ${minutes % 60} min`;
}

/** Speaks a single instruction — cancels whatever was still being said first, so turns announced in
 * quick succession (a short block of streets) don't queue up and read out stale directions late. */
export function speak(text: string) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(new SpeechSynthesisUtterance(text));
}

export function stopSpeaking() {
  if (typeof window !== "undefined" && "speechSynthesis" in window) window.speechSynthesis.cancel();
}
