"use client";

import { useEffect } from "react";
import { appFontHref, appFontStack, brandVars } from "@/lib/branding";

const FONT_LINK_ID = "app-brand-font";

/**
 * Dresses the technician app in the shop's own colours and font (chosen in the
 * App Builder). The colours repoint the app's design tokens on <html>, so every
 * screen follows without knowing about it; the font is loaded on demand. Both
 * are removed again when the screen goes away. Until the shop has loaded — or
 * if it never picked anything — the app keeps its normal look.
 */
export function useAppBranding(
  primary: string | null | undefined,
  accent: string | null | undefined,
  font: string | null | undefined
) {
  useEffect(() => {
    if (!primary || !accent) return;

    const root = document.documentElement;
    const vars = brandVars(primary, accent);
    for (const [name, value] of Object.entries(vars)) root.style.setProperty(name, value);

    const stack = appFontStack(font);
    const href = appFontHref(font);
    let link: HTMLLinkElement | null = null;
    if (stack && href) {
      link = document.createElement("link");
      link.id = FONT_LINK_ID;
      link.rel = "stylesheet";
      link.href = href;
      document.head.appendChild(link);
      document.body.style.fontFamily = stack;
    }

    return () => {
      for (const name of Object.keys(vars)) root.style.removeProperty(name);
      if (link) {
        link.remove();
        document.body.style.fontFamily = "";
      }
    };
  }, [primary, accent, font]);
}
