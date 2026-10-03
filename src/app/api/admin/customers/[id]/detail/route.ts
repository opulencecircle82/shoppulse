import { supabaseAdmin } from "@/lib/supabase/admin";
import { getAdminSession } from "@/lib/admin/session";
import type { AdminCustomerDetail } from "@/lib/admin/customerDetail";

/** One customer in full for the developer console: their profile and their whole booking history across every shop. */
export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const session = await getAdminSession();
  if (!session) {
    return Response.json({ error: "Not authenticated." }, { status: 401 });
  }

  const { id } = await context.params;

  const { data: profile, error: profileError } = await supabaseAdmin
    .from("customers")
    .select("id, full_name, email, phone, country, region, city, barangay, created_at")
    .eq("id", id)
    .maybeSingle();

  if (profileError) {
    return Response.json({ error: profileError.message }, { status: 500 });
  }
  if (!profile) {
    return Response.json({ error: "Customer not found." }, { status: 404 });
  }

  const { data: bookings, error: bookingsError } = await supabaseAdmin
    .from("job_tickets")
    .select("id, service_type, status, created_at, shops(shop_name)")
    .ilike("client_email", profile.email)
    .order("created_at", { ascending: false });

  if (bookingsError) {
    return Response.json({ error: bookingsError.message }, { status: 500 });
  }

  const detail: AdminCustomerDetail = {
    profile,
    bookings: (bookings ?? []).map((row) => {
      const shop = row.shops as { shop_name: string } | { shop_name: string }[] | null;
      return {
        id: row.id as string,
        shop_name: (Array.isArray(shop) ? shop[0]?.shop_name : shop?.shop_name) ?? "Unknown shop",
        service_type: row.service_type as string,
        status: row.status as string,
        created_at: row.created_at as string,
      };
    }),
  };

  return Response.json(detail);
}
