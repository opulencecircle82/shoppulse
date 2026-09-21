import { supabase } from "@/lib/supabase/client";
import type { JobTicket } from "@/lib/supabase/types";

/** RLS (client_email = current_customer_email()) scopes this to the
 * signed-in customer's own tickets across every shop automatically. */
export async function fetchMyJobs(): Promise<JobTicket[]> {
  const { data, error } = await supabase
    .from("job_tickets")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as JobTicket[];
}

export type BookingShop = {
  id: string;
  shop_name: string;
  slug: string;
  logo_url: string | null;
  city: string | null;
  business_category: string | null;
  business_hours_open: string | null;
  business_hours_close: string | null;
  business_days: string[];
  latitude: number | null;
  longitude: number | null;
  avg_rating: number | null;
  review_count: number;
  default_hourly_rate: number;
  currency: string;
  accepted_payment_methods: string[];
  website_header_url: string | null;
  primary_color_hex: string;
  accent_color_hex: string;
  website_template: string;
  website_font_family: string;
  website_font_scale: number;
  website_button_style: string;
  address: string | null;
  website_bg_color: string | null;
  website_card_color: string;
  website_text_color: string;
  website_heading_color: string;
  website_price_color: string;
  website_muted_color: string;
  website_headline: string | null;
  website_subheadline: string | null;
};

/** Uses a SECURITY DEFINER RPC rather than a direct table select — the
 * only RLS policy on shops is staff-only, so a real (non-staff) customer
 * would otherwise get nothing back here regardless of a shop's
 * is_publicly_listed setting (direct-link access always works). */
export async function fetchShopBySlug(slug: string): Promise<BookingShop | null> {
  const { data, error } = await supabase
    .rpc("get_public_shop_by_slug", { p_slug: slug })
    .maybeSingle();

  if (error) throw error;
  return data as BookingShop | null;
}

export type PublicShop = {
  id: string;
  shop_name: string;
  slug: string;
  logo_url: string | null;
  city: string | null;
  business_category: string | null;
  business_hours_open: string | null;
  business_hours_close: string | null;
  business_days: string[];
  avg_rating: number | null;
  review_count: number;
};

/** Powers the "browse services near your city" listing. Only returns
 * shops that opted into the public directory (is_publicly_listed). */
export async function listPublicShops(params?: {
  city?: string;
  category?: string;
  search?: string;
}): Promise<PublicShop[]> {
  const { data, error } = await supabase.rpc("list_public_shops", {
    p_city: params?.city || null,
    p_category: params?.category || null,
    p_search: params?.search || null,
  });

  if (error) throw error;
  return (data ?? []) as PublicShop[];
}

/** Populates the category dropdown on the discover page from real data
 * rather than a hardcoded list that could drift from what owners type
 * into Company Profile. */
export async function listPublicShopCategories(): Promise<string[]> {
  const { data, error } = await supabase.rpc("list_public_shop_categories");
  if (error) throw error;
  return ((data ?? []) as { business_category: string }[]).map(
    (row) => row.business_category
  );
}

const DAY_CODES = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];

type ShopHours = {
  business_hours_open: string | null;
  business_hours_close: string | null;
  business_days: string[];
};

/** Compares against the customer's local device clock — shop and
 * customer are assumed to share a timezone for a local service business,
 * so no server-side timezone handling is needed for this. */
export function isShopOpenNow(shop: ShopHours): boolean {
  if (!shop.business_hours_open || !shop.business_hours_close) return false;

  const now = new Date();
  const today = DAY_CODES[now.getDay()];
  if (!shop.business_days.includes(today)) return false;

  const nowMinutes = now.getHours() * 60 + now.getMinutes();

  const [openH, openM] = shop.business_hours_open.split(":").map(Number);
  const [closeH, closeM] = shop.business_hours_close.split(":").map(Number);
  const openMinutes = openH * 60 + openM;
  const closeMinutes = closeH * 60 + closeM;

  return nowMinutes >= openMinutes && nowMinutes < closeMinutes;
}

export async function submitBooking(params: {
  shopSlug: string;
  fullName: string;
  email: string;
  phone: string;
  serviceType: string;
  serviceAddress: string;
  preferredDate?: string | null;
  description?: string;
  requestPhotoUrl?: string | null;
  isEmergency?: boolean;
  latitude?: number | null;
  longitude?: number | null;
}) {
  const { error } = await supabase.rpc("submit_job_booking", {
    p_shop_slug: params.shopSlug,
    p_client_name: params.fullName,
    p_client_email: params.email,
    p_client_phone: params.phone || null,
    p_service_type: params.serviceType,
    p_service_address: params.serviceAddress,
    p_preferred_date: params.preferredDate || null,
    p_description: params.description || null,
    p_request_photo_url: params.requestPhotoUrl || null,
    p_is_emergency: params.isEmergency || false,
    p_latitude: params.latitude ?? null,
    p_longitude: params.longitude ?? null,
  });

  if (error) throw new Error(error.message);
}

/** Free before a technician arrives on-site; once they've arrived
 * (status ESTIMATE_PENDING) the shop's standard call-out fee applies
 * automatically — the caller doesn't choose that, it's enforced
 * server-side by client_cancel_booking. */
export async function cancelBooking(ticketId: string, reason?: string) {
  const { error } = await supabase.rpc("client_cancel_booking", {
    p_ticket_id: ticketId,
    p_reason: reason || null,
  });
  if (error) throw new Error(error.message);
}

/** Reuses the "job-photos" storage bucket (its INSERT policy already
 * allows any authenticated user, not just staff) rather than a new
 * bucket, for both the customer's booking-request photo and their
 * review photo. */
export async function uploadCustomerPhoto(
  folder: "requests" | "reviews" | "receipts",
  file: File
): Promise<string> {
  const extension = file.name.split(".").pop() ?? "jpg";
  const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2)}.${extension}`;

  const { error } = await supabase.storage
    .from("job-photos")
    .upload(path, file, { contentType: file.type || "image/jpeg" });

  if (error) throw error;

  const {
    data: { publicUrl },
  } = supabase.storage.from("job-photos").getPublicUrl(path);

  return publicUrl;
}

export type DateAvailability = {
  is_business_day: boolean;
  active_staff_count: number;
  booked_count: number;
};

/** A soft signal only — the shop can still accept the request even when
 * this looks fully booked, since it's not a hard capacity reservation. */
export async function checkDateAvailability(
  shopSlug: string,
  date: string
): Promise<DateAvailability | null> {
  const { data, error } = await supabase
    .rpc("check_date_availability", { p_shop_slug: shopSlug, p_date: date })
    .maybeSingle();

  if (error) throw error;
  return data as DateAvailability | null;
}

export type ShopReview = {
  rating: number;
  comment: string | null;
  photo_url: string | null;
  created_at: string;
  client_name: string;
};

export async function listShopReviews(shopId: string): Promise<ShopReview[]> {
  const { data, error } = await supabase.rpc("list_shop_reviews", { p_shop_id: shopId });
  if (error) throw error;
  return (data ?? []) as ShopReview[];
}

export async function submitShopReview(params: {
  ticketId: string;
  rating: number;
  comment?: string;
  photoUrl?: string | null;
}) {
  const { error } = await supabase.rpc("submit_shop_review", {
    p_ticket_id: params.ticketId,
    p_rating: params.rating,
    p_comment: params.comment || null,
    p_photo_url: params.photoUrl || null,
  });
  if (error) throw new Error(error.message);
}

export async function fetchTicketReview(
  ticketId: string
): Promise<{ rating: number; comment: string | null; photo_url: string | null } | null> {
  const { data, error } = await supabase
    .rpc("get_ticket_review", { p_ticket_id: ticketId })
    .maybeSingle();
  if (error) throw error;
  return data as { rating: number; comment: string | null; photo_url: string | null } | null;
}

export async function fetchTicketStaffLocation(
  ticketId: string
): Promise<{ lat: number; lng: number; updated_at: string } | null> {
  const { data, error } = await supabase
    .rpc("get_ticket_staff_location", { p_ticket_id: ticketId })
    .maybeSingle();
  if (error) throw error;
  return data as { lat: number; lng: number; updated_at: string } | null;
}

export type NearbyPromotion = {
  id: string;
  title: string;
  description: string | null;
  discount_code: string | null;
  image_url: string | null;
  shop_name: string;
  shop_slug: string;
  shop_city: string | null;
};

export async function listNearbyPromotions(city?: string | null): Promise<NearbyPromotion[]> {
  const { data, error } = await supabase.rpc("list_nearby_promotions", {
    p_city: city || null,
  });
  if (error) throw error;
  return (data ?? []) as NearbyPromotion[];
}

/** Fire-and-forget — a failed engagement ping shouldn't block browsing. */
export function recordPromotionEvent(promotionId: string, eventType: "view" | "click") {
  supabase
    .rpc("record_promotion_event", { p_promotion_id: promotionId, p_event_type: eventType })
    .then(() => {});
}

export type PublicService = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  extra_cost: number;
};

export async function listPublicShopServices(shopId: string): Promise<PublicService[]> {
  const { data, error } = await supabase.rpc("list_shop_services", { p_shop_id: shopId });
  if (error) throw error;
  return (data ?? []) as PublicService[];
}

export type PublicProduct = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  photo_url: string | null;
  category: string | null;
};

export async function listPublicShopProducts(shopId: string): Promise<PublicProduct[]> {
  const { data, error } = await supabase.rpc("list_shop_products", { p_shop_id: shopId });
  if (error) throw error;
  return (data ?? []) as PublicProduct[];
}

export type FeaturedService = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  shop_name: string;
  shop_slug: string;
  shop_logo_url: string | null;
  avg_rating: number | null;
  review_count: number;
};

export async function listFeaturedServices(city?: string | null): Promise<FeaturedService[]> {
  const { data, error } = await supabase.rpc("list_featured_services", {
    p_city: city || null,
    p_limit: 6,
  });
  if (error) throw error;
  return (data ?? []) as FeaturedService[];
}

export type NearbyService = FeaturedService & { distance_km: number };

/** Distance-based (not just same-city) — only returns services from shops
 * with a pinned location, within p_radiusKm of the customer's own pin. */
export async function listNearbyShopServices(
  lat: number,
  lng: number,
  radiusKm = 20
): Promise<NearbyService[]> {
  const { data, error } = await supabase.rpc("list_nearby_shop_services", {
    p_lat: lat,
    p_lng: lng,
    p_radius_km: radiusKm,
    p_limit: 20,
  });
  if (error) throw error;
  return (data ?? []) as NearbyService[];
}

export type TicketTechnician = {
  full_name: string;
  avg_rating: number | null;
  review_count: number;
};

/** Lets the client attach a screenshot/photo of their payment (e.g. a
 * bank transfer confirmation) so the owner can review it before marking
 * the job's invoice as paid. */
export async function uploadPaymentReceipt(ticketId: string, receiptUrl: string) {
  const { error } = await supabase.rpc("client_upload_payment_receipt", {
    p_ticket_id: ticketId,
    p_receipt_url: receiptUrl,
  });
  if (error) throw new Error(error.message);
}

export async function fetchTicketTechnician(
  ticketId: string
): Promise<TicketTechnician | null> {
  const { data, error } = await supabase
    .rpc("get_ticket_technician", { p_ticket_id: ticketId })
    .maybeSingle();
  if (error) throw error;
  return data as TicketTechnician | null;
}
