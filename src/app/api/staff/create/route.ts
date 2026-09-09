import { supabaseAdmin } from "@/lib/supabase/admin";

export async function POST(request: Request) {
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
    .select("shop_id, role")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (requesterError || !requester) {
    return Response.json({ error: "Staff record not found." }, { status: 403 });
  }

  if (requester.role !== "OWNER" && requester.role !== "MANAGER") {
    return Response.json(
      { error: "Only the owner or a manager can add staff." },
      { status: 403 }
    );
  }

  const body = await request.json();
  const { username, fullName, email, phone, password, hourlyRate } = body as {
    username?: string;
    fullName?: string;
    email?: string;
    phone?: string | null;
    password?: string;
    hourlyRate?: number;
  };

  if (!username || !fullName || !email || !password) {
    return Response.json(
      { error: "Username, full name, email, and password are required." },
      { status: 400 }
    );
  }

  if (password.length < 8) {
    return Response.json(
      { error: "Password must be at least 8 characters." },
      { status: 400 }
    );
  }

  const { data: existingUsername } = await supabaseAdmin
    .from("staff_members")
    .select("id")
    .eq("username", username)
    .maybeSingle();

  if (existingUsername) {
    return Response.json({ error: "That username is already taken." }, { status: 409 });
  }

  const { data: newAuthUser, error: createUserError } =
    await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName },
    });

  if (createUserError || !newAuthUser.user) {
    return Response.json(
      { error: createUserError?.message ?? "Failed to create login for staff." },
      { status: 400 }
    );
  }

  const { data: staffRow, error: insertError } = await supabaseAdmin
    .from("staff_members")
    .insert({
      shop_id: requester.shop_id,
      auth_user_id: newAuthUser.user.id,
      username,
      full_name: fullName,
      email,
      phone: phone || null,
      hourly_rate: hourlyRate ?? 0,
      role: "TECHNICIAN",
    })
    .select()
    .single();

  if (insertError) {
    await supabaseAdmin.auth.admin.deleteUser(newAuthUser.user.id);
    return Response.json({ error: insertError.message }, { status: 500 });
  }

  return Response.json({ staff: staffRow });
}
