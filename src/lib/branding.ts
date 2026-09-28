import type { CSSProperties } from "react";

/**
 * An owner's brand colours and font, turned into something the technician app
 * can safely wear.
 *
 * The app is built from a fixed set of colour tokens (orange for the main
 * actions, blue for navigation and links). "Branding" it just means repointing
 * those tokens at the shop's own colours, so every screen picks them up at
 * once and nothing about how the app works changes.
 *
 * An owner can pick any colour — including one that would vanish against the
 * app's background — so each chosen colour is first nudged to a readable
 * lightness (same hue, same richness) before it is used.
 */

/** What a brand-new shop is created with. Treated as "not chosen yet": the app keeps its normal orange and blue. */
export const UNCHOSEN_PRIMARY = "#0F172A";
export const UNCHOSEN_ACCENT = "#10B981";

export const APP_FONT_OPTIONS = [
  "Inter",
  "Roboto",
  "Poppins",
  "Montserrat",
  "Nunito",
  "Lato",
  "Open Sans",
] as const;

/** Stored as "Inter" for every shop that never picked one; the app's own font is used for it. */
export const STANDARD_FONT = "Inter";

type Hsl = { h: number; s: number; l: number };

function parseHex(hex: string): [number, number, number] | null {
  const match = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!match) return null;
  const value = parseInt(match[1], 16);
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
}

function toHsl(hex: string): Hsl | null {
  const rgb = parseHex(hex);
  if (!rgb) return null;
  const [r, g, b] = rgb.map((v) => v / 255);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return { h: 0, s: 0, l };
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h: number;
  if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
  else if (max === g) h = (b - r) / d + 2;
  else h = (r - g) / d + 4;
  return { h: h * 60, s, l };
}

function toHex({ h, s, l }: Hsl): string {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  const [r, g, b] =
    h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
  return (
    "#" +
    [r, g, b]
      .map((v) => Math.round((v + m) * 255).toString(16).padStart(2, "0"))
      .join("")
  );
}

const clamp = (value: number, low: number, high: number) => Math.min(high, Math.max(low, value));

function shade(color: Hsl, lightness: number): string {
  return toHex({ ...color, l: clamp(lightness, 0.12, 0.85) });
}

/**
 * The CSS variables that repoint the app's tokens at the shop's colours.
 * Empty when the shop hasn't chosen colours (or the value isn't a valid hex).
 * Primary drives the orange family, accent drives the blue family.
 */
export function brandVars(primary: string, accent: string): Record<string, string> {
  const vars: Record<string, string> = {};

  const p = primary.toUpperCase() !== UNCHOSEN_PRIMARY ? toHsl(primary) : null;
  if (p) {
    const base = clamp(p.l, 0.42, 0.56);
    vars["--color-brand-orange"] = shade(p, base);
    vars["--color-brand-orange-dark"] = shade(p, base - 0.09);
    vars["--color-amber-400"] = shade(p, base + 0.16);
    vars["--app-primary-ink"] = shade(p, clamp(p.l, 0.27, 0.37));
  }

  const a = accent.toUpperCase() !== UNCHOSEN_ACCENT ? toHsl(accent) : null;
  if (a) {
    const base = clamp(a.l, 0.42, 0.58);
    vars["--color-brand-blue"] = shade(a, base);
    vars["--color-brand-blue-dark"] = shade(a, base - 0.08);
    vars["--color-brand-sky"] = shade(a, base + 0.12);
    vars["--app-accent-ink"] = shade(a, clamp(a.l, 0.3, 0.42));
  }

  return vars;
}

/** The font stack for a chosen font, or null when the app's own font should stay. */
export function appFontStack(family: string | null | undefined): string | null {
  if (!family || family === STANDARD_FONT) return null;
  return (APP_FONT_OPTIONS as readonly string[]).includes(family) ? `'${family}', sans-serif` : null;
}

/** Inline style for a preview phone: same variables and font the real app gets. */
export function brandStyle(primary: string, accent: string, font: string | null | undefined): CSSProperties {
  const style: Record<string, string> = { ...brandVars(primary, accent) };
  const stack = appFontStack(font);
  if (stack) style.fontFamily = stack;
  return style as CSSProperties;
}

/** Google Fonts stylesheet for a chosen font (null for the standard one). */
export function appFontHref(family: string | null | undefined): string | null {
  return appFontStack(family)
    ? `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family as string)}:wght@400;600;700&display=swap`
    : null;
}
