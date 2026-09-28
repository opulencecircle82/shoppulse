import type { JobStatus } from "@/lib/supabase/types";

export type Stage = {
  status: JobStatus;
  label: string;
  /** One line telling the owner what a job in this stage is waiting on. */
  hint: string;
  empty: string;
  dot: string;
  accent: string;
  badge: string;
  /** Jobs in this stage are waiting on the owner, so the tab gets an alert dot. */
  needsAttention: boolean;
};

export const STAGES: Stage[] = [
  {
    status: "PENDING",
    label: "Booking Requests",
    hint: "New requests waiting for you to accept or reject.",
    empty: "No new booking requests",
    dot: "bg-brand-orange",
    accent: "border-t-brand-orange",
    badge: "bg-brand-orange/15 text-brand-orange-dark",
    needsAttention: true,
  },
  {
    status: "UNASSIGNED",
    label: "Unassigned",
    hint: "Accepted jobs that still need a technician.",
    empty: "Every job has a technician",
    dot: "bg-brand-orange",
    accent: "border-t-brand-orange",
    badge: "bg-brand-orange/15 text-brand-orange-dark",
    needsAttention: true,
  },
  {
    status: "SCHEDULED",
    label: "Scheduled",
    hint: "A technician is assigned and getting ready to head out.",
    empty: "Nothing scheduled",
    dot: "bg-brand-sky",
    accent: "border-t-brand-sky",
    badge: "bg-brand-sky/15 text-sky-700",
    needsAttention: false,
  },
  {
    status: "ESTIMATE_PENDING",
    label: "Awaiting Quote Approval",
    hint: "The technician is on site — waiting on their quote or the customer's approval.",
    empty: "No quotes waiting on a customer",
    dot: "bg-brand-blue-dark",
    accent: "border-t-brand-blue-dark",
    badge: "bg-brand-blue-dark/15 text-brand-blue-dark",
    needsAttention: false,
  },
  {
    status: "IN_PROGRESS",
    label: "In Progress",
    hint: "Repair under way. Confirm payment once the customer has paid.",
    empty: "No jobs in progress",
    dot: "bg-brand-blue",
    accent: "border-t-brand-blue",
    badge: "bg-brand-blue/15 text-brand-blue",
    needsAttention: false,
  },
  {
    status: "COMPLETED",
    label: "Completed",
    hint: "Work is done — review the proof and approve it.",
    empty: "No jobs waiting for your review",
    dot: "bg-brand-emerald",
    accent: "border-t-brand-emerald",
    badge: "bg-brand-emerald/15 text-brand-emerald-dark",
    needsAttention: true,
  },
  {
    status: "DISPUTED",
    label: "Disputed",
    hint: "The customer raised a problem — review the proof pack.",
    empty: "No disputes",
    dot: "bg-red-500",
    accent: "border-t-red-500",
    badge: "bg-red-500/15 text-red-600",
    needsAttention: true,
  },
  {
    status: "APPROVED",
    label: "Approved",
    hint: "Approved and invoiced. Mark it paid once the money is in.",
    empty: "No approved jobs yet",
    dot: "bg-brand-emerald-dark",
    accent: "border-t-brand-emerald-dark",
    badge: "bg-brand-emerald-dark/15 text-brand-emerald-dark",
    needsAttention: false,
  },
  {
    status: "CANCELLED",
    label: "Cancelled",
    hint: "Cancelled by the customer.",
    empty: "No cancelled jobs",
    dot: "bg-slate-400",
    accent: "border-t-slate-400",
    badge: "bg-slate-200 text-slate-600",
    needsAttention: false,
  },
];

export const STAGE_BY_STATUS = new Map(STAGES.map((stage) => [stage.status, stage]));

/** The happy path a job walks through, used for the per-card progress bar. */
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
