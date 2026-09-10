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

export async function fetchShopBySlug(slug: string) {
  const { data, error } = await supabase
    .from("shops")
    .select("id, shop_name, slug, logo_url")
    .eq("slug", slug)
    .maybeSingle();

  if (error) throw error;
  return data;
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
