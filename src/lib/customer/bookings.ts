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
};

/** Powers the "browse services near your city" listing. Only returns
 * shops that opted into the public directory (is_publicly_listed). */
export async function listPublicShops(city?: string): Promise<PublicShop[]> {
  const { data, error } = await supabase.rpc("list_public_shops", {
    p_city: city || null,
  });

  if (error) throw error;
  return (data ?? []) as PublicShop[];
}

export async function submitBooking(params: {
  shopSlug: string;
  fullName: string;
  email: string;
  phone: string;
  serviceType: string;
  serviceAddress: string;
}) {
  const { error } = await supabase.rpc("submit_job_booking", {
    p_shop_slug: params.shopSlug,
    p_client_name: params.fullName,
    p_client_email: params.email,
    p_client_phone: params.phone || null,
    p_service_type: params.serviceType,
    p_service_address: params.serviceAddress,
  });

  if (error) throw new Error(error.message);
}
