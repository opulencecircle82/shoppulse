import {
  Bug,
  Droplet,
  Droplets,
  Hammer,
  Home,
  PaintRoller,
  Refrigerator,
  Snowflake,
  Sparkles,
  SprayCan,
  Sprout,
  Store,
  Toilet,
  TreePine,
  Waves,
  Zap,
  type LucideIcon,
} from "lucide-react";

/**
 * One icon + accent color per business category (`SERVICE_CATEGORY_GROUPS` in `serviceCategories.ts`), used
 * anywhere a category needs a quick visual — the customer home's category filter today. "Other" and anything
 * not in the fixed list (an owner's free-text category) fall back to a plain storefront icon.
 */
const CATEGORY_ICON: Record<string, { icon: LucideIcon; color: string }> = {
  "Lawn Care & Landscaping": { icon: Sprout, color: "text-lime-500" },
  "Pressure Washing": { icon: SprayCan, color: "text-brand-sky" },
  Roofing: { icon: Home, color: "text-orange-600" },
  "Tree Services": { icon: TreePine, color: "text-emerald-600" },
  "Gutter & Window Cleaning": { icon: Droplets, color: "text-sky-500" },
  "House Cleaning": { icon: Sparkles, color: "text-fuchsia-500" },
  "Appliance Repair": { icon: Refrigerator, color: "text-slate-500" },
  "Carpet Cleaning": { icon: PaintRoller, color: "text-teal-500" },
  "Pest Control": { icon: Bug, color: "text-rose-500" },
  "Handyman & Painting": { icon: Hammer, color: "text-brand-orange" },
  "Septic Tank & Sewer Pumping": { icon: Toilet, color: "text-stone-500" },
  Plumbing: { icon: Droplet, color: "text-brand-sky" },
  Electrical: { icon: Zap, color: "text-amber-500" },
  "Aircon & Refrigeration": { icon: Snowflake, color: "text-cyan-500" },
  "Pool Maintenance": { icon: Waves, color: "text-blue-500" },
  "Restoration Services": { icon: Hammer, color: "text-amber-600" },
};

const FALLBACK = { icon: Store, color: "text-slate-400" };

export function categoryIcon(category: string | null | undefined): { icon: LucideIcon; color: string } {
  if (!category) return FALLBACK;
  return CATEGORY_ICON[category] ?? FALLBACK;
}
