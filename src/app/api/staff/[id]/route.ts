import { supabaseAdmin } from "@/lib/supabase/admin";

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const authHeader = request.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;

  if (!token) {
    return Response.json({ error: "Not authenticated." }, { status: 401 });
  }

  const {
    data: { user },
    error: userError,
  } = await supabaseAdmin.auth.getUser(token);

  if (userError || !user) {
    return Response.json({ error: "Not authenticated." }, { status: 401 });
  }

  const { data: requester, error: requesterError } = await supabaseAdmin
    .from("staff_members")
    .select("id, shop_id, role")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (requesterError || !requester) {
    return Response.json({ error: "Staff record not found." }, { status: 403 });
  }

  if (requester.role !== "OWNER" && requester.role !== "MANAGER") {
    return Response.json(
      { error: "Only the owner or a manager can remove staff." },
      { status: 403 }
    );
  }

  const { id } = await context.params;

  const { data: target, error: targetError } = await supabaseAdmin
    .from("staff_members")
    .select("id, shop_id, role, auth_user_id")
    .eq("id", id)
    .maybeSingle();

  if (targetError || !target || target.shop_id !== requester.shop_id) {
    return Response.json({ error: "Staff member not found." }, { status: 404 });
  }

  if (target.role === "OWNER") {
    return Response.json({ error: "The shop owner can't be removed." }, { status: 400 });
  }

  if (target.id === requester.id) {
    return Response.json({ error: "You can't remove your own account." }, { status: 400 });
  }

  const { error: deleteError } = await supabaseAdmin
    .from("staff_members")
    .delete()
    .eq("id", id);

  if (deleteError) {
    return Response.json({ error: deleteError.message }, { status: 500 });
  }

  if (target.auth_user_id) {
    await supabaseAdmin.auth.admin.deleteUser(target.auth_user_id);
  }

  return Response.json({ ok: true });
}
