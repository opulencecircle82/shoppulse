import { supabaseAdmin } from "@/lib/supabase/admin";
import { getAdminSession } from "@/lib/admin/session";

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
