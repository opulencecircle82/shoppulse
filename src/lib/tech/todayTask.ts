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
