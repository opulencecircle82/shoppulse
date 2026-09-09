import { supabase } from "@/lib/supabase/client";

export type StaffContext = {
  staffId: string;
  shopId: string;
  role: string;
};

/** Looks up the staff_members row linked to the signed-in auth user. */
export async function fetchCurrentStaffContext(): Promise<StaffContext | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data } = await supabase
    .from("staff_members")
    .select("id, shop_id, role")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (!data) return null;

  return { staffId: data.id, shopId: data.shop_id, role: data.role };
}

/** Resolves a username to its login email, then signs in with password. */
export async function signInWithUsername(username: string, password: string) {
  const { data: email, error: rpcError } = await supabase.rpc("resolve_staff_email", {
    p_username: username,
  });

  if (rpcError || !email) {
    throw new Error("Invalid username or password.");
  }

  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    throw new Error("Invalid username or password.");
  }
}
