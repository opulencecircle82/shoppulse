"use client";

import { useState } from "react";
import { ShieldCheck } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import type { JobTicket, Shop } from "@/lib/supabase/types";

function ProofPhoto({
  label,
  url,
  timestamp,
  shop,
}: {
  label: string;
  url: string | null;
  timestamp: string | null;
  shop: Shop;
}) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <div className="relative mt-1.5 aspect-video overflow-hidden rounded-xl bg-brand-slate-light/30 shadow-sm shadow-black/20">
        {url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt={label} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <span className="text-xs text-slate-400">
              No photo yet — appears once submitted via mobile app
            </span>
          </div>
        )}

        {url && shop.watermark_show_logo && (
          <div className="absolute left-2 top-2 flex items-center gap-1.5 rounded-md bg-black/50 px-2 py-1 backdrop-blur">
            <span className="flex h-4 w-4 items-center justify-center rounded bg-brand-blue text-[8px] font-bold text-white">
              {shop.shop_name.slice(0, 1).toUpperCase() || "S"}
            </span>
            <span className="text-[10px] font-semibold text-slate-900">
              {shop.shop_name}
            </span>
          </div>
        )}
        {url && shop.watermark_show_timestamp && (
          <div className="absolute bottom-2 left-2 rounded-md bg-black/50 px-2 py-1 text-[10px] font-medium text-slate-900 backdrop-blur">
            {timestamp ? new Date(timestamp).toLocaleString() : "—"}
          </div>
        )}
        {url && shop.watermark_show_gps && (
          <div className="absolute bottom-2 right-2 rounded-md bg-black/50 px-2 py-1 text-[10px] font-medium text-slate-900 backdrop-blur">
            GPS Verified
          </div>
        )}
      </div>
    </div>
  );
}

export default function ProofDisputeDrawer({
  ticket,
  shop,
  onClose,
  onChanged,
  onApproved,
}: {
  ticket: JobTicket;
  shop: Shop;
  onClose: () => void;
  onChanged: () => void;
  onApproved: (ticket: JobTicket) => void;
}) {
  const [notes, setNotes] = useState(ticket.dispute_notes ?? "");
  const [saving, setSaving] = useState<"approve" | "reject" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleApprove() {
    setSaving("approve");
    setError(null);

    // Approving previously left total_invoice_amount at 0 until the owner
    // separately filled out and saved the invoice modal that pops up next —
    // easy to skip past without noticing, leaving staff/customer with no
    // receipt at all. Now Approve computes a real starting invoice right
    // away (actual hours from start/end timestamps × the shop's standard
    // rate, plus any selected products), so there's always something there
    // even if the owner just closes the modal instead of adjusting it.
    const actualHours =
      ticket.started_at && ticket.completed_at
        ? Math.max(
            0,
            (new Date(ticket.completed_at).getTime() -
              new Date(ticket.started_at).getTime()) /
              3600000
          )
        : ticket.estimated_hours || 0;
    const laborCost = Math.round(actualHours * shop.default_hourly_rate * 100) / 100;
    const productsCost = ticket.selected_products.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    );
    const totalInvoiceAmount = laborCost + productsCost;

    const { error: updateError } = await supabase
      .from("job_tickets")
      .update({
        status: "APPROVED",
        dispute_notes: notes || null,
        actual_hours: actualHours,
        total_labor_cost: laborCost,
        total_invoice_amount: totalInvoiceAmount,
      })
      .eq("id", ticket.id);
    setSaving(null);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    onChanged();
    onApproved({
      ...ticket,
      status: "APPROVED",
      actual_hours: actualHours,
      total_labor_cost: laborCost,
      total_invoice_amount: totalInvoiceAmount,
    });
    onClose();
  }

  async function handleReject() {
    setSaving("reject");
    setError(null);
    const { error: updateError } = await supabase
      .from("job_tickets")
      .update({ status: "DISPUTED", dispute_notes: notes })
      .eq("id", ticket.id);
    setSaving(null);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    onChanged();
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex h-full w-full max-w-md flex-col overflow-y-auto bg-brand-slate p-6 shadow-2xl shadow-black/40"
      >
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">
              Proof &amp; Dispute Review
            </h3>
            <p className="text-xs text-slate-400">
              {ticket.client_name} &middot; {ticket.service_type}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-500 hover:text-slate-900"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="mt-4 inline-flex w-fit items-center gap-2 rounded-full border border-brand-emerald/30 bg-brand-emerald/10 px-3 py-1.5 text-xs font-semibold text-brand-emerald">
          <ShieldCheck className="h-3.5 w-3.5" />
          Live Snapshot Enforced &mdash; Gallery Disabled
        </div>

        <div className="mt-5 space-y-4">
          <ProofPhoto
            label="Job Start Proof"
            url={ticket.start_photo_url}
            timestamp={ticket.started_at}
            shop={shop}
          />
          <ProofPhoto
            label="Job Completion Proof"
            url={ticket.end_photo_url}
            timestamp={ticket.completed_at}
            shop={shop}
          />
        </div>

        {ticket.signature_url && (
          <div className="mt-5">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Customer Signature
            </p>
            <div className="mt-1.5 rounded-xl bg-white p-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={ticket.signature_url}
                alt="Customer signature"
                className="h-20 w-full object-contain"
              />
            </div>
          </div>
        )}

        <div className="mt-5">
          <label className="block text-xs font-medium text-slate-500">
            Dispute Notes
          </label>
          <textarea
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="What did the client say was wrong with this job?"
            className="mt-1.5 w-full rounded-xl bg-brand-slate-light/40 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-brand-blue focus:outline-none"
          />
        </div>

        {error && (
          <p className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 px-3.5 py-2.5 text-sm text-red-400">
            {error}
          </p>
        )}

        <div className="mt-6 flex flex-col gap-2">
          <button
            type="button"
            onClick={handleApprove}
            disabled={saving !== null}
            className="w-full rounded-full bg-brand-emerald px-6 py-3 text-sm font-semibold text-brand-slate shadow-[0_0_20px_rgba(16,185,129,0.5)] transition-shadow hover:shadow-[0_0_30px_rgba(16,185,129,0.75)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving === "approve" ? "Approving..." : "Approve & Invoice"}
          </button>
          <button
            type="button"
            onClick={handleReject}
            disabled={saving !== null || !notes.trim()}
            className="w-full rounded-full border border-red-500/40 px-6 py-3 text-sm font-semibold text-red-400 transition-colors hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving === "reject" ? "Rejecting..." : "Reject Dispute"}
          </button>
          {!notes.trim() && (
            <p className="text-center text-xs text-slate-400">
              Add dispute notes above to reject this job.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
