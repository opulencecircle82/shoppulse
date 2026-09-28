"use client";

import { useMemo, useState } from "react";
import type { JobTicket, Shop, StaffMember } from "@/lib/supabase/types";
import {
  JOB_FILTERS,
  jobFilterOf,
  needsOwnerAction,
  type JobFilterId,
} from "@/lib/dashboard/jobStatus";
import type { CustomerChatTarget } from "@/lib/chat/chat";
import { busyTechnicians } from "@/lib/dashboard/techBusy";
import JobRow from "./JobRow";

const PAGE_SIZE = 25;

/**
 * The job board: one container holding every job as a row, filtered by the
 * tabs across the top. Replaces the old side-by-side columns, which ran out
 * of room next to the docked map and scrolled sideways.
 */
export default function JobMasterTable({
  shop,
  tickets,
  staff,
  currentStaffId,
  filter,
  onFilterChange,
  onChanged,
  onOpenInvoice,
  onOpenProofDrawer,
  onMessageCustomer,
}: {
  shop: Shop;
  tickets: JobTicket[];
  staff: StaffMember[];
  currentStaffId: string | null;
  filter: JobFilterId;
  onFilterChange: (filter: JobFilterId) => void;
  onChanged: () => void;
  onOpenInvoice: (ticket: JobTicket) => void;
  onOpenProofDrawer: (ticket: JobTicket) => void;
  onMessageCustomer: (target: CustomerChatTarget) => void;
}) {
  // How many rows are showing, remembered per filter so switching tabs
  // starts a fresh page.
  const [pageState, setPageState] = useState({ filter, size: PAGE_SIZE });
  const pageSize = pageState.filter === filter ? pageState.size : PAGE_SIZE;

  // Technicians still working a job can't be handed another one.
  const busy = useMemo(() => busyTechnicians(tickets), [tickets]);

  // Emergencies first, then jobs that are waiting on the owner; otherwise the
  // newest-first order the tickets already arrive in.
  const sorted = useMemo(() => {
    const score = (t: JobTicket) => Number(t.is_emergency) * 2 + Number(needsOwnerAction(t));
    return [...tickets].sort((a, b) => score(b) - score(a));
  }, [tickets]);

  // "All Jobs" is the working list: cancelled and declined requests live under their own tab.
  const active = useMemo(() => sorted.filter((t) => jobFilterOf(t) !== "CANCELLED"), [sorted]);

  const counts = useMemo(() => {
    const result = { ALL: active.length } as Record<JobFilterId, number>;
    for (const f of JOB_FILTERS) {
      if (f.id !== "ALL") result[f.id] = sorted.filter((t) => jobFilterOf(t) === f.id).length;
    }
    return result;
  }, [sorted, active]);

  // A red dot on a tab that isn't open means something in it is waiting for the owner.
  const waitingOnOwner = (id: JobFilterId) =>
    id !== "ALL" && sorted.some((t) => jobFilterOf(t) === id && needsOwnerAction(t));

  const activeFilter = JOB_FILTERS.find((f) => f.id === filter) ?? JOB_FILTERS[0];
  // Newest cancellation first, so the one the owner just heard about is on top.
  const filtered =
    filter === "ALL"
      ? active
      : filter === "CANCELLED"
        ? sorted
            .filter((t) => jobFilterOf(t) === "CANCELLED")
            .sort((a, b) => Date.parse(b.cancelled_at ?? b.created_at) - Date.parse(a.cancelled_at ?? a.created_at))
        : sorted.filter((t) => jobFilterOf(t) === filter);
  const visible = filtered.slice(0, pageSize);
  const remaining = filtered.length - visible.length;

  return (
    <section className="@container overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm shadow-slate-900/5">
      <div className="border-b border-slate-100 px-5 py-4">
        <div role="tablist" aria-label="Filter jobs" className="flex flex-wrap gap-2">
          {JOB_FILTERS.map((f) => {
            const isActive = f.id === filter;
            const count = counts[f.id];
            return (
              <button
                key={f.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => onFilterChange(f.id)}
                className={`relative inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold transition-colors ${
                  isActive
                    ? "bg-brand-blue text-white shadow-md shadow-brand-blue/25"
                    : "border border-slate-200 bg-white text-slate-600 hover:border-brand-blue hover:text-brand-blue"
                }`}
              >
                {f.label}
                <span
                  className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                    isActive ? "bg-white/25 text-white" : "bg-slate-100 text-slate-500"
                  }`}
                >
                  {count}
                </span>
                {!isActive && waitingOnOwner(f.id) && (
                  <span className="absolute -right-0.5 -top-0.5 flex h-3 w-3">
                    <span className="absolute inset-0 animate-ping rounded-full bg-red-500 opacity-75" />
                    <span className="relative h-3 w-3 rounded-full bg-red-500" />
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {filtered.length === 0 ? (
        <p role="tabpanel" className="px-5 py-14 text-center text-sm text-slate-500">
          {activeFilter.empty}
        </p>
      ) : (
        <ul role="tabpanel" className="divide-y divide-slate-100">
          {visible.map((ticket) => (
            <JobRow
              key={ticket.id}
              ticket={ticket}
              staff={staff}
              shop={shop}
              currentStaffId={currentStaffId}
              busyTechnicians={busy}
              onChanged={onChanged}
              onOpenInvoice={onOpenInvoice}
              onOpenProofDrawer={onOpenProofDrawer}
              onMessageCustomer={onMessageCustomer}
            />
          ))}
        </ul>
      )}

      {remaining > 0 && (
        <div className="border-t border-slate-100 px-5 py-3 text-center">
          <button
            type="button"
            onClick={() => setPageState({ filter, size: pageSize + PAGE_SIZE })}
            className="rounded-full border border-slate-300 px-5 py-2 text-xs font-semibold text-slate-600 transition-colors hover:border-brand-blue hover:text-brand-blue"
          >
            Show {Math.min(PAGE_SIZE, remaining)} more · {remaining} remaining
          </button>
        </div>
      )}
    </section>
  );
}
