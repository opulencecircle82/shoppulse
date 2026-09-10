import type { JobTicket } from "@/lib/supabase/types";

/**
 * Picks the technician's one task for today: whichever job is currently
 * IN_PROGRESS, or else the earliest SCHEDULED one. Mirrors the mobile
 * app's HomeScreen._pickTodayTask so both surfaces behave identically.
 */
export function pickTodayTask(tickets: JobTicket[]): JobTicket | null {
  const inProgress = tickets.find((t) => t.status === "IN_PROGRESS");
  if (inProgress) return inProgress;

  const scheduled = [...tickets]
    .reverse()
    .find((t) => t.status === "SCHEDULED");
  return scheduled ?? null;
}

/**
 * The rest of the technician's queued work — every other SCHEDULED job
 * besides today's active task (and one awaiting the technician's own
 * accept/decline still shows up here too), oldest-assigned first so the
 * next one up is at the top.
 */
export function pickJobQueue(tickets: JobTicket[], activeTask: JobTicket | null): JobTicket[] {
  return tickets
    .filter((t) => t.status === "SCHEDULED" && t.id !== activeTask?.id)
    .reverse();
}
