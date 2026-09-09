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
  onOpenProofDrawer,
}: {
  tickets: JobTicket[];
  staff: StaffMember[];
  onChanged: () => void;
  onOpenInvoice: (ticket: JobTicket) => void;
  onOpenProofDrawer: (ticket: JobTicket) => void;
}) {
  return (
    <div className="flex w-full gap-4 overflow-x-auto pb-6">
      {COLUMNS.map((column) => {
        const columnTickets = tickets.filter((t) => t.status === column.status);
        return (
          <div key={column.status} className="w-[280px] min-w-[280px] shrink-0">
            <div className="flex items-center justify-between px-1">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                {column.label}
              </p>
              <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                {columnTickets.length}
              </span>
            </div>

            <div className="mt-2 space-y-3">
              {columnTickets.length === 0 && (
                <div className="rounded-2xl border border-dashed border-slate-300 p-4 text-center text-xs text-slate-400">
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
                  onOpenProofDrawer={
                    ticket.status === "COMPLETED" || ticket.status === "DISPUTED"
                      ? onOpenProofDrawer
                      : undefined
                  }
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
