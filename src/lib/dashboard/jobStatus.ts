import type { JobTicket } from "@/lib/supabase/types";
import { formatJobNumber } from "@/lib/jobNumber";
import { timeAgo } from "./format";

/**
 * How the owner's job table reads a ticket. The database only knows coarse
 * statuses (SCHEDULED, IN_PROGRESS...); the owner cares about the finer
 * picture — has the technician confirmed, set off, arrived — so it is worked
 * out here from the ticket's timestamps, in one place, for every row.
 */

export type Tone = "orange" | "yellow" | "green" | "red" | "blue" | "slate";

export const TONE_CLASSES: Record<Tone, { badge: string; bar: string }> = {
  orange: { badge: "bg-brand-orange/15 text-brand-orange-dark", bar: "bg-brand-orange" },
  yellow: { badge: "bg-amber-100 text-amber-700", bar: "bg-amber-400" },
  green: { badge: "bg-brand-emerald/15 text-brand-emerald-dark", bar: "bg-brand-emerald" },
  red: { badge: "bg-red-500/15 text-red-600", bar: "bg-red-500" },
  blue: { badge: "bg-brand-blue/15 text-brand-blue", bar: "bg-brand-blue" },
  slate: { badge: "bg-slate-200 text-slate-600", bar: "bg-slate-400" },
};

export type JobPhase = {
  /** Current stage, colour-coded: yellow for preparing/en route, green for on-site work, red disputed, blue done. */
  stage: string;
  tone: Tone;
  /** What the technician is doing right now, or null when nobody is assigned. */
  techStatus: string | null;
  /** How long it has been like this, e.g. "Left 5m ago". */
  detail: string | null;
  /** The technician's arrival was GPS-checked against the job site. */
  gpsVerified: boolean;
};

export function jobLabel(ticket: JobTicket): string {
  return formatJobNumber(ticket.job_number, ticket.id);
}

export function describeJob(ticket: JobTicket): JobPhase {
  const gpsVerified = ticket.start_geofence_distance_m !== null;

  switch (ticket.status) {
    case "PENDING":
      return {
        stage: "Awaiting Approval",
        tone: "orange",
        techStatus: null,
        detail: `Requested ${timeAgo(ticket.created_at)}`,
        gpsVerified: false,
      };
    case "UNASSIGNED":
      return {
        stage: "Needs Technician",
        tone: "orange",
        techStatus: null,
        detail: `Requested ${timeAgo(ticket.created_at)}`,
        gpsVerified: false,
      };
    case "SCHEDULED":
      if (!ticket.staff_accepted_at) {
        return {
          stage: "Awaiting Confirmation",
          tone: "yellow",
          techStatus: "Not Yet Confirmed",
          detail: "Waiting for the technician to accept",
          gpsVerified: false,
        };
      }
      if (!ticket.en_route_at) {
        return {
          stage: "Preparing",
          tone: "yellow",
          techStatus: "Preparing",
          detail: `Confirmed ${timeAgo(ticket.staff_accepted_at)}`,
          gpsVerified: false,
        };
      }
      return {
        stage: "En Route",
        tone: "yellow",
        techStatus: "En Route",
        detail: `Left ${timeAgo(ticket.en_route_at)}`,
        gpsVerified: false,
      };
    case "ESTIMATE_PENDING":
      return ticket.quote_submitted_at
        ? {
            stage: "Quote Sent",
            tone: "yellow",
            techStatus: "On-Site",
            detail: `Waiting on the customer · sent ${timeAgo(ticket.quote_submitted_at)}`,
            gpsVerified,
          }
        : {
            stage: "On-Site",
            tone: "green",
            techStatus: "On-Site",
            detail: ticket.started_at ? `Arrived ${timeAgo(ticket.started_at)}` : null,
            gpsVerified,
          };
    case "IN_PROGRESS":
      return {
        stage: "In Progress",
        tone: "green",
        techStatus: "Working",
        detail:
          [
            ticket.started_at ? `Started ${timeAgo(ticket.started_at)}` : null,
            ticket.payment_status !== "PAID" && ticket.total_invoice_amount > 0 ? "payment pending" : null,
          ]
            .filter(Boolean)
            .join(" · ") || null,
        gpsVerified,
      };
    case "COMPLETED":
      return {
        stage: "Completed",
        tone: "blue",
        techStatus: "Job Done",
        detail: ticket.completed_at ? `Finished ${timeAgo(ticket.completed_at)}` : null,
        gpsVerified,
      };
    case "APPROVED":
      return {
        stage: ticket.invoice_paid_at ? "Paid" : "Approved",
        tone: "blue",
        techStatus: "Job Done",
        detail: ticket.completed_at ? `Finished ${timeAgo(ticket.completed_at)}` : null,
        gpsVerified,
      };
    case "DISPUTED":
      return {
        stage: "Disputed",
        tone: "red",
        techStatus: "Job Done",
        detail: ticket.completed_at ? `Finished ${timeAgo(ticket.completed_at)}` : null,
        gpsVerified,
      };
    case "CANCELLED":
      return {
        stage: "Cancelled",
        tone: "slate",
        techStatus: null,
        detail: ticket.cancelled_at ? `Cancelled by customer · ${timeAgo(ticket.cancelled_at)}` : "Cancelled by customer",
        gpsVerified: false,
      };
    case "REJECTED":
      return { stage: "Declined", tone: "slate", techStatus: null, detail: null, gpsVerified: false };
  }
}

export type JobFilterId = "ALL" | "PENDING" | "IN_PROGRESS" | "DISPUTED" | "COMPLETED" | "CANCELLED";

export type JobFilter = {
  id: JobFilterId;
  label: string;
  empty: string;
};

export const JOB_FILTERS: JobFilter[] = [
  { id: "ALL", label: "All Jobs", empty: "No jobs yet" },
  { id: "PENDING", label: "Pending", empty: "Nothing pending — every request is handled" },
  { id: "IN_PROGRESS", label: "In Progress", empty: "No technician is out on a job right now" },
  { id: "DISPUTED", label: "Disputed", empty: "No disputes" },
  { id: "COMPLETED", label: "Completed", empty: "No completed jobs yet" },
  { id: "CANCELLED", label: "Cancelled", empty: "No cancelled requests" },
];

/**
 * Which filter tab a job lives under. Cancelled requests (and ones the shop declined) have their
 * own "Cancelled" tab and are kept out of "All Jobs", so the working list only holds live work.
 */
export function jobFilterOf(ticket: JobTicket): Exclude<JobFilterId, "ALL"> | null {
  switch (ticket.status) {
    case "PENDING":
    case "UNASSIGNED":
      return "PENDING";
    // A confirmed technician is already preparing or driving; an unconfirmed
    // one is still just a request waiting on somebody.
    case "SCHEDULED":
      return ticket.staff_accepted_at ? "IN_PROGRESS" : "PENDING";
    case "ESTIMATE_PENDING":
    case "IN_PROGRESS":
      return "IN_PROGRESS";
    case "DISPUTED":
      return "DISPUTED";
    case "COMPLETED":
    case "APPROVED":
      return "COMPLETED";
    case "CANCELLED":
    case "REJECTED":
      return "CANCELLED";
    default:
      return null;
  }
}

/** The owner has to do something: answer a request, assign a tech, review finished work or a dispute. */
export function needsOwnerAction(ticket: JobTicket): boolean {
  return (
    ticket.status === "PENDING" ||
    ticket.status === "UNASSIGNED" ||
    ticket.status === "COMPLETED" ||
    ticket.status === "DISPUTED"
  );
}

export function firstName(fullName: string): string {
  return fullName.trim().split(/\s+/)[0] || fullName;
}
