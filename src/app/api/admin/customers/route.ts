import { supabaseAdmin } from "@/lib/supabase/admin";
import { getAdminSession } from "@/lib/admin/session";

/** Every registered customer across all shops, read-only — the developer console's Client Records list. */
export async function GET() {
  const session = await getAdminSession();
  if (!session) {
    return Response.json({ error: "Not authenticated." }, { status: 401 });
  }

  const { data, error } = await supabaseAdmin
    .from("customers")
    .select("id, full_name, email, phone, city, region, country, created_at")
    .order("created_at", { ascending: false });

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  // Booking counts per customer, matched by email the same way the rest of the app links a
  // job ticket back to its customer (there is no customer_id column on job_tickets).
  const { data: tickets, error: ticketsError } = await supabaseAdmin
    .from("job_tickets")
    .select("client_email");
  if (ticketsError) {
    return Response.json({ error: ticketsError.message }, { status: 500 });
  }

  const bookingCountByEmail = new Map<string, number>();
  for (const row of tickets ?? []) {
    const key = row.client_email?.toLowerCase();
    if (!key) continue;
    bookingCountByEmail.set(key, (bookingCountByEmail.get(key) ?? 0) + 1);
  }

  return Response.json({
    customers: (data ?? []).map((customer) => ({
      ...customer,
      booking_count: bookingCountByEmail.get(customer.email.toLowerCase()) ?? 0,
    })),
  });
}
