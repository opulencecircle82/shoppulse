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
  onAssigned,
}: {
  ticket: JobTicket;
  staff: StaffMember[];
  defaultTasks: string[];
  onAssigned: () => void;
}) {
  const [pendingAssignee, setPendingAssignee] = useState<StaffMember | null>(null);

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
        {staff.map((member) => (
          <option key={member.id} value={member.id}>
            {member.full_name}
          </option>
        ))}
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
