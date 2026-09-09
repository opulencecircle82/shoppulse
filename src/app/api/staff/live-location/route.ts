import { supabaseAdmin } from "@/lib/supabase/admin";

/**
 * Authenticated by a per-staff `location_token` (see staff_members),
 * not a normal Supabase session — this is what the native Android
 * background location service posts to, and that service has no way to
 * refresh an expiring Supabase JWT on its own. The token is long-lived
 * and scoped to nothing but writing this staff member's live location.
 */
export async function POST(request: Request) {
  const body = await request.json();
  const { token, lat, lng, accuracy } = body as {
    token?: string;
    lat?: number;
    lng?: number;
    accuracy?: number | null;
  };

  if (!token || typeof lat !== "number" || typeof lng !== "number") {
    return Response.json({ error: "Missing token, lat, or lng." }, { status: 400 });
  }

  const { data: staff, error: staffError } = await supabaseAdmin
    .from("staff_members")
    .select("id, shop_id")
    .eq("location_token", token)
    .maybeSingle();

  if (staffError || !staff) {
    return Response.json({ error: "Invalid token." }, { status: 401 });
  }

  const { error: upsertError } = await supabaseAdmin
    .from("staff_live_locations")
    .upsert({
      staff_id: staff.id,
      shop_id: staff.shop_id,
      lat,
      lng,
      accuracy: accuracy ?? null,
      updated_at: new Date().toISOString(),
    });

  if (upsertError) {
    return Response.json({ error: upsertError.message }, { status: 500 });
  }

  return Response.json({ ok: true });
}
