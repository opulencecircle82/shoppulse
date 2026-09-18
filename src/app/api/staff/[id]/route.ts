import { supabaseAdmin } from "@/lib/supabase/admin";

/** Shared by every handler below: resolves the caller's own staff row from
 * their bearer token and checks they're an OWNER or MANAGER — passwords,
 * deletes, etc. are all owner/manager-only actions on staff in their shop. */
async function requireOwnerOrManager(request: Request) {
  const authHeader = request.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;

  if (!token) {
    return { error: Response.json({ error: "Not authenticated." }, { status: 401 }) };
  }

  const {
    data: { user },
    error: userError,
  } = await supabaseAdmin.auth.getUser(token);

  if (userError || !user) {
    return { error: Response.json({ error: "Not authenticated." }, { status: 401 }) };
  }

  const { data: requester, error: requesterError } = await supabaseAdmin
    .from("staff_members")
    .select("id, shop_id, role")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (requesterError || !requester) {
    return { error: Response.json({ error: "Staff record not found." }, { status: 403 }) };
  }

  if (requester.role !== "OWNER" && requester.role !== "MANAGER") {
    return {
      error: Response.json(
        { error: "Only the owner or a manager can manage staff." },
        { status: 403 }
      ),
    };
  }

  return { requester };
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { requester, error } = await requireOwnerOrManager(request);
  if (error) return error;

  const { id } = await context.params;

  const { data: target, error: targetError } = await supabaseAdmin
    .from("staff_members")
    .select("id, shop_id, auth_user_id")
    .eq("id", id)
    .maybeSingle();

  if (targetError || !target || target.shop_id !== requester.shop_id) {
    return Response.json({ error: "Staff member not found." }, { status: 404 });
  }

  const body = await request.json();
  const { newPassword } = body as { newPassword?: string };

  if (!newPassword) {
    return Response.json({ error: "A new password is required." }, { status: 400 });
  }
  if (newPassword.length < 8) {
    return Response.json(
      { error: "Password must be at least 8 characters." },
      { status: 400 }
    );
  }
  if (!target.auth_user_id) {
    return Response.json(
      { error: "This staff member has no login to reset." },
      { status: 400 }
    );
  }

  const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
    target.auth_user_id,
    { password: newPassword }
  );

  if (updateError) {
    return Response.json({ error: updateError.message }, { status: 400 });
  }

  return Response.json({ ok: true });
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { requester, error } = await requireOwnerOrManager(request);
  if (error) return error;

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
