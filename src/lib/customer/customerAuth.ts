import { supabase } from "@/lib/supabase/client";

export type Customer = {
  id: string;
  fullName: string;
  email: string;
  phone: string | null;
  country: string | null;
  region: string | null;
  city: string | null;
  latitude: number | null;
  longitude: number | null;
};

const CUSTOMER_FIELDS = "id, full_name, email, phone, country, region, city, latitude, longitude";

function mapCustomerRow(data: {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  country: string | null;
  region: string | null;
  city: string | null;
  latitude: number | null;
  longitude: number | null;
}): Customer {
  return {
    id: data.id,
    fullName: data.full_name,
    email: data.email,
    phone: data.phone,
    country: data.country,
    region: data.region,
    city: data.city,
    latitude: data.latitude,
    longitude: data.longitude,
  };
}

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
    .select(CUSTOMER_FIELDS)
    .eq("auth_user_id", session.user.id)
    .maybeSingle();

  if (data) {
    return mapCustomerRow(data);
  }

  const meta = session.user.user_metadata as {
    full_name?: string;
    phone?: string;
    country?: string;
    region?: string;
    city?: string;
    latitude?: number;
    longitude?: number;
  };

  const { data: created, error: createError } = await supabase
    .from("customers")
    .insert({
      auth_user_id: session.user.id,
      full_name: meta.full_name ?? session.user.email ?? "Customer",
      email: session.user.email ?? "",
      phone: meta.phone || null,
      country: meta.country || null,
      region: meta.region || null,
      city: meta.city || null,
      latitude: meta.latitude ?? null,
      longitude: meta.longitude ?? null,
    })
    .select(CUSTOMER_FIELDS)
    .single();

  if (createError || !created) return null;

  return mapCustomerRow(created);
}

/**
 * Stashes full name/phone/location in the auth user's metadata (available
 * at signUp() time even without a session) so fetchCurrentCustomer can use
 * them to create the profile row later, whenever the session actually
 * becomes available.
 */
export async function signUpCustomer(params: {
  fullName: string;
  email: string;
  phone: string;
  password: string;
  country: string;
  region: string;
  city: string;
  latitude: number | null;
  longitude: number | null;
}): Promise<{ needsEmailConfirmation: boolean }> {
  const { data, error } = await supabase.auth.signUp({
    email: params.email,
    password: params.password,
    options: {
      data: {
        full_name: params.fullName,
        phone: params.phone,
        country: params.country,
        region: params.region,
        city: params.city,
        latitude: params.latitude,
        longitude: params.longitude,
      },
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
