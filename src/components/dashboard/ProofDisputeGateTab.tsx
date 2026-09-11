"use client";

import type { JobTicket } from "@/lib/supabase/types";

export default function ProofDisputeGateTab({
  tickets,
  onOpenProofDrawer,
}: {
  tickets: JobTicket[];
  onOpenProofDrawer: (ticket: JobTicket) => void;
}) {
  const reviewable = tickets.filter(
    (t) => t.status === "COMPLETED" || t.status === "DISPUTED"
  );

  return (
    <div>
      <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
        Awaiting Review ({reviewable.length})
      </h2>

      {reviewable.length === 0 && (
        <p className="mt-4 text-sm text-slate-400">
          No completed or disputed jobs need review right now.
        </p>
      )}

      <div className="mt-4 space-y-3">
        {reviewable.map((ticket) => (
          <button
            key={ticket.id}
            type="button"
            onClick={() => onOpenProofDrawer(ticket)}
            className="flex w-full flex-wrap items-center justify-between gap-3 rounded-2xl bg-white/5 p-4 text-left shadow-md shadow-black/20 transition-shadow hover:shadow-lg hover:shadow-brand-blue/10"
          >
            <div>
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold text-white">
                  {ticket.client_name}
                </p>
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                    ticket.status === "DISPUTED"
                      ? "bg-red-500/15 text-red-400"
                      : "bg-brand-emerald/15 text-brand-emerald"
                  }`}
                >
                  {ticket.status}
                </span>
              </div>
              <p className="mt-1 text-xs text-slate-400">
                {ticket.service_type} &middot; {ticket.service_address}
              </p>
            </div>
            <span className="text-xs font-medium text-brand-blue">
              Review proof →
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
