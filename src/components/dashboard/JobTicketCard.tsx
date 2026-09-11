"use client";

import { useState } from "react";
import type { JobTicket, StaffMember } from "@/lib/supabase/types";
import AssignTaskingModal from "./AssignTaskingModal";

export default function JobTicketCard({
  ticket,
  staff,
  defaultTasks,
  onChanged,
  onOpenInvoice,
  onOpenProofDrawer,
}: {
  ticket: JobTicket;
  staff: StaffMember[];
  defaultTasks: string[];
  onChanged: () => void;
  onOpenInvoice: (ticket: JobTicket) => void;
  onOpenProofDrawer?: (ticket: JobTicket) => void;
}) {
  const [linkCopied, setLinkCopied] = useState(false);
  const [pendingAssignee, setPendingAssignee] = useState<StaffMember | null>(null);
  const assignedStaff = staff.find((s) => s.id === ticket.assigned_staff_id);

  function copyClientLink() {
    const link = `${window.location.origin}/client/${ticket.id}`;
    navigator.clipboard.writeText(link);
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2000);
  }

  return (
    <div
      onClick={() => onOpenProofDrawer?.(ticket)}
      className={`rounded-2xl bg-white/5 p-4 shadow-md shadow-black/20 ${
        onOpenProofDrawer ? "cursor-pointer transition-shadow hover:shadow-lg hover:shadow-brand-blue/10" : ""
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-white">
            {ticket.client_name}
          </p>
          <p className="mt-0.5 text-xs text-slate-400">{ticket.service_type}</p>
          <p className="mt-1 truncate text-xs text-slate-500">
            {ticket.service_address}
          </p>
        </div>
        {ticket.status === "DISPUTED" && (
          <span className="shrink-0 rounded-full bg-red-500/15 px-2 py-0.5 text-[10px] font-semibold text-red-400">
            Disputed
          </span>
        )}
      </div>

      <p className="mt-1.5 text-[10px] text-slate-500">
        {ticket.client_viewed_at
          ? `Client viewed ${new Date(ticket.client_viewed_at).toLocaleDateString()}`
          : "Not yet viewed by client"}
      </p>

      {ticket.status === "UNASSIGNED" ? (
        <select
          value=""
          onChange={(e) => {
            const member = staff.find((s) => s.id === e.target.value);
            if (member) setPendingAssignee(member);
          }}
          onClick={(e) => e.stopPropagation()}
          className="mt-3 w-full rounded-xl bg-white/5 px-2.5 py-1.5 text-xs text-white focus:ring-2 focus:ring-brand-blue focus:outline-none"
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

      {(ticket.status === "COMPLETED" || ticket.status === "DISPUTED") && (
        <p className="mt-3 text-xs font-medium text-brand-blue">
          Click card to review proof →
        </p>
      )}

      <div
        className="mt-3 flex flex-wrap gap-2"
        onClick={(e) => e.stopPropagation()}
      >
        {ticket.status === "SCHEDULED" && !ticket.staff_accepted_at && (
          <p className="text-xs text-amber-400">
            Waiting for {assignedStaff?.full_name ?? "the technician"} to
            confirm this job.
          </p>
        )}

        {ticket.status === "SCHEDULED" && ticket.staff_accepted_at && (
          <p className="text-xs text-slate-400">
            Confirmed — waiting for {assignedStaff?.full_name ?? "the technician"} to
            start this job from the mobile app.
          </p>
        )}

        {ticket.status === "IN_PROGRESS" && (
          <p className="text-xs text-slate-400">
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

        {ticket.status !== "UNASSIGNED" && (
          <button
            type="button"
            onClick={copyClientLink}
            className="rounded-full border border-white/20 px-3 py-1.5 text-xs font-semibold text-slate-300 transition-colors hover:border-brand-blue hover:text-brand-blue"
          >
            {linkCopied ? "Link copied!" : "Copy Client Link"}
          </button>
        )}
      </div>

      {pendingAssignee && (
        <div onClick={(e) => e.stopPropagation()}>
          <AssignTaskingModal
            ticket={ticket}
            staffMember={pendingAssignee}
            defaultTasks={defaultTasks}
            onClose={() => setPendingAssignee(null)}
            onAssigned={() => {
              setPendingAssignee(null);
              onChanged();
            }}
          />
        </div>
      )}
    </div>
  );
}
