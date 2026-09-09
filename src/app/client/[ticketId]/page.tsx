"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase/client";

type ClientTicket = {
  id: string;
  client_name: string;
  service_type: string;
  service_address: string;
  status: string;
  start_photo_url: string | null;
  end_photo_url: string | null;
  started_at: string | null;
  completed_at: string | null;
  dispute_notes: string | null;
  shop_name: string;
  logo_url: string | null;
  watermark_show_logo: boolean;
  watermark_show_timestamp: boolean;
  watermark_show_gps: boolean;
  start_lat: number | null;
  start_lng: number | null;
  end_lat: number | null;
  end_lng: number | null;
};

function ProofPhoto({
  label,
  url,
  timestamp,
  hasGps,
  ticket,
}: {
  label: string;
  url: string | null;
  timestamp: string | null;
  hasGps: boolean;
  ticket: ClientTicket;
}) {
  if (!url) return null;

  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <div className="relative mt-1.5 aspect-video overflow-hidden rounded-xl bg-slate-100 shadow-sm">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={url} alt={label} className="h-full w-full object-cover" />

        {ticket.watermark_show_logo && (
          <div className="absolute left-2 top-2 flex items-center gap-1.5 rounded-md bg-black/50 px-2 py-1 backdrop-blur">
            <span className="text-[10px] font-semibold text-white">{ticket.shop_name}</span>
          </div>
        )}
        {ticket.watermark_show_timestamp && (
          <div className="absolute bottom-2 left-2 rounded-md bg-black/50 px-2 py-1 text-[10px] font-medium text-white backdrop-blur">
            {timestamp ? new Date(timestamp).toLocaleString() : "—"}
          </div>
        )}
        {ticket.watermark_show_gps && hasGps && (
          <div className="absolute bottom-2 right-2 rounded-md bg-black/50 px-2 py-1 text-[10px] font-medium text-white backdrop-blur">
            GPS Verified
          </div>
        )}
      </div>
    </div>
  );
}

export default function ClientTicketPage() {
  const params = useParams();
  const ticketId = params.ticketId as string;

  const [ticket, setTicket] = useState<ClientTicket | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [disputeNotes, setDisputeNotes] = useState("");
  const [showDisputeForm, setShowDisputeForm] = useState(false);
  const [submitting, setSubmitting] = useState<"approve" | "dispute" | null>(null);

  const load = useCallback(async () => {
    const { data, error: fetchError } = await supabase
      .rpc("get_client_ticket", { p_ticket_id: ticketId })
      .maybeSingle();

    if (fetchError || !data) {
      setError("We couldn't find this job. The link may be incorrect.");
      setLoading(false);
      return;
    }

    setTicket(data as ClientTicket);
    setLoading(false);
    supabase.rpc("client_mark_viewed", { p_ticket_id: ticketId });
  }, [ticketId]);

  useEffect(() => {
    const id = setTimeout(() => {
      load();
    }, 0);
    return () => clearTimeout(id);
  }, [load]);

  async function handleApprove() {
    setSubmitting("approve");
    await supabase.rpc("client_approve_ticket", { p_ticket_id: ticketId });
    setSubmitting(null);
    await load();
  }

  async function handleDispute() {
    if (!disputeNotes.trim()) return;
    setSubmitting("dispute");
    await supabase.rpc("client_dispute_ticket", {
      p_ticket_id: ticketId,
      p_notes: disputeNotes,
    });
    setSubmitting(null);
    await load();
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-blue border-t-transparent" />
      </main>
    );
  }

  if (error || !ticket) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 px-6 text-center">
        <p className="text-sm text-slate-500">{error}</p>
      </main>
    );
  }

  const canReview = ticket.status === "COMPLETED";

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-10">
      <div className="mx-auto max-w-lg">
        <div className="flex items-center gap-3">
          {ticket.logo_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={ticket.logo_url} alt="" className="h-10 w-10 rounded-lg object-cover" />
          )}
          <div>
            <p className="text-lg font-bold text-slate-900">{ticket.shop_name}</p>
            <p className="text-xs text-slate-500">Job verification</p>
          </div>
        </div>

        <div className="mt-6 rounded-2xl bg-white p-6 shadow-md shadow-slate-900/5">
          <span
            className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
              ticket.status === "APPROVED"
                ? "bg-emerald-50 text-emerald-600"
                : ticket.status === "DISPUTED"
                  ? "bg-red-50 text-red-600"
                  : "bg-blue-50 text-brand-blue"
            }`}
          >
            {ticket.status.replace("_", " ")}
          </span>

          <h1 className="mt-3 text-xl font-bold text-slate-900">{ticket.service_type}</h1>
          <p className="mt-1 text-sm text-slate-500">{ticket.service_address}</p>
          <p className="mt-1 text-sm text-slate-500">For: {ticket.client_name}</p>

          <div className="mt-6 space-y-4">
            <ProofPhoto
              label="Job Start Proof"
              url={ticket.start_photo_url}
              timestamp={ticket.started_at}
              hasGps={ticket.start_lat !== null}
              ticket={ticket}
            />
            <ProofPhoto
              label="Job Completion Proof"
              url={ticket.end_photo_url}
              timestamp={ticket.completed_at}
              hasGps={ticket.end_lat !== null}
              ticket={ticket}
            />
          </div>

          {!ticket.start_photo_url && !ticket.end_photo_url && (
            <p className="mt-6 text-sm text-slate-500">
              Your technician hasn&apos;t started this job yet. Check back once
              it&apos;s underway to see live proof photos here.
            </p>
          )}

          {ticket.status === "APPROVED" && (
            <p className="mt-6 rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              You approved this job. Thank you!
            </p>
          )}

          {ticket.status === "DISPUTED" && (
            <div className="mt-6 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
              <p className="font-semibold">You disputed this job.</p>
              {ticket.dispute_notes && <p className="mt-1">{ticket.dispute_notes}</p>}
            </div>
          )}

          {canReview && !showDisputeForm && (
            <div className="mt-6 flex flex-col gap-2">
              <button
                type="button"
                onClick={handleApprove}
                disabled={submitting !== null}
                className="w-full rounded-full bg-brand-emerald px-6 py-3 text-sm font-semibold text-white shadow-md shadow-emerald-500/30 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting === "approve" ? "Approving..." : "Approve Job"}
              </button>
              <button
                type="button"
                onClick={() => setShowDisputeForm(true)}
                disabled={submitting !== null}
                className="w-full rounded-full border border-red-300 px-6 py-3 text-sm font-semibold text-red-600 transition-colors hover:bg-red-50"
              >
                Report a Problem
              </button>
            </div>
          )}

          {canReview && showDisputeForm && (
            <div className="mt-6">
              <label className="block text-xs font-medium text-slate-500">
                What went wrong?
              </label>
              <textarea
                rows={3}
                value={disputeNotes}
                onChange={(e) => setDisputeNotes(e.target.value)}
                placeholder="Tell us what happened..."
                className="mt-1.5 w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-brand-blue focus:outline-none"
              />
              <div className="mt-3 flex flex-col gap-2">
                <button
                  type="button"
                  onClick={handleDispute}
                  disabled={submitting !== null || !disputeNotes.trim()}
                  className="w-full rounded-full bg-red-600 px-6 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {submitting === "dispute" ? "Submitting..." : "Submit Dispute"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowDisputeForm(false)}
                  className="w-full rounded-full border border-slate-200 px-6 py-3 text-sm font-medium text-slate-600"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
