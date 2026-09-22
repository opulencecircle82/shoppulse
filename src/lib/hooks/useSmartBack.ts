"use client";

import { useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";

declare global {
  interface Window {
    __shopPulseSmartBack?: () => void;
  }
}

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
 *
 * Also registers itself on `window` so the native Android/iOS shell's
 * hardware/gesture back button can trigger the exact same fixed-
 * destination navigation (see webview_screen.dart) instead of relying
 * on the WebView's own back-history, which is unreliable for the same
 * reason `router.back()` was above. Pages that don't use this hook
 * (i.e. the dashboard root) leave nothing registered, so the shell
 * correctly falls through to closing the app there.
 */
export function useSmartBack(fallbackHref: string) {
  const router = useRouter();
  const goBack = useCallback(() => {
    router.push(fallbackHref);
  }, [router, fallbackHref]);

  useEffect(() => {
    window.__shopPulseSmartBack = goBack;
    return () => {
      if (window.__shopPulseSmartBack === goBack) {
        delete window.__shopPulseSmartBack;
      }
    };
  }, [goBack]);

  return goBack;
}
