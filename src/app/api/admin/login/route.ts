import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import { supabaseAdmin } from "@/lib/supabase/admin";
import {
  createSessionCookieValue,
  SESSION_COOKIE_NAME,
  SESSION_TTL_SECONDS,
} from "@/lib/admin/session";

export async function POST(request: Request) {
  const { username, password } = (await request.json()) as {
    username?: string;
    password?: string;
  };

  if (!username || !password) {
    return Response.json(
      { error: "Username and password are required." },
      { status: 400 }
    );
  }

  const { data: admin } = await supabaseAdmin
    .from("admin_users")
    .select("username, password_hash")
    .eq("username", username)
    .maybeSingle();

  if (!admin) {
    await bcrypt.compare(password, "$2b$10$invalidinvalidinvalidinvalidinvalidinva");
    return Response.json({ error: "Invalid credentials." }, { status: 401 });
  }

  const valid = await bcrypt.compare(password, admin.password_hash);
  if (!valid) {
    return Response.json({ error: "Invalid credentials." }, { status: 401 });
  }

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, createSessionCookieValue(admin.username), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });

  return Response.json({ ok: true });
}
