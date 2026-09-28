import type { JobTicket } from "@/lib/supabase/types";
import { formatJobNumber } from "@/lib/jobNumber";

/**
 * A job that keeps its technician busy: they are on site or working (ESTIMATE_PENDING / IN_PROGRESS) or already on
 * the way (SCHEDULED with en_route_at). Jobs that only wait in their queue don't. The database enforces the same rule
 * (guard_busy_technician) — this is what lets the screens explain it before anyone hits the error.
 */
export function keepsTechnicianBusy(ticket: Pick<JobTicket, "status" | "en_route_at">): boolean {
  return (
    ticket.status === "ESTIMATE_PENDING" ||
    ticket.status === "IN_PROGRESS" ||
    (ticket.status === "SCHEDULED" && Boolean(ticket.en_route_at))
  );
}

/** Technician id → the job they are still busy on, e.g. "#JOB-0001". */
export function busyTechnicians(tickets: JobTicket[]): Map<string, string> {
  const busy = new Map<string, string>();
  for (const ticket of tickets) {
    if (ticket.assigned_staff_id && keepsTechnicianBusy(ticket) && !busy.has(ticket.assigned_staff_id)) {
      busy.set(ticket.assigned_staff_id, formatJobNumber(ticket.job_number, ticket.id));
    }
  }
  return busy;
}
