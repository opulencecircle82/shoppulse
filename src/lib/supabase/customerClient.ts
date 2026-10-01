import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY. Copy .env.local.example to .env.local and fill in your Supabase project credentials."
  );
}

/**
 * The customer-facing surfaces' own Supabase client — same project, same anon key as the
 * owner/staff client (lib/supabase/client.ts), but a different auth storage key. Without this,
 * owner and customer sessions shared one slot in the browser (one Supabase Auth client = one
 * logged-in session for the whole origin): an owner simply opening a customer-facing page could
 * get silently auto-enrolled as a customer under their own account, and signing out of either
 * side signed out both. Every customer-only file (lib/customer/*, /customer/* and /client/*
 * pages, the customer half of shared components like ChatThread) must import this client, never
 * the owner one, or the two sessions bleed into each other again.
 */
export const customerSupabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: { storageKey: "sb-shoppulse-customer-auth" },
});
