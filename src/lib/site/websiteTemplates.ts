import type { CSSProperties } from "react";

export type WebsiteTemplateKey =
  | "classic-dark"
  | "clean-light"
  | "midnight-glow"
  | "sunset-bold"
  | "forest"
  | "coffee"
  | "ocean"
  | "rose";

export type WebsiteTemplate = {
  key: WebsiteTemplateKey;
  name: string;
  /** CSS `background` value for the page shell — solid color or gradient. */
  background: string;
  textMode: "light" | "dark";
  defaultPrimary: string;
  defaultAccent: string;
};

export const WEBSITE_TEMPLATES: WebsiteTemplate[] = [
  {
    key: "classic-dark",
    name: "Classic Dark",
    background: "#0F172A",
    textMode: "light",
    defaultPrimary: "#2563EB",
    defaultAccent: "#F97316",
  },
  {
    key: "clean-light",
    name: "Clean Light",
    background: "#F8FAFC",
    textMode: "dark",
    defaultPrimary: "#2563EB",
    defaultAccent: "#0EA5E9",
  },
  {
    key: "midnight-glow",
    name: "Midnight Glow",
    background: "linear-gradient(160deg, #0F172A 0%, #1E3A8A 100%)",
    textMode: "light",
    defaultPrimary: "#1D4ED8",
    defaultAccent: "#38BDF8",
  },
  {
    key: "sunset-bold",
    name: "Sunset Bold",
    background: "linear-gradient(160deg, #4C1D95 0%, #EA580C 100%)",
    textMode: "light",
    defaultPrimary: "#7C3AED",
    defaultAccent: "#FDBA74",
  },
  {
    key: "forest",
    name: "Forest",
    background: "linear-gradient(160deg, #052e16 0%, #14532D 100%)",
    textMode: "light",
    defaultPrimary: "#16A34A",
    defaultAccent: "#84CC16",
  },
  {
    key: "coffee",
    name: "Coffee",
    background: "linear-gradient(160deg, #1C1917 0%, #451A03 100%)",
    textMode: "light",
    defaultPrimary: "#B45309",
    defaultAccent: "#F59E0B",
  },
  {
    key: "ocean",
    name: "Ocean",
    background: "linear-gradient(160deg, #042f2e 0%, #0E7490 100%)",
    textMode: "light",
    defaultPrimary: "#0891B2",
    defaultAccent: "#22D3EE",
  },
  {
    key: "rose",
    name: "Rose",
    background: "linear-gradient(160deg, #1E1B2E 0%, #4C0519 100%)",
    textMode: "light",
    defaultPrimary: "#BE123C",
    defaultAccent: "#FB7185",
  },
];

const DEFAULT_TEMPLATE = WEBSITE_TEMPLATES[0];

export function getWebsiteTemplate(key: string | null | undefined): WebsiteTemplate {
  return WEBSITE_TEMPLATES.find((t) => t.key === key) ?? DEFAULT_TEMPLATE;
}

/** Tailwind class fragments for text that must stay readable against
 * either a light or dark template background. Centralized here so the
 * public site page and the customizer's preview stay in sync. */
export function websiteTextClasses(textMode: "light" | "dark") {
  const isLight = textMode === "light";
  return {
    heading: isLight ? "text-white" : "text-slate-900",
    body: isLight ? "text-slate-300" : "text-slate-600",
    muted: isLight ? "text-slate-400" : "text-slate-500",
    faint: isLight ? "text-slate-500" : "text-slate-400",
    border: isLight ? "border-white/10" : "border-slate-200",
    card: isLight ? "bg-white/5" : "bg-slate-100",
  };
}

export const WEBSITE_FONT_OPTIONS = [
  "Inter",
  "Roboto",
  "Poppins",
  "Montserrat",
  "Nunito",
  "Lato",
  "Open Sans",
] as const;

export type WebsiteButtonStyleKey = "flat" | "3d" | "neon" | "glass" | "pill";

export const WEBSITE_BUTTON_STYLES: { key: WebsiteButtonStyleKey; name: string }[] = [
  { key: "flat", name: "Flat" },
  { key: "3d", name: "3D" },
  { key: "neon", name: "Neon" },
  { key: "glass", name: "Glass" },
  { key: "pill", name: "Pill" },
];

function relLuminance(hex: string): number {
  const channels = [hex.slice(1, 3), hex.slice(3, 5), hex.slice(5, 7)].map((h) => {
    const v = parseInt(h, 16) / 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  const [r, g, b] = channels;
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG-style contrast ratio between two hex colors (1 = identical,
 * 21 = max black/white contrast). Used to warn when a chosen button
 * color would make the (usually white) button text hard to read. */
export function contrastRatio(hex1: string, hex2: string): number {
  const l1 = relLuminance(hex1);
  const l2 = relLuminance(hex2);
  const [hi, lo] = l1 > l2 ? [l1, l2] : [l2, l1];
  return (hi + 0.05) / (lo + 0.05);
}

/** Returns the className + inline style for the "Book Now" button,
 * shared between the real /site/[slug] page and the customizer's live
 * preview so they can never drift apart. */
export function getButtonStyleProps(
  styleKey: string | null | undefined,
  primary: string,
  accent: string
): { className: string; style: CSSProperties } {
  switch (styleKey) {
    case "flat":
      return {
        className: "rounded-lg font-bold text-white transition-opacity hover:opacity-90",
        style: { backgroundColor: primary },
      };
    case "neon":
      return {
        className:
          "rounded-full border-2 bg-transparent font-bold transition-shadow hover:brightness-110",
        style: {
          borderColor: accent,
          color: accent,
          boxShadow: `0 0 12px ${accent}, 0 0 28px ${accent}66, inset 0 0 12px ${accent}33`,
          textShadow: `0 0 8px ${accent}99`,
        },
      };
    case "glass":
      return {
        className:
          "rounded-2xl border font-bold text-white backdrop-blur-md transition-colors hover:bg-white/20",
        style: {
          backgroundColor: `${primary}33`,
          borderColor: `${accent}66`,
        },
      };
    case "pill":
      return {
        className: "rounded-full font-bold text-white transition-opacity hover:opacity-90",
        style: { backgroundColor: accent },
      };
    case "3d":
    default:
      return {
        className:
          "rounded-full font-bold text-white transition-shadow hover:brightness-110",
        style: {
          backgroundImage: `linear-gradient(to right, ${primary}, ${accent})`,
          boxShadow: `0 8px 25px -5px ${primary}99`,
        },
      };
  }
}
