"use client";

import { useEffect } from "react";

export type AppTheme = "light" | "dark" | "auto";

/** "auto" means whatever the phone itself is set to. */
export function resolveAppTheme(theme: AppTheme, systemPrefersDark: boolean): "light" | "dark" {
  return theme === "auto" ? (systemPrefersDark ? "dark" : "light") : theme;
}

/**
 * Applies a shop's chosen look to the technician app and the customer's job
 * page by setting data-app-theme on <html> (the Light styles live in
 * globals.css). The attribute is removed again when the screen goes away, so
 * it can never leak onto the owner dashboard or the customer's home screen.
 * Anything not yet known (still loading, signed out) stays on the default dark.
 */
export function useAppTheme(theme: AppTheme | null | undefined) {
  useEffect(() => {
    const root = document.documentElement;
    const query = window.matchMedia("(prefers-color-scheme: dark)");
    const apply = () => {
      root.dataset.appTheme = resolveAppTheme(theme ?? "dark", query.matches);
    };
    apply();
    if (theme === "auto") query.addEventListener("change", apply);
    return () => {
      query.removeEventListener("change", apply);
      delete root.dataset.appTheme;
    };
  }, [theme]);
}
