import { supabaseAdmin } from "@/lib/supabase/admin";
import { getAdminSession } from "@/lib/admin/session";

export async function GET() {
  const session = await getAdminSession();
  if (!session) {
    return Response.json({ error: "Not authenticated." }, { status: 401 });
  }

  const { data, error } = await supabaseAdmin
    .from("shops")
    .select(
      "id, shop_name, slug, currency, created_at, is_verified, has_quality_booster, has_marketing_tier, unlimited_tech_seats, staff_members(id, full_name, email, role, auth_user_id)"
    )
    .order("created_at", { ascending: false });

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  // How many review-removal requests are waiting on each account, so they can be spotted in the list.
  const { data: waiting, error: waitingError } = await supabaseAdmin
    .from("review_deletion_requests")
    .select("shop_id")
    .eq("status", "PENDING");
  if (waitingError) {
    return Response.json({ error: waitingError.message }, { status: 500 });
  }
  const waitingByShop = new Map<string, number>();
  for (const row of waiting ?? []) {
    waitingByShop.set(row.shop_id, (waitingByShop.get(row.shop_id) ?? 0) + 1);
  }

  return Response.json({
    shops: (data ?? []).map((shop) => ({ ...shop, pending_review_requests: waitingByShop.get(shop.id) ?? 0 })),
  });
}
