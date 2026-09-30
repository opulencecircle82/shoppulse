// Free geocoding via OpenStreetMap's Nominatim — no API key, matching the OSM tiles already used
// for every map in this app. Used sparingly (a country recenter on selection, an explicit address
// search), never polled or auto-triggered per keystroke, in line with Nominatim's usage policy.
const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";

export type GeocodeResult = {
  lat: number;
  lng: number;
  displayName: string;
};

/** The centroid of a whole country — for recentering the map the moment a country is picked,
 * before the user has placed (or found) a pin of their own. */
export async function geocodeCountry(country: string): Promise<{ lat: number; lng: number } | null> {
  try {
    const url = `${NOMINATIM_URL}?format=json&limit=1&country=${encodeURIComponent(country)}`;
    const res = await fetch(url, { headers: { Accept: "application/json" } });
    if (!res.ok) return null;
    const rows = (await res.json()) as { lat: string; lon: string }[];
    const first = rows[0];
    return first ? { lat: Number(first.lat), lng: Number(first.lon) } : null;
  } catch {
    return null;
  }
}

/** Free-text address search, optionally narrowed to a country the customer/owner already picked.
 * Nominatim rejects a request that mixes the free-text `q` param with a structured one like
 * `country` (400: "Structured query parameters ... cannot be used together with 'q' parameter"),
 * so the country is folded into the query text itself rather than sent as a separate param — the
 * documented way to bias a free-text search this way. */
export async function searchAddress(query: string, country?: string | null): Promise<GeocodeResult[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];
  try {
    const q = country && !trimmed.toLowerCase().includes(country.toLowerCase()) ? `${trimmed}, ${country}` : trimmed;
    const params = new URLSearchParams({ format: "json", limit: "5", q });
    const res = await fetch(`${NOMINATIM_URL}?${params.toString()}`, {
      headers: { Accept: "application/json" },
    });
    if (!res.ok) return [];
    const rows = (await res.json()) as { lat: string; lon: string; display_name: string }[];
    return rows.map((row) => ({ lat: Number(row.lat), lng: Number(row.lon), displayName: row.display_name }));
  } catch {
    return [];
  }
}
