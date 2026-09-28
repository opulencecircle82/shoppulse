"use client";

import type { JobTicket, StaffMember } from "@/lib/supabase/types";

const STATUS_STYLES: Record<string, string> = {
  APPROVED: "bg-brand-emerald/15 text-brand-emerald-dark",
  COMPLETED: "bg-brand-blue/15 text-brand-blue",
  DISPUTED: "bg-red-500/15 text-red-600",
  IN_PROGRESS: "bg-brand-blue/15 text-brand-blue",
  SCHEDULED: "bg-amber-500/15 text-amber-600",
  UNASSIGNED: "bg-slate-100 text-slate-500",
};

export default function StaffJobHistoryModal({
  staffMember,
  tickets,
  currency,
  onClose,
}: {
  staffMember: StaffMember;
  tickets: JobTicket[];
  currency: string;
  onClose: () => void;
}) {
  const jobs = tickets
    .filter((t) => t.assigned_staff_id === staffMember.id)
    .sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

  const completedJobs = jobs.filter((t) => t.status === "APPROVED");
  const totalEarned = completedJobs.reduce(
    (sum, t) => sum + t.total_invoice_amount,
    0
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-6"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[80vh] w-full max-w-lg flex-col rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl shadow-slate-900/10"
      >
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">
              {staffMember.full_name} &middot; Job History
            </h3>
            <p className="mt-0.5 text-xs text-slate-500">
              {jobs.length} total job{jobs.length === 1 ? "" : "s"} &middot;{" "}
              {completedJobs.length} approved &middot; {currency}{" "}
              {totalEarned.toFixed(2)} invoiced
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

        <div className="mt-4 flex-1 space-y-2.5 overflow-y-auto">
          {jobs.length === 0 && (
            <div className="rounded-2xl bg-white border border-slate-200/70 p-6 text-center text-sm text-slate-500">
              No jobs assigned to {staffMember.full_name} yet.
            </div>
          )}

          {jobs.map((ticket) => (
            <div key={ticket.id} className="rounded-xl bg-slate-50 p-3.5">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-slate-900">
                    {ticket.client_name}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {ticket.service_type}
                  </p>
                </div>
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                    STATUS_STYLES[ticket.status] ?? "bg-slate-100 text-slate-500"
                  }`}
                >
                  {ticket.status.replace("_", " ")}
                </span>
              </div>
              <div className="mt-1.5 flex items-center justify-between text-xs text-slate-500">
                <span>{new Date(ticket.created_at).toLocaleDateString()}</span>
                {ticket.total_invoice_amount > 0 && (
                  <span className="font-medium text-brand-emerald-dark">
                    {currency} {ticket.total_invoice_amount.toFixed(2)}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
