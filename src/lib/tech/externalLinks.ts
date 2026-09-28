import type { MouseEvent } from "react";

export const UPDATE_APP_EVENT = "shoppulse:update-app";

type NativeWindow = {
  /** Exists only inside the Android wrapper (see nativeBridge.ts). */
  ShopPulseNative?: unknown;
  /** Set by wrapper versions that can hand a link to another app (Maps, the phone, messages). */
  __shopPulseNativeLinks?: boolean;
};

/**
 * True inside an OLDER Android wrapper. Those can't hand a link to another app, so following Google Maps, a
 * phone call or a text swaps the whole app for a "Could not load ShopPulse" page. Newer wrappers announce
 * that they can (`__shopPulseNativeLinks`), and an ordinary browser never has the native bridge at all.
 */
export function insideOutdatedWrapper(): boolean {
  if (typeof window === "undefined") return false;
  const w = window as unknown as NativeWindow;
  return Boolean(w.ShopPulseNative) && !w.__shopPulseNativeLinks;
}

/**
 * Put on the onClick of any link that leaves the app (Maps, tel:, sms:). In an older wrapper it stops the
 * click — nothing crashes — and asks the technician to update the app instead. Anywhere else it does
 * nothing and the link works as usual. Returns whether the click was stopped.
 */
export function guardExternalLink(event: MouseEvent): boolean {
  if (!insideOutdatedWrapper()) return false;
  event.preventDefault();
  window.dispatchEvent(new CustomEvent(UPDATE_APP_EVENT));
  return true;
}
