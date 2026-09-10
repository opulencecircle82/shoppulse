import { supabase } from "@/lib/supabase/client";

export type Customer = {
  id: string;
  fullName: string;
  email: string;
  phone: string | null;
};

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

  if (!data) return null;

  return { id: data.id, fullName: data.full_name, email: data.email, phone: data.phone };
}

export async function signUpCustomer(params: {
  fullName: string;
  email: string;
  phone: string;
  password: string;
}) {
  const { data, error } = await supabase.auth.signUp({
    email: params.email,
    password: params.password,
  });

  if (error || !data.user) {
    throw new Error(error?.message ?? "Could not create account.");
  }

  const { error: profileError } = await supabase.from("customers").insert({
    auth_user_id: data.user.id,
    full_name: params.fullName,
    email: params.email,
    phone: params.phone || null,
  });

  if (profileError) {
    throw new Error(profileError.message);
  }
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
