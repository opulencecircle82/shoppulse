/**
 * Bridge to the native Android wrapper's background LocationTrackingService
 * (see shoppulse-mobile's webview_screen.dart + LocationTrackingService.kt).
 * `window.ShopPulseNative` only exists when this page is loaded inside that
 * WebView — it's undefined in a normal desktop/mobile browser, so these
 * calls no-op safely there (foreground-only GPS via lib/tech/gps.ts still
 * works either way for the mandatory proof-capture step).
 */
type NativeBridge = { postMessage: (message: string) => void };

function getBridge(): NativeBridge | null {
  if (typeof window === "undefined") return null;
  return (window as unknown as { ShopPulseNative?: NativeBridge }).ShopPulseNative ?? null;
}

export function notifyNativeSignedIn(locationToken: string) {
  getBridge()?.postMessage(JSON.stringify({ type: "startTracking", token: locationToken }));
}

export function notifyNativeSignedOut() {
  getBridge()?.postMessage(JSON.stringify({ type: "stopTracking" }));
}
