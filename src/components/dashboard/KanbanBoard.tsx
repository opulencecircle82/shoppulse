"use client";

import { useMemo, useState } from "react";
import type { JobStatus, JobTicket, Shop, StaffMember } from "@/lib/supabase/types";
import JobTicketCard from "./JobTicketCard";
import BookingRequestCard from "./BookingRequestCard";
import { STAGES, STAGE_BY_STATUS } from "./stages";

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
  const [selected, setSelected] = useState<JobStatus | null>(null);

  const byStatus = useMemo(() => {
    const groups = new Map<JobStatus, JobTicket[]>();
    for (const stage of STAGES) groups.set(stage.status, []);
    for (const ticket of tickets) groups.get(ticket.status)?.push(ticket);
    // Emergencies float to the top; the rest keep the newest-first order
    // the tickets already arrive in.
    for (const list of groups.values()) {
      list.sort((a, b) => Number(b.is_emergency) - Number(a.is_emergency));
    }
    return groups;
  }, [tickets]);

  // Until the owner picks a stage, open the first one that has jobs in it.
  const firstBusy = STAGES.find((stage) => (byStatus.get(stage.status)?.length ?? 0) > 0)?.status;
  const activeStatus = selected ?? firstBusy ?? "PENDING";
  const activeStage = STAGE_BY_STATUS.get(activeStatus)!;
  const activeTickets = byStatus.get(activeStatus) ?? [];

  return (
    <div>
      {/* One stage at a time, full width, normal page scroll. The tabs carry
          a count for every stage plus a red dot on the ones waiting on the
          owner, so nothing hides behind the tab that isn't selected. */}
      <div role="tablist" aria-label="Job stages" className="flex flex-wrap gap-2">
        {STAGES.map((stage) => {
          const count = byStatus.get(stage.status)?.length ?? 0;
          const isActive = stage.status === activeStatus;
          const needsAttention = stage.needsAttention && count > 0 && !isActive;
          return (
            <button
              key={stage.status}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => setSelected(stage.status)}
              className={`relative inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold transition-colors ${
                isActive
                  ? "bg-brand-blue text-white shadow-md shadow-brand-blue/25"
                  : "border border-slate-200 bg-white text-slate-600 shadow-sm shadow-slate-900/5 hover:border-brand-blue hover:text-brand-blue"
              }`}
            >
              <span className={`h-2 w-2 rounded-full ${isActive ? "bg-white" : stage.dot}`} />
              {stage.label}
              <span
                className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                  isActive
                    ? "bg-white/25 text-white"
                    : count > 0
                      ? stage.badge
                      : "bg-slate-100 text-slate-500"
                }`}
              >
                {count}
              </span>
              {needsAttention && (
                <span className="absolute -right-0.5 -top-0.5 flex h-3 w-3">
                  <span className="absolute inset-0 animate-ping rounded-full bg-red-500 opacity-75" />
                  <span className="relative h-3 w-3 rounded-full bg-red-500" />
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div role="tabpanel" className="mt-5">
        <div
          className={`flex items-center justify-between gap-3 rounded-2xl border border-t-[3px] border-slate-200/70 bg-white px-4 py-3 shadow-sm shadow-slate-900/5 ${activeStage.accent}`}
        >
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${activeStage.dot}`} />
              <h3 className="text-sm font-semibold text-slate-900">{activeStage.label}</h3>
            </div>
            <p className="mt-1 text-xs text-slate-500">{activeStage.hint}</p>
          </div>
          <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold ${activeStage.badge}`}>
            {activeTickets.length}
          </span>
        </div>

        {activeTickets.length === 0 ? (
          <div className="mt-4 rounded-2xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">
            {activeStage.empty}
          </div>
        ) : (
          <div className="mt-4 grid grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-3">
            {activeTickets.map((ticket) =>
              activeStatus === "PENDING" ? (
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
        )}
      </div>
    </div>
  );
}
