import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY. Copy .env.local.example to .env.local and fill in your Supabase project credentials."
  );
}

// Owner/staff/technician session only — the customer-facing surfaces use their own separate
// client (see customerClient.ts) with its own storage key, so an owner logged in here and a
// customer logged in there coexist in the same browser without either session touching the
// other. Explicit storageKey (rather than relying on the library's own derived default) makes
// that separation obvious and intentional here, not an accident of two clients happening not
// to collide.
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: { storageKey: "sb-shoppulse-owner-auth" },
});
