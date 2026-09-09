import { supabase } from "@/lib/supabase/client";
import type { StaffContext } from "./staffContext";

const MIN_UPDATE_INTERVAL_MS = 15000;

/**
 * Starts continuously reporting the technician's position while the /tech
 * app is open (any screen), throttled to at most once every 15s. Returns
 * a stop function to call on sign-out/unmount.
 *
 * Foreground-only: watchPosition stops firing once the tab/WebView is
 * backgrounded or the screen locks — this is "staff actively has the app
 * open right now", not 24/7 background tracking.
 */
export function startWatchingLocation(context: StaffContext): () => void {
  if (!("geolocation" in navigator)) return () => {};

  let lastUpdateAt = 0;

  const watchId = navigator.geolocation.watchPosition(
    (position) => {
      const now = Date.now();
      if (now - lastUpdateAt < MIN_UPDATE_INTERVAL_MS) return;
      lastUpdateAt = now;

      supabase
        .from("staff_live_locations")
        .upsert({
          staff_id: context.staffId,
          shop_id: context.shopId,
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy,
          updated_at: new Date().toISOString(),
        })
        .then(() => {});
    },
    () => {
      // Silently ignore watch errors (permission denied, no signal, etc.)
      // — live tracking is a nice-to-have overlay, not a blocking gate
      // like the mandatory proof-capture GPS read.
    },
    { enableHighAccuracy: true, maximumAge: 10000 }
  );

  return () => navigator.geolocation.clearWatch(watchId);
}
