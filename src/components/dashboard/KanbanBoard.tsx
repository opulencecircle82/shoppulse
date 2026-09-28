"use client";

import { useMemo } from "react";
import type { JobStatus, JobTicket, Shop, StaffMember } from "@/lib/supabase/types";
import JobTicketCard from "./JobTicketCard";
import BookingRequestCard from "./BookingRequestCard";

const COLUMNS: {
  status: JobStatus;
  label: string;
  dot: string;
  accent: string;
  badge: string;
  empty: string;
}[] = [
  { status: "PENDING", label: "Booking Requests", dot: "bg-brand-orange", accent: "border-t-brand-orange", badge: "bg-brand-orange/15 text-brand-orange-dark", empty: "No new booking requests" },
  { status: "UNASSIGNED", label: "Unassigned", dot: "bg-amber-500", accent: "border-t-amber-500", badge: "bg-brand-orange/15 text-brand-orange-dark", empty: "Every job has a technician" },
  { status: "SCHEDULED", label: "Scheduled", dot: "bg-brand-sky", accent: "border-t-brand-sky", badge: "bg-brand-sky/15 text-sky-700", empty: "Nothing scheduled" },
  { status: "ESTIMATE_PENDING", label: "Awaiting Quote Approval", dot: "bg-brand-blue-dark", accent: "border-t-brand-blue-dark", badge: "bg-brand-blue-dark/15 text-brand-blue-dark", empty: "No quotes waiting on a customer" },
  { status: "IN_PROGRESS", label: "In Progress", dot: "bg-brand-blue", accent: "border-t-brand-blue", badge: "bg-brand-blue/15 text-brand-blue", empty: "No jobs in progress" },
  { status: "COMPLETED", label: "Completed", dot: "bg-brand-emerald", accent: "border-t-brand-emerald", badge: "bg-brand-emerald/15 text-brand-emerald-dark", empty: "No jobs waiting for your review" },
  { status: "DISPUTED", label: "Disputed", dot: "bg-red-500", accent: "border-t-red-500", badge: "bg-red-500/15 text-red-600", empty: "No disputes" },
  { status: "APPROVED", label: "Approved", dot: "bg-brand-emerald-dark", accent: "border-t-brand-emerald-dark", badge: "bg-brand-emerald-dark/15 text-brand-emerald-dark", empty: "No approved jobs yet" },
  { status: "CANCELLED", label: "Cancelled", dot: "bg-slate-400", accent: "border-t-slate-400", badge: "bg-slate-200 text-slate-600", empty: "No cancelled jobs" },
];

export default function KanbanBoard({
  shop,
  tickets,
  staff,
  currentStaffId,
  onChanged,
  onOpenInvoice,
  onOpenProofDrawer,
}: {
  shop: Shop;
  tickets: JobTicket[];
  staff: StaffMember[];
  currentStaffId: string | null;
  onChanged: () => void;
  onOpenInvoice: (ticket: JobTicket) => void;
  onOpenProofDrawer: (ticket: JobTicket) => void;
}) {
  const byStatus = useMemo(() => {
    const groups = new Map<JobStatus, JobTicket[]>();
    for (const column of COLUMNS) groups.set(column.status, []);
    for (const ticket of tickets) groups.get(ticket.status)?.push(ticket);
    // Emergencies float to the top of their lane; the rest keep the
    // newest-first order the tickets already arrive in.
    for (const list of groups.values()) {
      list.sort((a, b) => Number(b.is_emergency) - Number(a.is_emergency));
    }
    return groups;
  }, [tickets]);

  function jumpTo(status: JobStatus) {
    document
      .getElementById(`kanban-col-${status}`)
      ?.scrollIntoView({ behavior: "smooth", inline: "start", block: "nearest" });
  }

  return (
    <div>
      {/* One lane per stage, side by side. Nine lanes never fit on screen
          at once, so this row lists every stage with its count and jumps
          the board to it — nothing sits off-screen without a visible hint. */}
      <div className="flex flex-wrap gap-2">
        {COLUMNS.map((column) => (
          <button
            key={column.status}
            type="button"
            onClick={() => jumpTo(column.status)}
            className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 shadow-sm shadow-slate-900/5 transition-colors hover:border-brand-blue hover:text-brand-blue"
          >
            <span className={`h-2 w-2 rounded-full ${column.dot}`} />
            {column.label}
            <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-600">
              {byStatus.get(column.status)?.length ?? 0}
            </span>
          </button>
        ))}
      </div>

      <div className="mt-4 flex gap-4 overflow-x-auto pb-4 [scrollbar-color:#cbd5e1_transparent] [scrollbar-width:thin]">
        {COLUMNS.map((column) => {
          const columnTickets = byStatus.get(column.status) ?? [];
          return (
            <section
              key={column.status}
              id={`kanban-col-${column.status}`}
              className={`flex max-h-[75vh] min-h-[360px] w-[320px] shrink-0 flex-col rounded-2xl border border-t-[3px] border-slate-200/70 bg-slate-100/70 ${column.accent}`}
            >
              <header className="flex items-center justify-between gap-2 px-4 pb-3 pt-3.5">
                <div className="flex min-w-0 items-center gap-2">
                  <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${column.dot}`} />
                  <h3 className="truncate text-sm font-semibold text-slate-900">{column.label}</h3>
                </div>
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${column.badge}`}>
                  {columnTickets.length}
                </span>
              </header>

              <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-3 pb-3">
                {columnTickets.length === 0 && (
                  <div className="rounded-xl border border-dashed border-slate-300 px-3 py-8 text-center text-xs text-slate-500">
                    {column.empty}
                  </div>
                )}

                {columnTickets.map((ticket) =>
                  column.status === "PENDING" ? (
                    <BookingRequestCard
                      key={ticket.id}
                      ticket={ticket}
                      shop={shop}
                      onChanged={onChanged}
                    />
                  ) : (
                    <JobTicketCard
                      key={ticket.id}
                      ticket={ticket}
                      staff={staff}
                      defaultTasks={shop.default_tasks}
                      shop={shop}
                      currentStaffId={currentStaffId}
                      onChanged={onChanged}
                      onOpenInvoice={onOpenInvoice}
                      onOpenProofDrawer={
                        ticket.status === "COMPLETED" || ticket.status === "DISPUTED"
                          ? onOpenProofDrawer
                          : undefined
                      }
                    />
                  )
                )}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
