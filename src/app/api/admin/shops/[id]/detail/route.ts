import { supabaseAdmin } from "@/lib/supabase/admin";
import { getAdminSession } from "@/lib/admin/session";
import type { AdminShopDetail } from "@/lib/admin/shopDetail";

/** One account in full for the developer console: profile, owner, the numbers, reviews and review-removal requests. */
export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const session = await getAdminSession();
  if (!session) {
    return Response.json({ error: "Not authenticated." }, { status: 401 });
  }

  const { id } = await context.params;

  const [profile, owner, overview, reviews, requests] = await Promise.all([
    supabaseAdmin
      .from("shops")
      .select(
        "id, shop_name, slug, address, city, region, country, business_category, contact_phone, currency, is_publicly_listed, latitude, longitude, business_hours_open, business_hours_close, business_days, night_shift_enabled, created_at"
      )
      .eq("id", id)
      .maybeSingle(),
    supabaseAdmin
      .from("staff_members")
      .select("full_name, email, phone")
      .eq("shop_id", id)
      .eq("role", "OWNER")
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle(),
    supabaseAdmin.rpc("admin_shop_overview", { p_shop_id: id }),
    supabaseAdmin
      .from("shop_reviews")
      .select("id, rating, comment, photo_url, created_at, job_tickets(client_name)")
      .eq("shop_id", id)
      .order("created_at", { ascending: false })
      .limit(100),
    supabaseAdmin
      .from("review_deletion_requests")
      .select(
        "id, status, reason, created_at, delete_after, decided_at, decision_note, review_deletion_request_items(id, review_id, rating, comment, client_name, reviewed_at)"
      )
      .eq("shop_id", id)
      .order("created_at", { ascending: false })
      .limit(30),
  ]);

  const failure = [profile.error, owner.error, overview.error, reviews.error, requests.error].find(Boolean);
  if (failure) {
    return Response.json({ error: failure.message }, { status: 500 });
  }
  if (!profile.data) {
    return Response.json({ error: "Account not found." }, { status: 404 });
  }

  const detail: AdminShopDetail = {
    profile: profile.data as AdminShopDetail["profile"],
    owner: owner.data,
    counts: overview.data as AdminShopDetail["counts"],
    reviews: (reviews.data ?? []).map((row) => {
      const ticket = row.job_tickets as { client_name: string } | { client_name: string }[] | null;
      return {
        id: row.id as string,
        rating: row.rating as number,
        comment: row.comment as string | null,
        photo_url: row.photo_url as string | null,
        created_at: row.created_at as string,
        client_name: (Array.isArray(ticket) ? ticket[0]?.client_name : ticket?.client_name) ?? null,
      };
    }),
    removalRequests: (requests.data ?? []) as AdminShopDetail["removalRequests"],
  };

  return Response.json(detail);
}
