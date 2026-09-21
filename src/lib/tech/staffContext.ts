import { supabase } from "@/lib/supabase/client";

export type StaffContext = {
  staffId: string;
  shopId: string;
  role: string;
  locationToken: string;
  fullName: string;
  email: string;
  phone: string | null;
  avatarUrl: string | null;
  isClockedIn: boolean;
};

export const SESSION_TIMEOUT_MS = 8000;

/** Races a promise against a timeout so a stalled Supabase call can't leave
 * the app stuck on a screen forever. */
export function withTimeout<T>(promise: PromiseLike<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("timed out")), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      }
    );
  });
}

/** Supabase's internal session lock can deadlock forever if a previous
 * refresh attempt never settled — e.g. the app was backgrounded mid-refresh,
 * or the staff account behind the session was deleted — and every later
 * getSession() call then hangs too. Clearing the raw storage key breaks the
 * app out of that state so the next load falls through to the login screen
 * instead of spinning forever. */
export function clearStaleLocalSession() {
  try {
    for (const key of Object.keys(localStorage)) {
      if (key.startsWith("sb-") && key.endsWith("-auth-token")) {
        localStorage.removeItem(key);
      }
    }
  } catch {
    // localStorage unavailable (e.g. private mode) — nothing to clear
  }
}

/** Looks up the staff_members row linked to the signed-in auth user. */
export async function fetchCurrentStaffContext(): Promise<StaffContext | null> {
  let session;
  try {
    const result = await withTimeout(supabase.auth.getSession(), SESSION_TIMEOUT_MS);
    session = result.data.session;
  } catch {
    clearStaleLocalSession();
    return null;
  }

  const user = session?.user;
  if (!user) return null;

  try {
    const { data } = await withTimeout(
      supabase
        .from("staff_members")
        .select(
          "id, shop_id, role, location_token, full_name, email, phone, avatar_url, is_clocked_in"
        )
        .eq("auth_user_id", user.id)
        .maybeSingle(),
      SESSION_TIMEOUT_MS
    );

    if (!data) return null;

    return {
      staffId: data.id,
      shopId: data.shop_id,
      role: data.role,
      locationToken: data.location_token,
      fullName: data.full_name,
      email: data.email,
      phone: data.phone,
      avatarUrl: data.avatar_url,
      isClockedIn: data.is_clocked_in,
    };
  } catch {
    clearStaleLocalSession();
    return null;
  }
}

/** Marks the signed-in technician as clocked in / out for their shift. */
export async function clockIn() {
  const { error } = await supabase.rpc("clock_in");
  if (error) throw new Error(error.message);
}

export async function clockOut() {
  const { error } = await supabase.rpc("clock_out");
  if (error) throw new Error(error.message);
}

/** Uploads a new profile photo for the signed-in technician and returns its
 * public URL. */
export async function uploadStaffAvatar(staffId: string, file: File): Promise<string> {
  const extension = file.name.split(".").pop() ?? "jpg";
  const path = `${staffId}/avatar-${Date.now()}.${extension}`;

  const { error: uploadError } = await supabase.storage
    .from("staff-avatars")
    .upload(path, file, { contentType: file.type || "image/jpeg" });
  if (uploadError) throw new Error(uploadError.message);

  const {
    data: { publicUrl },
  } = supabase.storage.from("staff-avatars").getPublicUrl(path);

  const { error: rpcError } = await supabase.rpc("update_staff_avatar", {
    p_avatar_url: publicUrl,
  });
  if (rpcError) throw new Error(rpcError.message);

  return publicUrl;
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
