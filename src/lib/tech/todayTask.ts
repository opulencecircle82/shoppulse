import type { JobTicket } from "@/lib/supabase/types";

/**
 * Picks the technician's one task for today: whichever job they're
 * currently on-site for (IN_PROGRESS, or ESTIMATE_PENDING while they're
 * diagnosing/quoting before the customer approves), or else the earliest
 * SCHEDULED one. ESTIMATE_PENDING has to count as "active" here too -
 * otherwise a technician who just arrived and is filling out the on-site
 * estimate sees "No job assigned" until the customer approves the quote,
 * even though they're standing at the job with unfinished work.
 */
export function pickTodayTask(tickets: JobTicket[]): JobTicket | null {
  const active = tickets.find(
    (t) => t.status === "IN_PROGRESS" || t.status === "ESTIMATE_PENDING"
  );
  if (active) return active;

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

export type TechStats = {
  completedToday: number;
  completedTotal: number;
};

const FINISHED_STATUSES = new Set(["COMPLETED", "APPROVED", "DISPUTED"]);

/**
 * Real counts derived from the technician's own ticket history — no
 * placeholder numbers, so this stays honest even when both are 0.
 */
export function computeTechStats(tickets: JobTicket[]): TechStats {
  const today = new Date().toDateString();
  let completedToday = 0;
  let completedTotal = 0;

  for (const t of tickets) {
    if (!FINISHED_STATUSES.has(t.status)) continue;
    completedTotal += 1;
    if (t.completed_at && new Date(t.completed_at).toDateString() === today) {
      completedToday += 1;
    }
  }

  return { completedToday, completedTotal };
}
