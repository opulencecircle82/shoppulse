"use client";

import type { JobStatus, JobTicket, Shop, StaffMember } from "@/lib/supabase/types";
import JobTicketCard from "./JobTicketCard";
import BookingRequestCard from "./BookingRequestCard";

const COLUMNS: { status: JobStatus; label: string }[] = [
  { status: "UNASSIGNED", label: "Unassigned" },
  { status: "SCHEDULED", label: "Scheduled" },
  { status: "IN_PROGRESS", label: "In Progress" },
  { status: "COMPLETED", label: "Completed" },
  { status: "DISPUTED", label: "Disputed" },
  { status: "APPROVED", label: "Approved" },
];

export default function KanbanBoard({
  shop,
  tickets,
  staff,
  onChanged,
  onOpenInvoice,
  onOpenProofDrawer,
}: {
  shop: Shop;
  tickets: JobTicket[];
  staff: StaffMember[];
  onChanged: () => void;
  onOpenInvoice: (ticket: JobTicket) => void;
  onOpenProofDrawer: (ticket: JobTicket) => void;
}) {
  const pendingTickets = tickets.filter((t) => t.status === "PENDING");

  return (
    <div className="flex w-full gap-4 overflow-x-auto pb-6">
      <div className="w-[280px] min-w-[280px] shrink-0">
        <div className="flex items-center justify-between px-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Booking Requests
          </p>
          <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-semibold text-slate-300">
            {pendingTickets.length}
          </span>
        </div>
        <div className="mt-2 space-y-3">
          {pendingTickets.length === 0 && (
            <div className="rounded-2xl border border-dashed border-white/20 p-4 text-center text-xs text-slate-500">
              No pending requests
            </div>
          )}
          {pendingTickets.map((ticket) => (
            <BookingRequestCard
              key={ticket.id}
              ticket={ticket}
              shop={shop}
              onChanged={onChanged}
            />
          ))}
        </div>
      </div>

      {COLUMNS.map((column) => {
        const columnTickets = tickets.filter((t) => t.status === column.status);
        return (
          <div key={column.status} className="w-[280px] min-w-[280px] shrink-0">
            <div className="flex items-center justify-between px-1">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                {column.label}
              </p>
              <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-semibold text-slate-300">
                {columnTickets.length}
              </span>
            </div>

            <div className="mt-2 space-y-3">
              {columnTickets.length === 0 && (
                <div className="rounded-2xl border border-dashed border-white/20 p-4 text-center text-xs text-slate-500">
                  No jobs
                </div>
              )}
              {columnTickets.map((ticket) => (
                <JobTicketCard
                  key={ticket.id}
                  ticket={ticket}
                  staff={staff}
                  defaultTasks={shop.default_tasks}
                  shopId={shop.id}
                  currency={shop.currency}
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
