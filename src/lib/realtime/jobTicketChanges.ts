import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase/client";

/**
 * Calls `onChange` whenever a job ticket matching `filter` (a PostgREST-style
 * filter such as "shop_id=eq.abc") is inserted or updated — the technician
 * tapping "On my way", the customer uploading proof of payment, the owner
 * accepting a booking. Row Level Security still decides which changes each
 * signed-in viewer is allowed to hear about, so nobody is told about jobs
 * they couldn't read anyway.
 *
 * One action often touches several columns in quick succession, so bursts are
 * folded into a single callback. Every screen that uses this also keeps a slow
 * poll as a safety net (a dropped connection just means the next poll catches
 * up), so this is purely about making the normal case instant.
 *
 * `client` defaults to the owner/staff client — customer-facing callers must pass
 * `customerSupabase` (lib/supabase/customerClient.ts) so the realtime connection
 * authenticates as the customer, not whichever session this default client holds.
 *
 * Returns a function that stops listening.
 */
export function subscribeToJobTickets(
  channelName: string,
  filter: string,
  onChange: () => void,
  client: SupabaseClient = supabase
): () => void {
  let timer: ReturnType<typeof setTimeout> | undefined;

  const channel = client
    .channel(channelName)
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "job_tickets", filter },
      () => {
        if (timer) clearTimeout(timer);
        timer = setTimeout(onChange, 250);
      }
    )
    .subscribe();

  return () => {
    if (timer) clearTimeout(timer);
    client.removeChannel(channel);
  };
}
