"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase/client";
import type { JobTicket, StaffMember } from "@/lib/supabase/types";

export default function JobTicketCard({
  ticket,
  staff,
  onChanged,
  onOpenInvoice,
  onOpenDispute,
}: {
  ticket: JobTicket;
  staff: StaffMember[];
  onChanged: () => void;
  onOpenInvoice: (ticket: JobTicket) => void;
  onOpenDispute: (ticket: JobTicket) => void;
}) {
  const [updating, setUpdating] = useState(false);
  const assignedStaff = staff.find((s) => s.id === ticket.assigned_staff_id);

  async function updateTicket(fields: Partial<JobTicket>) {
    setUpdating(true);
    await supabase.from("job_tickets").update(fields).eq("id", ticket.id);
    setUpdating(false);
    onChanged();
  }

  async function handleAssign(staffId: string) {
    await updateTicket({
      assigned_staff_id: staffId || null,
      status: staffId ? "SCHEDULED" : "UNASSIGNED",
    });
  }

  return (
    <div className="rounded-xl border border-slate-700 bg-brand-slate-light/30 p-4">
      <p className="text-sm font-semibold text-white">{ticket.client_name}</p>
      <p className="mt-0.5 text-xs text-slate-400">{ticket.service_type}</p>
      <p className="mt-1 truncate text-xs text-slate-500">
        {ticket.service_address}
      </p>

      {ticket.status === "UNASSIGNED" ? (
        <select
          value={ticket.assigned_staff_id ?? ""}
          onChange={(e) => handleAssign(e.target.value)}
          disabled={updating}
          className="mt-3 w-full rounded-lg border border-slate-600 bg-brand-slate px-2.5 py-1.5 text-xs text-white focus:border-brand-emerald focus:outline-none"
        >
          <option value="">Assign technician...</option>
          {staff.map((member) => (
            <option key={member.id} value={member.id}>
              {member.full_name}
            </option>
          ))}
        </select>
      ) : (
        <p className="mt-3 text-xs text-slate-400">
          Assigned: <span className="text-white">{assignedStaff?.full_name ?? "—"}</span>
        </p>
      )}

      {ticket.total_invoice_amount > 0 && (
        <p className="mt-1 text-xs font-semibold text-brand-emerald">
          Invoice: {ticket.total_invoice_amount.toFixed(2)}
        </p>
      )}

      <div className="mt-3 flex flex-wrap gap-2">
        {ticket.status === "SCHEDULED" && (
          <button
            type="button"
            disabled={updating}
            onClick={() => updateTicket({ status: "IN_PROGRESS", started_at: new Date().toISOString() })}
            className="rounded-full bg-brand-emerald px-3 py-1.5 text-xs font-semibold text-brand-slate transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            Start Job
          </button>
        )}

        {ticket.status === "IN_PROGRESS" && (
          <button
            type="button"
            disabled={updating}
            onClick={() => updateTicket({ status: "COMPLETED", completed_at: new Date().toISOString() })}
            className="rounded-full bg-brand-emerald px-3 py-1.5 text-xs font-semibold text-brand-slate transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            Mark Completed
          </button>
        )}

        {ticket.status === "COMPLETED" && (
          <>
            <button
              type="button"
              onClick={() => onOpenInvoice(ticket)}
              className="rounded-full border border-brand-sky/40 px-3 py-1.5 text-xs font-semibold text-brand-sky transition-colors hover:bg-brand-sky/10"
            >
              Generate Invoice
            </button>
            <button
              type="button"
              disabled={updating}
              onClick={() => updateTicket({ status: "APPROVED" })}
              className="rounded-full bg-brand-emerald px-3 py-1.5 text-xs font-semibold text-brand-slate transition-opacity hover:opacity-90 disabled:opacity-60"
            >
              Approve
            </button>
            <button
              type="button"
              onClick={() => onOpenDispute(ticket)}
              className="rounded-full border border-red-500/40 px-3 py-1.5 text-xs font-semibold text-red-400 transition-colors hover:bg-red-500/10"
            >
              File Dispute
            </button>
          </>
        )}

        {ticket.status === "DISPUTED" && (
          <button
            type="button"
            onClick={() => onOpenDispute(ticket)}
            className="rounded-full border border-red-500/40 px-3 py-1.5 text-xs font-semibold text-red-400 transition-colors hover:bg-red-500/10"
          >
            Resolve Dispute
          </button>
        )}

        {ticket.status === "APPROVED" && (
          <button
            type="button"
            onClick={() => onOpenInvoice(ticket)}
            className="rounded-full border border-brand-sky/40 px-3 py-1.5 text-xs font-semibold text-brand-sky transition-colors hover:bg-brand-sky/10"
          >
            {ticket.total_invoice_amount > 0 ? "Edit Invoice" : "Generate Invoice"}
          </button>
        )}
      </div>
    </div>
  );
}
