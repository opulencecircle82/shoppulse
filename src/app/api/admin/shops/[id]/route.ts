import { supabaseAdmin } from "@/lib/supabase/admin";
import { getAdminSession } from "@/lib/admin/session";

/**
 * Developer-console switches for one shop. Today: unlimited technician seats, for test and demo accounts —
 * an owner can't set it on their own shop (the database ignores changes to it from anyone but this service).
 */
export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const session = await getAdminSession();
  if (!session) {
    return Response.json({ error: "Not authenticated." }, { status: 401 });
  }

  const { id } = await context.params;
  const body = (await request.json().catch(() => ({}))) as { unlimitedTechSeats?: unknown };
  if (typeof body.unlimitedTechSeats !== "boolean") {
    return Response.json({ error: "unlimitedTechSeats must be true or false." }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("shops")
    .update({ unlimited_tech_seats: body.unlimitedTechSeats })
    .eq("id", id)
    .select("id, unlimited_tech_seats")
    .maybeSingle();

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
  if (!data) {
    return Response.json({ error: "Account not found." }, { status: 404 });
  }

  return Response.json({ shop: data });
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const session = await getAdminSession();
  if (!session) {
    return Response.json({ error: "Not authenticated." }, { status: 401 });
  }

  const { id } = await context.params;

  const { data: staff } = await supabaseAdmin
    .from("staff_members")
    .select("auth_user_id")
    .eq("shop_id", id);

  const { error: deleteShopError } = await supabaseAdmin
    .from("shops")
    .delete()
    .eq("id", id);

  if (deleteShopError) {
    return Response.json({ error: deleteShopError.message }, { status: 500 });
  }

  const authUserIds = (staff ?? [])
    .map((row) => row.auth_user_id)
    .filter((value): value is string => Boolean(value));

  const authDeleteErrors: string[] = [];
  for (const authUserId of authUserIds) {
    const { error } = await supabaseAdmin.auth.admin.deleteUser(authUserId);
    if (error) authDeleteErrors.push(error.message);
  }

  return Response.json({ ok: true, authDeleteErrors });
}
