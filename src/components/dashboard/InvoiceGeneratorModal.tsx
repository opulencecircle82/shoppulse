"use client";

import { useMemo, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import type { JobTicket, StaffMember } from "@/lib/supabase/types";

export default function InvoiceGeneratorModal({
  ticket,
  staff,
  currency,
  onClose,
  onSaved,
}: {
  ticket: JobTicket;
  staff: StaffMember[];
  currency: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const assignedStaff = staff.find((s) => s.id === ticket.assigned_staff_id);

  const [mode, setMode] = useState<"hourly" | "flat">("hourly");
  const [actualHours, setActualHours] = useState(
    ticket.actual_hours || ticket.estimated_hours || 0
  );
  const [hourlyRate, setHourlyRate] = useState(assignedStaff?.hourly_rate ?? 0);
  const [flatAmount, setFlatAmount] = useState(ticket.total_invoice_amount || 0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const laborCost = useMemo(
    () => Math.round(actualHours * hourlyRate * 100) / 100,
    [actualHours, hourlyRate]
  );
  const total = mode === "hourly" ? laborCost : flatAmount;

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
        className="w-full max-w-md rounded-3xl bg-brand-slate p-6 shadow-2xl shadow-black/40"
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

        <div className="mt-5 inline-flex rounded-full border border-slate-700 bg-brand-slate-light/40 p-1">
          <button
            type="button"
            onClick={() => setMode("hourly")}
            className={`rounded-full px-4 py-1.5 text-xs font-medium transition-colors ${
              mode === "hourly"
                ? "bg-brand-emerald text-brand-slate"
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
                ? "bg-brand-emerald text-brand-slate"
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
                  className="mt-1 w-full rounded-xl bg-brand-slate-light/40 px-3 py-2 text-sm text-white focus:ring-2 focus:ring-brand-emerald focus:outline-none"
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
                  className="mt-1 w-full rounded-xl bg-brand-slate-light/40 px-3 py-2 text-sm text-white focus:ring-2 focus:ring-brand-emerald focus:outline-none"
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
              className="mt-1 w-full rounded-xl bg-brand-slate-light/40 px-3 py-2 text-sm text-white focus:ring-2 focus:ring-brand-emerald focus:outline-none"
            />
          </div>
        )}

        <div className="mt-5 flex items-center justify-between rounded-lg bg-brand-slate-light/40 px-4 py-3">
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
          className="mt-5 w-full rounded-full bg-brand-emerald px-6 py-3 text-sm font-semibold text-brand-slate shadow-[0_0_20px_rgba(16,185,129,0.5)] transition-shadow hover:shadow-[0_0_30px_rgba(16,185,129,0.75)] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {saving ? "Saving..." : "Save Invoice"}
        </button>
      </div>
    </div>
  );
}
