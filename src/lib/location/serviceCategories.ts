// A fixed list keeps this consistent with what customers filter by on
// the discover page — free text let typos like "Electricla" silently
// break category matching. Grouped to match the three business types
// ShopPulse markets to (see the landing page's "This SaaS is for"
// section) — picking one here also drives the stock header photo a new
// shop's generated website starts with (see categoryStockPhotos.ts).
// "Other" falls back to a text field for anything not covered here.
export const SERVICE_CATEGORY_GROUPS = [
  {
    group: "Exterior Property Care",
    categories: [
      "Lawn Care & Landscaping",
      "Pressure Washing",
      "Roofing",
      "Tree Services",
      "Gutter & Window Cleaning",
    ],
  },
  {
    group: "Interior Services",
    categories: [
      "House Cleaning",
      "Appliance Repair",
      "Carpet Cleaning",
      "Pest Control",
      "Handyman & Painting",
    ],
  },
  {
    group: "Specialized Trades",
    categories: [
      "Septic Tank & Sewer Pumping",
      "Plumbing",
      "Electrical",
      "HVAC",
      "Pool Maintenance",
      "Restoration Services",
    ],
  },
] as const;

export const SERVICE_CATEGORIES = [
  ...SERVICE_CATEGORY_GROUPS.flatMap((g) => g.categories),
  "Other",
] as const;
