export type WebsiteTemplateKey =
  | "classic-dark"
  | "clean-light"
  | "midnight-glow"
  | "sunset-bold";

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
