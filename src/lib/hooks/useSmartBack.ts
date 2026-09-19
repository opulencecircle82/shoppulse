"use client";

import { useRouter } from "next/navigation";

/**
 * A "← Back" handler for pages that are often reached via a shared
 * link, notification, or fresh app open rather than in-app navigation.
 *
 * Always navigates straight to a fixed destination instead of trying
 * `router.back()` first — `window.history.length` isn't a reliable
 * signal of "there's somewhere useful to go back to" inside this
 * WebView/mobile context (it can read >1 with nothing meaningful
 * behind it), so it kept landing on the wrong screen. Every page this
 * hook is used on has the same natural parent regardless of how it
 * was opened, so a fixed destination is both simpler and correct.
 */
export function useSmartBack(fallbackHref: string) {
  const router = useRouter();
  return function goBack() {
    router.push(fallbackHref);
  };
}
