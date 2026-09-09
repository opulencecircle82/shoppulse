"use client";

import type { JobStatus, JobTicket, StaffMember } from "@/lib/supabase/types";
import JobTicketCard from "./JobTicketCard";

const COLUMNS: { status: JobStatus; label: string }[] = [
  { status: "UNASSIGNED", label: "Unassigned" },
  { status: "SCHEDULED", label: "Scheduled" },
  { status: "IN_PROGRESS", label: "In Progress" },
  { status: "COMPLETED", label: "Completed" },
  { status: "DISPUTED", label: "Disputed" },
  { status: "APPROVED", label: "Approved" },
];

export default function KanbanBoard({
  tickets,
  staff,
  onChanged,
  onOpenInvoice,
  onOpenDispute,
}: {
  tickets: JobTicket[];
  staff: StaffMember[];
  onChanged: () => void;
  onOpenInvoice: (ticket: JobTicket) => void;
  onOpenDispute: (ticket: JobTicket) => void;
}) {
  return (
    <div className="grid grid-cols-1 gap-4 overflow-x-auto sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
      {COLUMNS.map((column) => {
        const columnTickets = tickets.filter((t) => t.status === column.status);
        return (
          <div key={column.status} className="min-w-[240px]">
            <div className="flex items-center justify-between px-1">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                {column.label}
              </p>
              <span className="rounded-full bg-slate-700/50 px-2 py-0.5 text-[10px] font-semibold text-slate-300">
                {columnTickets.length}
              </span>
            </div>

            <div className="mt-2 space-y-3">
              {columnTickets.length === 0 && (
                <div className="rounded-xl border border-dashed border-slate-700 p-4 text-center text-xs text-slate-500">
                  No jobs
                </div>
              )}
              {columnTickets.map((ticket) => (
                <JobTicketCard
                  key={ticket.id}
                  ticket={ticket}
                  staff={staff}
                  onChanged={onChanged}
                  onOpenInvoice={onOpenInvoice}
                  onOpenDispute={onOpenDispute}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
