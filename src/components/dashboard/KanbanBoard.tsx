"use client";

import { useState } from "react";
import type { JobStatus, JobTicket, Shop, StaffMember } from "@/lib/supabase/types";
import JobTicketCard from "./JobTicketCard";
import BookingRequestCard from "./BookingRequestCard";

const COLUMNS: { status: JobStatus; label: string }[] = [
  { status: "PENDING", label: "Booking Requests" },
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
  const [activeStatus, setActiveStatus] = useState<JobStatus>("PENDING");
  const activeTickets = tickets.filter((t) => t.status === activeStatus);

  return (
    <div>
      {/* Status filter pills replace the old side-by-side Kanban columns —
          those required horizontal drag-scrolling to reach Completed/
          Disputed/Approved, which hid the invoice info off-screen with no
          visual hint it was there. One status at a time, full width,
          normal page scroll only. */}
      <div className="flex flex-wrap gap-2">
        {COLUMNS.map((column) => {
          const count = tickets.filter((t) => t.status === column.status).length;
          const isActive = activeStatus === column.status;
          return (
            <button
              key={column.status}
              type="button"
              onClick={() => setActiveStatus(column.status)}
              className={`flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold transition-colors ${
                isActive
                  ? "bg-brand-blue text-white shadow-[0_0_20px_rgba(37,99,235,0.35)]"
                  : "bg-white/5 text-slate-400 hover:text-white"
              }`}
            >
              {column.label}
              <span
                className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${
                  isActive ? "bg-white/20 text-white" : "bg-white/10 text-slate-300"
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      <div className="mt-5">
        {activeTickets.length === 0 && (
          <div className="rounded-2xl border border-dashed border-white/20 p-8 text-center text-sm text-slate-500">
            {activeStatus === "PENDING" ? "No pending requests" : "No jobs in this status"}
          </div>
        )}

        {activeTickets.length > 0 && (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {activeStatus === "PENDING"
              ? activeTickets.map((ticket) => (
                  <BookingRequestCard
                    key={ticket.id}
                    ticket={ticket}
                    shop={shop}
                    onChanged={onChanged}
                  />
                ))
              : activeTickets.map((ticket) => (
                  <JobTicketCard
                    key={ticket.id}
                    ticket={ticket}
                    staff={staff}
                    defaultTasks={shop.default_tasks}
                    shopId={shop.id}
                    currency={shop.currency}
                    currentStaffId={currentStaffId}
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
        )}
      </div>
    </div>
  );
}
