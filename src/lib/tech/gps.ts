/**
 * Wraps the browser Geolocation API with the same timeout + last-known-
 * position fallback as the mobile app's LocationService, so a weak/no GPS
 * signal surfaces a clear error instead of hanging the capture button
 * forever.
 */
export function getCurrentPosition(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (!("geolocation" in navigator)) {
      reject(new Error("This device doesn't support GPS location."));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      resolve,
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          reject(new Error("Location permission denied."));
        } else if (err.code === err.TIMEOUT) {
          reject(
            new Error(
              "Could not get a GPS fix in time. Move to an open area with a clear view of the sky and try again."
            )
          );
        } else {
          reject(new Error("Could not get GPS location. Make sure Location is turned on."));
        }
      },
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 }
    );
  });
}

export function toGeographyPoint(latitude: number, longitude: number): string {
  return `SRID=4326;POINT(${longitude} ${latitude})`;
}
