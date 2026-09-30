"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase/client";

/** Owner/manager cancellation for a confirmed job — only reachable before the
 * technician taps "I'm on my way" (shop_cancel_booking enforces that too). */
export default function CancelJobButton({
  ticketId,
  onChanged,
}: {
  ticketId: string;
  onChanged: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCancel() {
    if (!reason.trim()) {
      setError("Please give a reason — the customer will see it.");
      return;
    }
    setBusy(true);
    setError(null);
    const { error: rpcError } = await supabase.rpc("shop_cancel_booking", {
      p_ticket_id: ticketId,
      p_reason: reason.trim(),
    });
    setBusy(false);
    if (rpcError) {
      setError(rpcError.message);
      return;
    }
    onChanged();
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-full border border-slate-300 px-4 py-1.5 text-xs font-semibold text-slate-600 transition-colors hover:border-red-400 hover:text-red-600"
      >
        Cancel Job
      </button>
    );
  }

  return (
    <div className="w-full rounded-xl border border-red-200 bg-red-50/60 p-3">
      <label className="block text-xs font-semibold text-slate-700">
        Why are you cancelling? The customer will see this.
      </label>
      <textarea
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        rows={2}
        maxLength={500}
        autoFocus
        placeholder="e.g. No technician available for this time slot"
        className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:border-brand-blue focus:outline-none"
      />
      {error && <p className="mt-1.5 text-xs text-red-600">{error}</p>}
      <div className="mt-2 flex gap-2">
        <button
          type="button"
          onClick={handleCancel}
          disabled={busy}
          className="rounded-full bg-red-600 px-4 py-1.5 text-xs font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
        >
          {busy ? "Cancelling..." : "Confirm Cancellation"}
        </button>
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            setReason("");
            setError(null);
          }}
          disabled={busy}
          className="rounded-full border border-slate-300 px-4 py-1.5 text-xs font-semibold text-slate-600 transition-colors hover:bg-white disabled:opacity-60"
        >
          Never Mind
        </button>
      </div>
    </div>
  );
}
