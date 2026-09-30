"use client";

import { useState } from "react";
import type { JobTicket, StaffMember } from "@/lib/supabase/types";
import AssignTaskingModal from "./AssignTaskingModal";

/**
 * "Assign Tech..." dropdown for a job that doesn't have a technician yet.
 * Picking someone opens the tasking modal (the start/end checklist they'll be
 * given); the job is only assigned once that is confirmed.
 */
export default function AssignTechSelect({
  ticket,
  staff,
  defaultTasks,
  busy,
  onAssigned,
}: {
  ticket: JobTicket;
  staff: StaffMember[];
  defaultTasks: string[];
  /** Technician id → the job they are still busy on; those people can't be picked yet. */
  busy: Map<string, string>;
  onAssigned: () => void;
}) {
  const [pendingAssignee, setPendingAssignee] = useState<StaffMember | null>(null);

  // Only technicians do field work — an owner or manager (whose "name" can even be their bare email,
  // e.g. a Google sign-in with no display name set) never belongs in this list. A technician can
  // also only ever be assigned within their own branch (enforced again at the database trigger
  // level) — filtering both here means the owner never even sees an invalid choice.
  const eligibleStaff = staff.filter(
    (s) => s.role === "TECHNICIAN" && (s.branch_id ?? null) === (ticket.branch_id ?? null)
  );

  return (
    <>
      <select
        value=""
        aria-label={`Assign a technician to job for ${ticket.client_name}`}
        onChange={(e) => {
          const member = staff.find((s) => s.id === e.target.value);
          if (member) setPendingAssignee(member);
        }}
        className="w-full max-w-[220px] rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs text-slate-900 focus:ring-2 focus:ring-brand-blue focus:outline-none [color-scheme:light]"
      >
        <option value="">Assign Tech...</option>
        {eligibleStaff.map((member) => {
          const busyOn = busy.get(member.id);
          return (
            <option key={member.id} value={member.id} disabled={Boolean(busyOn)}>
              {busyOn ? `${member.full_name} — busy on ${busyOn}` : member.full_name}
            </option>
          );
        })}
      </select>

      {pendingAssignee && (
        <AssignTaskingModal
          ticket={ticket}
          staffMember={pendingAssignee}
          defaultTasks={defaultTasks}
          onClose={() => setPendingAssignee(null)}
          onAssigned={() => {
            setPendingAssignee(null);
            onAssigned();
          }}
        />
      )}
    </>
  );
}
