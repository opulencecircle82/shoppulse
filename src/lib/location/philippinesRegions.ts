// The 17 official administrative regions of the Philippines — this
// product's primary target market — used to power a real dropdown
// instead of free text. Other countries fall back to a plain text input
// for Region, since a reliable full dataset isn't available for every
// country.
export const PHILIPPINES_REGIONS = [
  "National Capital Region (NCR)",
  "Cordillera Administrative Region (CAR)",
  "Region I – Ilocos Region",
  "Region II – Cagayan Valley",
  "Region III – Central Luzon",
  "Region IV-A – CALABARZON",
  "MIMAROPA Region",
  "Region V – Bicol Region",
  "Region VI – Western Visayas",
  "Region VII – Central Visayas",
  "Region VIII – Eastern Visayas",
  "Region IX – Zamboanga Peninsula",
  "Region X – Northern Mindanao",
  "Region XI – Davao Region",
  "Region XII – SOCCSKSARGEN",
  "Region XIII – Caraga",
  "Bangsamoro Autonomous Region in Muslim Mindanao (BARMM)",
] as const;
