import { supabase } from "@/lib/supabase/client";

export type StaffContext = {
  staffId: string;
  shopId: string;
  role: string;
  locationToken: string;
};

/** Looks up the staff_members row linked to the signed-in auth user. */
export async function fetchCurrentStaffContext(): Promise<StaffContext | null> {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const user = session?.user;
  if (!user) return null;

  const { data } = await supabase
    .from("staff_members")
    .select("id, shop_id, role, location_token")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (!data) return null;

  return {
    staffId: data.id,
    shopId: data.shop_id,
    role: data.role,
    locationToken: data.location_token,
  };
}

/** Reads the `session_id` claim out of a Supabase access token (JWT) —
 * used right after login to tell the server which session to keep. */
function decodeSessionId(accessToken: string): string | null {
  try {
    const base64 = accessToken.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=");
    const payload = JSON.parse(atob(padded));
    return typeof payload.session_id === "string" ? payload.session_id : null;
  } catch {
    return null;
  }
}

/** Resolves a username to its login email, then signs in with password.
 * Only one device may be logged into a staff account at a time — right
 * after a successful sign-in, this kills every other session for that
 * user, so a technician logging in on a new phone signs the old one out. */
export async function signInWithUsername(username: string, password: string) {
  const { data: email, error: rpcError } = await supabase.rpc("resolve_staff_email", {
    p_username: username,
  });

  if (rpcError || !email) {
    throw new Error("Invalid username or password.");
  }

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    throw new Error("Invalid username or password.");
  }

  const sessionId = data.session ? decodeSessionId(data.session.access_token) : null;
  if (sessionId) {
    await supabase.rpc("enforce_single_staff_session", { p_keep_session_id: sessionId });
  }
}
