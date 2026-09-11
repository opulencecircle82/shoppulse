// Free fallback header photos for a shop's public website, used when the
// owner hasn't uploaded their own header yet. Each URL is a verified,
// on-topic photo from Unsplash's CDN (free to hotlink under the Unsplash
// License). Only the categories technicians book most often have a
// hand-matched photo — everything else (including "Other") falls back to
// DEFAULT_STOCK_PHOTO, a neutral "professional at work" shot, rather than
// risk showing something unrelated to the business.
const UNSPLASH = (id: string) =>
  `https://images.unsplash.com/photo-${id}?w=1600&q=80&auto=format&fit=crop`;

export const CATEGORY_STOCK_PHOTOS: Record<string, string> = {
  Electrician: UNSPLASH("1621905251189-08b45d6a269e"),
  Plumbing: UNSPLASH("1585704032915-c3400ca199e7"),
  "HVAC / Aircon Repair": UNSPLASH("1607400201889-565b1ee75f8e"),
  Handyman: UNSPLASH("1504148455328-c376907d081c"),
  "Cleaning Services": UNSPLASH("1581578731548-c64695cc6952"),
};

export const DEFAULT_STOCK_PHOTO = UNSPLASH("1503387762-592deb58ef4e");

export function stockPhotoForCategory(category: string | null): string {
  if (!category) return DEFAULT_STOCK_PHOTO;
  return CATEGORY_STOCK_PHOTOS[category] ?? DEFAULT_STOCK_PHOTO;
}
