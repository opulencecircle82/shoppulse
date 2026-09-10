// A fixed list keeps this consistent with what customers filter by on
// the discover page — free text let typos like "Electricla" silently
// break category matching. "Other" falls back to a text field for
// anything not covered here.
export const SERVICE_CATEGORIES = [
  "Electrician",
  "Plumbing",
  "HVAC / Aircon Repair",
  "Appliance Repair",
  "Cleaning Services",
  "Pest Control",
  "Landscaping / Lawn Care",
  "Auto Repair",
  "Handyman",
  "Roofing",
  "Painting",
  "Locksmith",
  "Carpentry",
  "Moving Services",
  "Pool Maintenance",
  "Solar Installation",
  "CCTV / Security Systems",
  "Water Refilling / Delivery",
  "Laundry Services",
  "Other",
] as const;
