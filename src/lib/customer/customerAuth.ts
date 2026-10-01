// This file is customer-only — it must use the customer's own separate Supabase client
// (its own auth storage key) so a customer session never collides with an owner/staff session
// in the same browser. See lib/supabase/customerClient.ts.
import { customerSupabase as supabase } from "@/lib/supabase/customerClient";

export type Customer = {
  id: string;
  fullName: string;
  email: string;
  phone: string | null;
  country: string | null;
  region: string | null;
  city: string | null;
  barangay: string | null;
  latitude: number | null;
  longitude: number | null;
};

const CUSTOMER_FIELDS =
  "id, full_name, email, phone, country, region, city, barangay, latitude, longitude";

function mapCustomerRow(data: {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  country: string | null;
  region: string | null;
  city: string | null;
  barangay: string | null;
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
    barangay: data.barangay,
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
 *
 * Staff (owner/manager/technician) and customers share the same Supabase
 * Auth users, so an owner's own logged-in browser session is just as
 * "authenticated" as a real customer's — without this check, an owner
 * who simply opened the customer-facing booking pages while signed in
 * would get silently auto-enrolled as a customer under their own owner
 * account, with no separate signup ever happening. Owner and client
 * accounts are meant to be separate; a staff session is never a valid
 * customer session here, full stop — this treats it exactly like being
 * signed out, so the normal customer login/signup screen shows instead.
 */
export async function fetchCurrentCustomer(): Promise<Customer | null> {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.user) return null;

  const { data: staffRow } = await supabase
    .from("staff_members")
    .select("id")
    .eq("auth_user_id", session.user.id)
    .maybeSingle();
  if (staffRow) return null;

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
    barangay?: string;
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
      barangay: meta.barangay || null,
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
  barangay: string;
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
        barangay: params.barangay,
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

/** Google sign-in doesn't always hand back a usable name, and a customer may just want to change
 * it — the only way to fix it short of this, same gap owners had before Company Profile grew a
 * "Your Name" field. */
export async function updateCustomerFullName(customerId: string, fullName: string) {
  const { error } = await supabase
    .from("customers")
    .update({ full_name: fullName })
    .eq("id", customerId);
  if (error) throw new Error(error.message);
}
