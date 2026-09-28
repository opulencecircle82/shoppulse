import type { JobStatus } from "@/lib/supabase/types";

export type Stage = {
  status: JobStatus;
  label: string;
  /** Fill color of the progress bar segments for a job at this stage. */
  dot: string;
};

export const STAGES: Stage[] = [
  { status: "PENDING", label: "Booking Requests", dot: "bg-brand-orange" },
  { status: "UNASSIGNED", label: "Unassigned", dot: "bg-brand-orange" },
  { status: "SCHEDULED", label: "Scheduled", dot: "bg-brand-sky" },
  { status: "ESTIMATE_PENDING", label: "Awaiting Quote Approval", dot: "bg-brand-blue-dark" },
  { status: "IN_PROGRESS", label: "In Progress", dot: "bg-brand-blue" },
  { status: "COMPLETED", label: "Completed", dot: "bg-brand-emerald" },
  { status: "DISPUTED", label: "Disputed", dot: "bg-red-500" },
  { status: "APPROVED", label: "Approved", dot: "bg-brand-emerald-dark" },
  { status: "CANCELLED", label: "Cancelled", dot: "bg-slate-400" },
];

export const STAGE_BY_STATUS = new Map(STAGES.map((stage) => [stage.status, stage]));

/** The happy path a job walks through, used for the per-job progress bar. */
export const PROCESS_STEPS: JobStatus[] = [
  "PENDING",
  "UNASSIGNED",
  "SCHEDULED",
  "ESTIMATE_PENDING",
  "IN_PROGRESS",
  "COMPLETED",
  "APPROVED",
];

/** Position in PROCESS_STEPS, or null for statuses that aren't on the path (cancelled). */
export function processStepIndex(status: JobStatus): number | null {
  // A dispute sits at the "completed" step — the work was done, then contested.
  if (status === "DISPUTED") return PROCESS_STEPS.indexOf("COMPLETED");
  const index = PROCESS_STEPS.indexOf(status);
  return index === -1 ? null : index;
}
