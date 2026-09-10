import { supabase } from "@/lib/supabase/client";

export type Customer = {
  id: string;
  fullName: string;
  email: string;
  phone: string | null;
};

/**
 * Reads the signed-in customer's profile, auto-creating it on first call
 * if it doesn't exist yet. That covers both cases in one place: when
 * email confirmation is off, signUpCustomer() already has a session and
 * this creates the row right away; when confirmation is required (the
 * common case), signUp() returns no session, so the row can't be created
 * then — it gets created here instead, the first time we see an
 * authenticated session with no matching customers row, which is right
 * after the customer confirms their email and logs in.
 */
export async function fetchCurrentCustomer(): Promise<Customer | null> {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.user) return null;

  const { data } = await supabase
    .from("customers")
    .select("id, full_name, email, phone")
    .eq("auth_user_id", session.user.id)
    .maybeSingle();

  if (data) {
    return { id: data.id, fullName: data.full_name, email: data.email, phone: data.phone };
  }

  const meta = session.user.user_metadata as { full_name?: string; phone?: string };

  const { data: created, error: createError } = await supabase
    .from("customers")
    .insert({
      auth_user_id: session.user.id,
      full_name: meta.full_name ?? session.user.email ?? "Customer",
      email: session.user.email ?? "",
      phone: meta.phone || null,
    })
    .select("id, full_name, email, phone")
    .single();

  if (createError || !created) return null;

  return {
    id: created.id,
    fullName: created.full_name,
    email: created.email,
    phone: created.phone,
  };
}

/**
 * Stashes full name/phone in the auth user's metadata (available at
 * signUp() time even without a session) so fetchCurrentCustomer can use
 * them to create the profile row later, whenever the session actually
 * becomes available.
 */
export async function signUpCustomer(params: {
  fullName: string;
  email: string;
  phone: string;
  password: string;
}): Promise<{ needsEmailConfirmation: boolean }> {
  const { data, error } = await supabase.auth.signUp({
    email: params.email,
    password: params.password,
    options: {
      data: { full_name: params.fullName, phone: params.phone },
    },
  });

  if (error) {
    throw new Error(error.message);
  }

  return { needsEmailConfirmation: !data.session };
}

export async function signInCustomer(email: string, password: string) {
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    throw new Error("Invalid email or password.");
  }
}

export async function signOutCustomer() {
  await supabase.auth.signOut();
}
