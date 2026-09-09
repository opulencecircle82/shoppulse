"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase/client";
import type { JobTicket, StaffMember } from "@/lib/supabase/types";

export default function JobTicketCard({
  ticket,
  staff,
  onChanged,
  onOpenInvoice,
  onOpenProofDrawer,
}: {
  ticket: JobTicket;
  staff: StaffMember[];
  onChanged: () => void;
  onOpenInvoice: (ticket: JobTicket) => void;
  onOpenProofDrawer?: (ticket: JobTicket) => void;
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
    <div
      onClick={() => onOpenProofDrawer?.(ticket)}
      className={`rounded-2xl bg-brand-slate-light/40 p-4 shadow-md shadow-black/20 ${
        onOpenProofDrawer ? "cursor-pointer transition-shadow hover:shadow-lg hover:shadow-brand-blue/10" : ""
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-slate-900">
            {ticket.client_name}
          </p>
          <p className="mt-0.5 text-xs text-slate-500">{ticket.service_type}</p>
          <p className="mt-1 truncate text-xs text-slate-400">
            {ticket.service_address}
          </p>
        </div>
        {ticket.status === "DISPUTED" && (
          <span className="shrink-0 rounded-full bg-red-500/15 px-2 py-0.5 text-[10px] font-semibold text-red-400">
            Disputed
          </span>
        )}
      </div>

      {ticket.status === "UNASSIGNED" ? (
        <select
          value={ticket.assigned_staff_id ?? ""}
          onChange={(e) => handleAssign(e.target.value)}
          onClick={(e) => e.stopPropagation()}
          disabled={updating}
          className="mt-3 w-full rounded-xl bg-brand-slate/60 px-2.5 py-1.5 text-xs text-slate-900 focus:ring-2 focus:ring-brand-blue focus:outline-none"
        >
          <option value="">Assign technician...</option>
          {staff.map((member) => (
            <option key={member.id} value={member.id}>
              {member.full_name}
            </option>
          ))}
        </select>
      ) : (
        <p className="mt-3 text-xs text-slate-500">
          Assigned: <span className="text-slate-900">{assignedStaff?.full_name ?? "—"}</span>
        </p>
      )}

      {ticket.total_invoice_amount > 0 && (
        <p className="mt-1 text-xs font-semibold text-brand-emerald">
          Invoice: {ticket.total_invoice_amount.toFixed(2)}
        </p>
      )}

      {(ticket.status === "COMPLETED" || ticket.status === "DISPUTED") && (
        <p className="mt-3 text-xs font-medium text-brand-blue">
          Click card to review proof →
        </p>
      )}

      <div
        className="mt-3 flex flex-wrap gap-2"
        onClick={(e) => e.stopPropagation()}
      >
        {ticket.status === "SCHEDULED" && (
          <p className="text-xs text-slate-500">
            Waiting for {assignedStaff?.full_name ?? "the technician"} to
            start this job from the mobile app.
          </p>
        )}

        {ticket.status === "IN_PROGRESS" && (
          <p className="text-xs text-slate-500">
            In progress — waiting for {assignedStaff?.full_name ?? "the technician"}{" "}
            to submit completion proof from the mobile app.
          </p>
        )}

        {ticket.status === "APPROVED" && (
          <button
            type="button"
            onClick={() => onOpenInvoice(ticket)}
            className="rounded-full border border-brand-blue/40 px-3 py-1.5 text-xs font-semibold text-brand-blue transition-colors hover:bg-brand-sky/10"
          >
            {ticket.total_invoice_amount > 0 ? "Edit Invoice" : "Generate Invoice"}
          </button>
        )}
      </div>
    </div>
  );
}
