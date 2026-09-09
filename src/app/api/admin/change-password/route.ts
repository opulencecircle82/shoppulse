import bcrypt from "bcryptjs";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getAdminSession } from "@/lib/admin/session";

export async function POST(request: Request) {
  const session = await getAdminSession();
  if (!session) {
    return Response.json({ error: "Not authenticated." }, { status: 401 });
  }

  const { currentPassword, newPassword } = (await request.json()) as {
    currentPassword?: string;
    newPassword?: string;
  };

  if (!currentPassword || !newPassword) {
    return Response.json(
      { error: "Current and new password are required." },
      { status: 400 }
    );
  }

  if (newPassword.length < 8) {
    return Response.json(
      { error: "New password must be at least 8 characters." },
      { status: 400 }
    );
  }

  const { data: admin } = await supabaseAdmin
    .from("admin_users")
    .select("id, password_hash")
    .eq("username", session.username)
    .maybeSingle();

  if (!admin) {
    return Response.json({ error: "Account not found." }, { status: 404 });
  }

  const valid = await bcrypt.compare(currentPassword, admin.password_hash);
  if (!valid) {
    return Response.json(
      { error: "Current password is incorrect." },
      { status: 401 }
    );
  }

  const newHash = await bcrypt.hash(newPassword, 10);
  const { error: updateError } = await supabaseAdmin
    .from("admin_users")
    .update({ password_hash: newHash })
    .eq("id", admin.id);

  if (updateError) {
    return Response.json({ error: updateError.message }, { status: 500 });
  }

  return Response.json({ ok: true });
}
