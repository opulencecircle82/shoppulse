"use client";

import { useRouter } from "next/navigation";

/**
 * A "← Back" handler for pages that are often reached via a shared
 * link, notification, or fresh app open rather than in-app navigation
 * — plain `router.back()` does nothing (or leaves a blank tab) when
 * there's no prior page in history to land on. Falls back to a fixed
 * destination in that case.
 */
export function useSmartBack(fallbackHref: string) {
  const router = useRouter();

  return function goBack() {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
    } else {
      router.push(fallbackHref);
    }
  };
}
