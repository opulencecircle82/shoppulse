"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase/client";
import type { JobTicket } from "@/lib/supabase/types";

export default function DisputeModal({
  ticket,
  onClose,
  onSaved,
}: {
  ticket: JobTicket;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isFilingDispute = ticket.status !== "DISPUTED";
  const [notes, setNotes] = useState(ticket.dispute_notes ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFileDispute() {
    setSaving(true);
    setError(null);
    const { error: updateError } = await supabase
      .from("job_tickets")
      .update({ status: "DISPUTED", dispute_notes: notes })
      .eq("id", ticket.id);
    setSaving(false);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    onSaved();
    onClose();
  }

  async function handleResolve(nextStatus: "APPROVED" | "COMPLETED") {
    setSaving(true);
    setError(null);
    const { error: updateError } = await supabase
      .from("job_tickets")
      .update({ status: nextStatus, dispute_notes: notes })
      .eq("id", ticket.id);
    setSaving(false);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    onSaved();
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-6"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg rounded-2xl border border-slate-700 bg-brand-slate p-6 shadow-2xl"
      >
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-lg font-semibold text-white">
              {isFilingDispute ? "File Client Dispute" : "Resolve Dispute"}
            </h3>
            <p className="text-xs text-slate-500">{ticket.client_name}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
              Start Photo
            </p>
            <div className="mt-1.5 flex aspect-video items-center justify-center rounded-lg border border-slate-700 bg-brand-slate-light/30">
              {ticket.start_photo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={ticket.start_photo_url}
                  alt="Job start proof"
                  className="h-full w-full rounded-lg object-cover"
                />
              ) : (
                <span className="text-xs text-slate-500">No photo</span>
              )}
            </div>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
              End Photo
            </p>
            <div className="mt-1.5 flex aspect-video items-center justify-center rounded-lg border border-slate-700 bg-brand-slate-light/30">
              {ticket.end_photo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={ticket.end_photo_url}
                  alt="Job completion proof"
                  className="h-full w-full rounded-lg object-cover"
                />
              ) : (
                <span className="text-xs text-slate-500">No photo</span>
              )}
            </div>
          </div>
        </div>

        <div className="mt-5">
          <label className="block text-xs font-medium text-slate-400">
            Client Dispute Notes
          </label>
          <textarea
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="What did the client say was wrong with this job?"
            className="mt-1.5 w-full rounded-lg border border-slate-600 bg-brand-slate-light/40 px-3.5 py-2.5 text-sm text-white placeholder:text-slate-500 focus:border-brand-emerald focus:outline-none"
          />
        </div>

        {error && (
          <p className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 px-3.5 py-2.5 text-sm text-red-400">
            {error}
          </p>
        )}

        <div className="mt-5 flex flex-col gap-2">
          {isFilingDispute ? (
            <button
              type="button"
              onClick={handleFileDispute}
              disabled={saving || !notes.trim()}
              className="w-full rounded-full bg-red-500 px-6 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? "Filing..." : "File Dispute"}
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={() => handleResolve("APPROVED")}
                disabled={saving}
                className="w-full rounded-full bg-brand-emerald px-6 py-3 text-sm font-semibold text-brand-slate shadow-[0_0_20px_rgba(16,185,129,0.5)] transition-shadow hover:shadow-[0_0_30px_rgba(16,185,129,0.75)] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? "Saving..." : "Resolve & Approve"}
              </button>
              <button
                type="button"
                onClick={() => handleResolve("COMPLETED")}
                disabled={saving}
                className="w-full rounded-full border border-slate-600 px-6 py-3 text-sm font-semibold text-white transition-colors hover:border-brand-sky hover:text-brand-sky disabled:cursor-not-allowed disabled:opacity-60"
              >
                Send Back to Completed
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
