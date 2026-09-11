"use client";

import { useMemo, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import type { JobTicket } from "@/lib/supabase/types";

export default function InvoiceGeneratorModal({
  ticket,
  currency,
  defaultHourlyRate,
  onClose,
  onSaved,
}: {
  ticket: JobTicket;
  currency: string;
  defaultHourlyRate: number;
  onClose: () => void;
  onSaved: () => void;
}) {
  // Products cost is always added on top of labor/flat below (both here
  // and in the auto-invoice ProofDisputeDrawer computes on Approve) — so
  // it has to be subtracted back out of any *existing* total_invoice_amount
  // before using that as this modal's starting flat-rate figure, or
  // reopening the modal on an already-approved ticket would double-count
  // it (labor+products saved once, then products added again here).
  const productsCost = ticket.selected_products.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );

  const [mode, setMode] = useState<"hourly" | "flat">("hourly");
  const [actualHours, setActualHours] = useState(
    ticket.actual_hours || ticket.estimated_hours || 0
  );
  // Defaults to the shop's customer-facing standard rate, not the
  // technician's internal pay rate — those are different numbers (what
  // the business charges vs. what it pays), and using the pay rate here
  // would silently undercharge/overcharge relative to what Approve just
  // auto-computed and saved.
  const [hourlyRate, setHourlyRate] = useState(defaultHourlyRate);
  const [flatAmount, setFlatAmount] = useState(
    Math.max(0, (ticket.total_invoice_amount || 0) - productsCost)
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const laborCost = useMemo(
    () => Math.round(actualHours * hourlyRate * 100) / 100,
    [actualHours, hourlyRate]
  );
  const total = (mode === "hourly" ? laborCost : flatAmount) + productsCost;

  async function handleSave() {
    setSaving(true);
    setError(null);

    const { error: updateError } = await supabase
      .from("job_tickets")
      .update({
        actual_hours: mode === "hourly" ? actualHours : ticket.actual_hours,
        total_labor_cost: mode === "hourly" ? laborCost : ticket.total_labor_cost,
        total_invoice_amount: total,
      })
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
        className="w-full max-w-md rounded-3xl border border-white/10 bg-brand-navy p-6 shadow-2xl shadow-black/40"
      >
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-lg font-semibold text-white">
              Generate Invoice
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

        <div className="mt-5 inline-flex rounded-full border border-white/20 bg-white/5 p-1">
          <button
            type="button"
            onClick={() => setMode("hourly")}
            className={`rounded-full px-4 py-1.5 text-xs font-medium transition-colors ${
              mode === "hourly"
                ? "bg-brand-blue text-white"
                : "text-slate-400 hover:text-white"
            }`}
          >
            Hourly Rate Billing
          </button>
          <button
            type="button"
            onClick={() => setMode("flat")}
            className={`rounded-full px-4 py-1.5 text-xs font-medium transition-colors ${
              mode === "flat"
                ? "bg-brand-blue text-white"
                : "text-slate-400 hover:text-white"
            }`}
          >
            Flat-Rate Job Billing
          </button>
        </div>

        {mode === "hourly" ? (
          <div className="mt-5 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-400">
                  Actual Hours
                </label>
                <input
                  type="number"
                  min={0}
                  step={0.25}
                  value={actualHours}
                  onChange={(e) => setActualHours(Number(e.target.value))}
                  className="mt-1 w-full rounded-xl bg-white/5 px-3 py-2 text-sm text-white focus:ring-2 focus:ring-brand-blue focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400">
                  Hourly Rate ({currency})
                </label>
                <input
                  type="number"
                  min={0}
                  step={0.5}
                  value={hourlyRate}
                  onChange={(e) => setHourlyRate(Number(e.target.value))}
                  className="mt-1 w-full rounded-xl bg-white/5 px-3 py-2 text-sm text-white focus:ring-2 focus:ring-brand-blue focus:outline-none"
                />
              </div>
            </div>
          </div>
        ) : (
          <div className="mt-5">
            <label className="block text-xs font-medium text-slate-400">
              Flat Rate Amount ({currency})
            </label>
            <input
              type="number"
              min={0}
              step={1}
              value={flatAmount}
              onChange={(e) => setFlatAmount(Number(e.target.value))}
              className="mt-1 w-full rounded-xl bg-white/5 px-3 py-2 text-sm text-white focus:ring-2 focus:ring-brand-blue focus:outline-none"
            />
          </div>
        )}

        {ticket.selected_products.length > 0 && (
          <div className="mt-4 space-y-1 rounded-lg bg-white/5 px-4 py-3">
            <p className="text-xs font-medium text-slate-400">Products</p>
            {ticket.selected_products.map((item, index) => (
              <div key={index} className="flex justify-between text-xs text-slate-300">
                <span>{item.name}</span>
                <span>
                  {currency} {(item.price * item.quantity).toFixed(2)}
                </span>
              </div>
            ))}
          </div>
        )}

        <div className="mt-5 flex items-center justify-between rounded-lg bg-white/5 px-4 py-3">
          <span className="text-sm text-slate-400">Total Invoice</span>
          <span className="text-lg font-bold text-brand-emerald">
            {currency} {total.toFixed(2)}
          </span>
        </div>

        {error && (
          <p className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 px-3.5 py-2.5 text-sm text-red-400">
            {error}
          </p>
        )}

        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="mt-5 w-full rounded-full bg-gradient-to-r from-brand-sky to-brand-blue-dark px-6 py-3 text-sm font-semibold text-white shadow-[0_0_20px_rgba(37,99,235,0.35)] transition-shadow hover:shadow-[0_0_30px_rgba(37,99,235,0.5)] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {saving ? "Saving..." : "Save Invoice"}
        </button>
      </div>
    </div>
  );
}
