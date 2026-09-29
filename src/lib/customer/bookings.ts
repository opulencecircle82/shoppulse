import { supabase } from "@/lib/supabase/client";
import { compressImage } from "@/lib/shared/imageCompress";
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
  /** Technicians are on call for emergencies while the shop is closed. */
  night_shift_enabled: boolean;
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

/** Sends the booking request and returns its ticket id. */
export async function submitBooking(params: {
  shopSlug: string;
  fullName: string;
  email: string;
  phone: string;
  serviceType: string;
  serviceAddress: string;
  preferredDate?: string | null;
  /** The hour picked for a scheduled request, "HH:MM:SS". Needs preferredDate. */
  preferredTime?: string | null;
  description?: string;
  requestPhotoUrl?: string | null;
  isEmergency?: boolean;
  latitude?: number | null;
  longitude?: number | null;
  promotionId?: string | null;
  /** Set when the customer found this shop through a specific branch card — null books the Main Branch. */
  branchId?: string | null;
}): Promise<string> {
  const { data, error } = await supabase.rpc("submit_job_booking", {
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
    p_promotion_id: params.promotionId || null,
    p_preferred_time: params.preferredTime || null,
    p_branch_id: params.branchId || null,
  });

  if (error) throw new Error(error.message);
  // The new request's id, so the confirmation screen can link straight to its status.
  return data as string;
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

/** Booking-request and review photos reuse the "job-photos" bucket (its
 * INSERT policy already allows any signed-in user). Proof of payment goes to
 * its own "payment-receipts" bucket so screenshots of bank transfers are kept
 * apart from job photos. */
export async function uploadCustomerPhoto(
  folder: "requests" | "reviews" | "receipts",
  file: File
): Promise<string> {
  // Shrunk on the phone first — a camera photo is several megabytes, the server only needs to show it.
  // Receipts are mostly text, so they keep a little more detail.
  const body = await compressImage(
    file,
    folder === "receipts" ? { maxEdge: 1280, quality: 0.75 } : { maxEdge: 1024, quality: 0.68 }
  );
  const shrunk = body !== file;
  const extension = shrunk ? "jpg" : (file.name.split(".").pop() ?? "jpg");
  const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2)}.${extension}`;

  const bucket = folder === "receipts" ? "payment-receipts" : "job-photos";

  const { error } = await supabase.storage
    .from(bucket)
    .upload(path, body, { contentType: shrunk ? "image/jpeg" : file.type || "image/jpeg" });

  if (error) throw error;

  const {
    data: { publicUrl },
  } = supabase.storage.from(bucket).getPublicUrl(path);

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
  date: string,
  branchId?: string | null
): Promise<DateAvailability | null> {
  const { data, error } = await supabase
    .rpc("check_date_availability", { p_shop_slug: shopSlug, p_date: date, p_branch_id: branchId || null })
    .maybeSingle();

  if (error) throw error;
  return data as DateAvailability | null;
}

export type SlotAvailability = {
  slot: string;
  booked_count: number;
  capacity: number;
  is_business_day: boolean;
};

/** For every hour of the day: how many requests already hold it and how many the shop can take at once
 * (its active technicians, at least one). A slot is vacant while booked_count < capacity. */
export async function getSlotAvailability(
  shopSlug: string,
  date: string,
  branchId?: string | null
): Promise<SlotAvailability[]> {
  const { data, error } = await supabase.rpc("get_slot_availability", {
    p_shop_slug: shopSlug,
    p_date: date,
    p_branch_id: branchId || null,
  });
  if (error) throw error;
  return (data ?? []) as SlotAvailability[];
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

export type TicketWaitEstimate = {
  /** Every one of the shop's technicians is currently busy on another job — only ever true while this
   * ticket is still PENDING/UNASSIGNED (unset once someone is assigned to it). */
  allBusy: boolean;
  /** Roughly when a technician should free up, from the shop's own history of how long a job usually
   * takes — null when there isn't enough to go on (e.g. every technician has been deactivated). */
  estimatedAvailableAt: string | null;
};

export async function fetchTicketWaitEstimate(ticketId: string): Promise<TicketWaitEstimate> {
  const { data, error } = await supabase
    .rpc("get_ticket_wait_estimate", { p_ticket_id: ticketId })
    .maybeSingle();
  if (error) throw error;
  const row = data as { all_busy: boolean; estimated_available_at: string | null } | null;
  return { allBusy: row?.all_busy === true, estimatedAvailableAt: row?.estimated_available_at ?? null };
}

export type NearbyPromotion = {
  id: string;
  title: string;
  description: string | null;
  discount_percent: number | null;
  image_url: string | null;
  shop_name: string;
  shop_slug: string;
  shop_city: string | null;
  shop_logo_url: string | null;
  shop_category: string | null;
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

/** distance_km is null for a business that hasn't pinned its location but is in the customer's area.
 * website_header_url is the cover photo from the shop's own site, when it has uploaded one — the "Services
 * Near You" cards fall back to a stock photo for the category (`stockPhotoForCategory`) when it hasn't. */
export type NearbyShop = PublicShop & {
  website_header_url: string | null;
  distance_km: number | null;
  /** Set when this row is a branch location rather than the shop's Main Branch. */
  branch_id: string | null;
};

/** A branch's own public-facing address/hours, shown in place of the shop's Main Branch details when the
 * customer came from a branch's own card — the business name and reviews still belong to the shop as a whole. */
export type PublicBranch = {
  id: string;
  shop_id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  contact_phone: string | null;
  business_hours_open: string | null;
  business_hours_close: string | null;
  business_days: string[];
};

export async function fetchPublicBranch(branchId: string): Promise<PublicBranch | null> {
  const { data, error } = await supabase.rpc("get_public_branch", { p_branch_id: branchId }).maybeSingle();
  if (error) throw error;
  return data as PublicBranch | null;
}

/** Publicly listed businesses within radiusKm of the customer's pin, nearest first — whether or not they have
 * added services — followed by businesses that haven't pinned a location yet but are in the customer's city
 * (or, when they have no city either, region). */
export async function listNearbyShops(params: {
  lat: number | null;
  lng: number | null;
  city: string | null;
  region: string | null;
  radiusKm?: number;
}): Promise<NearbyShop[]> {
  const { data, error } = await supabase.rpc("list_nearby_shops", {
    p_lat: params.lat,
    p_lng: params.lng,
    p_radius_km: params.radiusKm ?? 20,
    p_limit: 20,
    p_city: params.city,
    p_region: params.region,
  });
  if (error) throw error;
  return (data ?? []) as NearbyShop[];
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

/** An explicit "I've paid" from the client — distinct from the optional
 * receipt upload, since a cash payment has no screenshot to attach.
 * Notifies the shop's owner(s) so they know to verify and confirm it,
 * which is what actually unlocks the technician's signature step. */
export async function confirmClientPayment(ticketId: string) {
  const { error } = await supabase.rpc("client_confirm_payment", {
    p_ticket_id: ticketId,
  });
  if (error) throw new Error(error.message);
}

/** Where this shop wants to be paid (bank, PayPal, QR, instructions). */
export type TicketPaymentInfo = {
  bank_name: string | null;
  bank_account_name: string | null;
  bank_account_number: string | null;
  paypal_email: string | null;
  payment_qr_url: string | null;
  payment_instructions: string | null;
};

/** Only answers once the job is under way, and only for that one job's shop. */
export async function fetchTicketPaymentInfo(
  ticketId: string
): Promise<TicketPaymentInfo | null> {
  const { data, error } = await supabase
    .rpc("get_ticket_payment_info", { p_ticket_id: ticketId })
    .maybeSingle();
  if (error) throw error;
  return data as TicketPaymentInfo | null;
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
