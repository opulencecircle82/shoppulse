"use client";

import { useMemo, useState } from "react";
import type { JobStatus, JobTicket, Shop, StaffMember } from "@/lib/supabase/types";
import JobTicketCard from "./JobTicketCard";
import BookingRequestCard from "./BookingRequestCard";
import { FILTERS, FILTER_BY_ID, STAGES, STAGE_BY_STATUS, type JobFilterId } from "./stages";

const STAGE_ORDER = new Map<JobStatus, number>(STAGES.map((stage, i) => [stage.status, i]));

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
  const [selected, setSelected] = useState<JobFilterId | null>(null);

  // Tickets per tab. Emergencies float to the top, then jobs sit in process
  // order (booking request first); within a stage the newest-first order the
  // tickets already arrive in is kept.
  const byFilter = useMemo(() => {
    const sorted = [...tickets].sort(
      (a, b) =>
        Number(b.is_emergency) - Number(a.is_emergency) ||
        (STAGE_ORDER.get(a.status) ?? 0) - (STAGE_ORDER.get(b.status) ?? 0)
    );
    const groups = new Map<JobFilterId, JobTicket[]>();
    for (const filter of FILTERS) {
      groups.set(
        filter.id,
        filter.statuses ? sorted.filter((t) => filter.statuses!.includes(t.status)) : sorted
      );
    }
    return groups;
  }, [tickets]);

  // A tab is "waiting on the owner" when it holds a job in a stage that needs
  // the owner's action (new request, no technician, needs review, disputed).
  const waitingOnOwner = (id: JobFilterId) =>
    id !== "ALL" &&
    (byFilter.get(id) ?? []).some((t) => STAGE_BY_STATUS.get(t.status)?.needsAttention);

  // Until the owner picks a tab, open the one that most needs them, else the
  // first one with any jobs in it.
  const defaultId: JobFilterId =
    FILTERS.find((f) => waitingOnOwner(f.id))?.id ??
    FILTERS.find((f) => f.id !== "ALL" && (byFilter.get(f.id)?.length ?? 0) > 0)?.id ??
    "PENDING";
  const activeId = selected ?? defaultId;
  const activeFilter = FILTER_BY_ID.get(activeId)!;
  const activeTickets = byFilter.get(activeId) ?? [];

  // "3 Booking Requests · 1 Scheduled" — where the jobs in this tab really are.
  const breakdown = STAGES.map((stage) => ({
    stage,
    count: activeTickets.filter((t) => t.status === stage.status).length,
  })).filter((row) => row.count > 0);

  return (
    <div>
      {/* Five tabs, one shown at a time. Each carries a count, and a red dot
          marks the ones waiting on the owner, so nothing hides behind a tab
          that isn't selected. */}
      <div role="tablist" aria-label="Job filters" className="flex flex-wrap gap-2">
        {FILTERS.map((filter) => {
          const count = byFilter.get(filter.id)?.length ?? 0;
          const isActive = filter.id === activeId;
          const needsAttention = waitingOnOwner(filter.id) && !isActive;
          return (
            <button
              key={filter.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => setSelected(filter.id)}
              className={`relative inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold transition-colors ${
                isActive
                  ? "bg-brand-blue text-white shadow-md shadow-brand-blue/25"
                  : "border border-slate-200 bg-white text-slate-600 shadow-sm shadow-slate-900/5 hover:border-brand-blue hover:text-brand-blue"
              }`}
            >
              <span className={`h-2 w-2 rounded-full ${isActive ? "bg-white" : filter.dot}`} />
              {filter.label}
              <span
                className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                  isActive
                    ? "bg-white/25 text-white"
                    : count > 0
                      ? filter.badge
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
          className={`rounded-2xl border border-t-[3px] border-slate-200/70 bg-white px-4 py-3 shadow-sm shadow-slate-900/5 ${activeFilter.accent}`}
        >
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${activeFilter.dot}`} />
                <h3 className="text-sm font-semibold text-slate-900">{activeFilter.label}</h3>
              </div>
              <p className="mt-1 text-xs text-slate-500">{activeFilter.hint}</p>
            </div>
            <span
              className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold ${activeFilter.badge}`}
            >
              {activeTickets.length}
            </span>
          </div>
          {breakdown.length > 1 && (
            <div className="mt-3 flex flex-wrap gap-1.5 border-t border-slate-100 pt-3">
              {breakdown.map(({ stage, count }) => (
                <span
                  key={stage.status}
                  className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${stage.badge}`}
                >
                  <span className={`h-1.5 w-1.5 rounded-full ${stage.dot}`} />
                  {count} {stage.label}
                </span>
              ))}
            </div>
          )}
        </div>

        {activeTickets.length === 0 ? (
          <div className="mt-4 rounded-2xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">
            {activeFilter.empty}
          </div>
        ) : (
          <div className="mt-4 grid grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-3">
            {activeTickets.map((ticket) =>
              ticket.status === "PENDING" ? (
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
