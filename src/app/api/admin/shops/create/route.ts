import { supabaseAdmin } from "@/lib/supabase/admin";
import { getAdminSession } from "@/lib/admin/session";
import { slugify } from "@/lib/slugify";

export async function POST(request: Request) {
  const session = await getAdminSession();
  if (!session) {
    return Response.json({ error: "Not authenticated." }, { status: 401 });
  }

  const body = await request.json();
  const { shopName, ownerFullName, ownerEmail, ownerPassword, currency } = body as {
    shopName?: string;
    ownerFullName?: string;
    ownerEmail?: string;
    ownerPassword?: string;
    currency?: string;
  };

  if (!shopName || !ownerFullName || !ownerEmail || !ownerPassword) {
    return Response.json(
      { error: "Shop name, owner name, email, and password are required." },
      { status: 400 }
    );
  }

  if (ownerPassword.length < 8) {
    return Response.json(
      { error: "Password must be at least 8 characters." },
      { status: 400 }
    );
  }

  // Creates the owner's login directly with email_confirm: true — skips the
  // normal signup flow entirely (no confirmation email, no self-service
  // sign-in first) so an admin can hand a client working credentials on
  // the spot, e.g. after onboarding them by phone.
  const { data: newAuthUser, error: createUserError } =
    await supabaseAdmin.auth.admin.createUser({
      email: ownerEmail,
      password: ownerPassword,
      email_confirm: true,
      user_metadata: { full_name: ownerFullName },
    });

  if (createUserError || !newAuthUser.user) {
    return Response.json(
      { error: createUserError?.message ?? "Failed to create the owner's login." },
      { status: 400 }
    );
  }

  const { data: shop, error: shopError } = await supabaseAdmin
    .from("shops")
    .insert({
      shop_name: shopName,
      slug: slugify(shopName),
      currency: currency || "USD",
    })
    .select()
    .single();

  if (shopError || !shop) {
    await supabaseAdmin.auth.admin.deleteUser(newAuthUser.user.id);
    return Response.json(
      { error: shopError?.message ?? "Failed to create the shop." },
      { status: 500 }
    );
  }

  const { error: staffError } = await supabaseAdmin.from("staff_members").insert({
    shop_id: shop.id,
    auth_user_id: newAuthUser.user.id,
    full_name: ownerFullName,
    email: ownerEmail,
    role: "OWNER",
  });

  if (staffError) {
    await supabaseAdmin.from("shops").delete().eq("id", shop.id);
    await supabaseAdmin.auth.admin.deleteUser(newAuthUser.user.id);
    return Response.json({ error: staffError.message }, { status: 500 });
  }

  return Response.json({
    shop,
    owner: { email: ownerEmail, password: ownerPassword },
  });
}
