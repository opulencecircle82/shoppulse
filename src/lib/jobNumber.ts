/**
 * The ticket number every screen shows for a job: #JOB-0007. The number is
 * the per-shop counter the database hands out when the request is created
 * (see the assign_job_number trigger), padded so it always reads the same
 * length; a shop past 9,999 jobs simply gets a longer number. One function,
 * so the owner's table, the technician's app, the customer's app and the
 * receipts can never disagree about how a ticket is written.
 */
export function formatJobNumber(jobNumber: number | null | undefined, fallbackId?: string): string {
  if (typeof jobNumber === "number") return `#JOB-${String(jobNumber).padStart(4, "0")}`;
  return `#JOB-${(fallbackId ?? "").slice(0, 6).toUpperCase() || "----"}`;
}
