"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase/client";

/** Accept / Reject for a new booking request, right on the job's row. */
export default function BookingDecisionButtons({
  ticketId,
  onChanged,
}: {
  ticketId: string;
  onChanged: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function decide(kind: "accept" | "reject") {
    if (kind === "reject" && !window.confirm("Decline this booking request? The customer will be told it was declined.")) {
      return;
    }
    setBusy(true);
    setError(null);
    const { error: rpcError } = await supabase.rpc(
      kind === "accept" ? "accept_booking_request" : "reject_booking_request",
      { p_ticket_id: ticketId }
    );
    setBusy(false);
    if (rpcError) {
      setError(rpcError.message);
      return;
    }
    onChanged();
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={() => decide("accept")}
        disabled={busy}
        className="rounded-full bg-gradient-to-r from-brand-sky to-brand-blue-dark px-4 py-1.5 text-xs font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
      >
        Accept
      </button>
      <button
        type="button"
        onClick={() => decide("reject")}
        disabled={busy}
        className="rounded-full border border-slate-300 px-4 py-1.5 text-xs font-semibold text-slate-600 transition-colors hover:border-red-400 hover:text-red-600 disabled:opacity-60"
      >
        Reject
      </button>
      {error && <p className="w-full text-xs text-red-600">{error}</p>}
    </div>
  );
}
