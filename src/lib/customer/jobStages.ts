import type { JobTicket } from "@/lib/supabase/types";
import { distanceKm } from "@/lib/geo/distance";
import { timeAgo } from "@/lib/dashboard/format";
import { formatJobNumber } from "@/lib/jobNumber";

/**
 * How the customer's app reads their bookings — the same tickets the owner
 * and the technician see, translated into the four stages a customer thinks
 * in (like an online-shopping order: placed, on the way, being done, done).
 * The fine detail (technician confirmed, set off, arrived) comes from the
 * ticket's own timestamps, so all three apps always agree.
 */

export type PipelineStageId = "PENDING" | "EN_ROUTE" | "IN_PROGRESS" | "REVIEW";

export const PIPELINE: { id: PipelineStageId; label: string; empty: string }[] = [
  {
    id: "PENDING",
    label: "Pending Approval",
    empty: "No requests waiting for a shop to confirm.",
  },
  {
    id: "EN_ROUTE",
    label: "Tech En Route",
    empty: "No confirmed bookings waiting for a technician.",
  },
  {
    id: "IN_PROGRESS",
    label: "In Progress",
    empty: "No work is being done right now.",
  },
  {
    id: "REVIEW",
    label: "To Review / Complete",
    empty: "No finished jobs to review.",
  },
];

// A paid, approved job stays under "To Review / Complete" for a month so the
// receipt and the rating are easy to find, then moves to Past bookings.
const RECENT_JOB_MS = 30 * 24 * 60 * 60 * 1000;

/** The pipeline stage a booking sits in, or null for past bookings (cancelled, declined, old). */
export function pipelineStageOf(job: JobTicket): PipelineStageId | null {
  switch (job.status) {
    case "PENDING":
      return "PENDING";
    case "UNASSIGNED":
    case "SCHEDULED":
      return "EN_ROUTE";
    case "ESTIMATE_PENDING":
    case "IN_PROGRESS":
      return "IN_PROGRESS";
    case "COMPLETED":
    case "DISPUTED":
      return "REVIEW";
    case "APPROVED": {
      const finishedAt = Date.parse(job.completed_at ?? job.created_at);
      return Date.now() - finishedAt < RECENT_JOB_MS ? "REVIEW" : null;
    }
    default:
      return null;
  }
}

export type CustomerTone = "amber" | "sky" | "emerald" | "blue" | "red" | "orange" | "slate";

export const CUSTOMER_TONE_CLASSES: Record<CustomerTone, { chip: string; bar: string }> = {
  amber: { chip: "bg-amber-500/15 text-amber-400", bar: "bg-amber-400" },
  sky: { chip: "bg-brand-sky/15 text-brand-sky", bar: "bg-brand-sky" },
  emerald: { chip: "bg-brand-emerald/15 text-brand-emerald", bar: "bg-brand-emerald" },
  blue: { chip: "bg-brand-blue/15 text-brand-blue", bar: "bg-brand-blue" },
  red: { chip: "bg-red-500/15 text-red-400", bar: "bg-red-500" },
  orange: { chip: "bg-brand-orange/15 text-brand-orange", bar: "bg-brand-orange" },
  slate: { chip: "bg-white/10 text-slate-400", bar: "bg-slate-500" },
};

/** The customer still owes money on a job that is under way or finished. */
export function paymentDue(job: JobTicket): boolean {
  return (
    job.total_invoice_amount > 0 &&
    job.payment_status !== "PAID" &&
    !job.invoice_paid_at &&
    (job.status === "IN_PROGRESS" || job.status === "COMPLETED" || job.status === "APPROVED")
  );
}

export type CustomerJobStatus = {
  label: string;
  tone: CustomerTone;
  detail: string | null;
  /** What tapping the booking's card is for: the button text on it. */
  action: string;
};

export function customerJobStatus(job: JobTicket): CustomerJobStatus {
  switch (job.status) {
    case "PENDING":
      return {
        label: "Awaiting shop approval",
        tone: "amber",
        detail: `Sent ${timeAgo(job.created_at)}`,
        action: "View Request",
      };
    case "UNASSIGNED":
      return {
        label: "Confirmed — assigning a technician",
        tone: "sky",
        detail: "The shop accepted your booking",
        action: "View Details",
      };
    case "SCHEDULED":
      if (!job.staff_accepted_at) {
        return {
          label: "Technician assigned",
          tone: "sky",
          detail: "Waiting for them to confirm",
          action: "View Details",
        };
      }
      if (!job.en_route_at) {
        return {
          label: "Technician preparing",
          tone: "sky",
          detail: "Gathering tools before heading to you",
          action: "View Details",
        };
      }
      return {
        label: "Technician on the way",
        tone: "sky",
        detail: `Left ${timeAgo(job.en_route_at)}`,
        action: "Track Technician",
      };
    case "ESTIMATE_PENDING":
      return job.quote_submitted_at && !job.quote_approved_at
        ? {
            label: "Quote ready — needs your approval",
            tone: "orange",
            detail: "The repair starts once you approve it",
            action: "Review Quote",
          }
        : {
            label: "Technician on site",
            tone: "emerald",
            detail: "Diagnosing the issue",
            action: "View Details",
          };
    case "IN_PROGRESS": {
      const due = paymentDue(job);
      return {
        label: "Work in progress",
        tone: "emerald",
        detail:
          [
            job.started_at ? `Started ${timeAgo(job.started_at)}` : null,
            due ? "Payment due" : job.payment_status === "PAID" ? "Paid ✓" : null,
          ]
            .filter(Boolean)
            .join(" · ") || null,
        action: due ? "Pay Now" : "View Live Proof",
      };
    }
    case "COMPLETED": {
      const settled = job.payment_status === "PAID" || Boolean(job.invoice_paid_at);
      return {
        label: settled ? "Completed — please rate it" : "Completed — review & pay",
        tone: "blue",
        detail: job.completed_at ? `Finished ${timeAgo(job.completed_at)}` : null,
        action: settled ? "Review & Rate" : "Review & Pay",
      };
    }
    case "APPROVED": {
      const settled = job.payment_status === "PAID" || Boolean(job.invoice_paid_at);
      return {
        label: settled ? "Paid — thank you" : "Approved — payment due",
        tone: settled ? "emerald" : "blue",
        detail: job.completed_at ? `Finished ${timeAgo(job.completed_at)}` : null,
        action: settled ? "View Receipt" : "Pay & Rate",
      };
    }
    case "DISPUTED":
      return {
        label: "Under review by the shop",
        tone: "red",
        detail: "You raised a problem with this job",
        action: "View Details",
      };
    case "CANCELLED":
      return {
        label: "Cancelled",
        tone: "slate",
        detail: job.cancelled_at ? `Cancelled ${timeAgo(job.cancelled_at)}` : null,
        action: "View Details",
      };
    case "REJECTED":
      return { label: "Declined by the shop", tone: "slate", detail: null, action: "View Details" };
  }
}

export type RequestStepState = "done" | "current" | "todo";

export type RequestProgress = {
  /** What is happening to the request right now, in a few words. */
  headline: string;
  /** One line on what the customer is waiting for. */
  detail: string;
  steps: { label: string; state: RequestStepState }[];
};

const REQUEST_STEPS = [
  "Request sent",
  "Shop confirmed",
  "Technician assigned",
  "Technician preparing",
  "On the way",
] as const;

/**
 * How far a booking request has got before the technician arrives — the
 * "is anyone on it yet?" view. Returns null once the technician is on site
 * (the job page takes over from there) or if the request was cancelled/declined.
 * Reads only the status and the technician's own timestamps, so it agrees with
 * the owner's board and the technician's app.
 */
export function requestProgress(job: {
  status: string;
  staff_accepted_at: string | null;
  en_route_at: string | null;
}): RequestProgress | null {
  let current: number;
  let headline: string;
  let detail: string;
  // What the lit step says while it is the one being waited on ("Shop confirmed" would read as already done).
  let activeLabel: string;

  switch (job.status) {
    case "PENDING":
      current = 1;
      headline = "Waiting for the shop";
      detail = "The shop will review your request and confirm it.";
      activeLabel = "Waiting for the shop to confirm";
      break;
    case "UNASSIGNED":
      current = 2;
      headline = "Waiting for a technician";
      detail = "The shop accepted your request and is choosing who will come.";
      activeLabel = "Waiting for a technician";
      break;
    case "SCHEDULED":
      if (!job.staff_accepted_at) {
        current = 3;
        headline = "Technician assigned";
        detail = "Waiting for the technician to confirm the job.";
        activeLabel = "Waiting for the technician to confirm";
      } else if (!job.en_route_at) {
        current = 3;
        headline = "Technician preparing";
        detail = "Confirmed — gathering tools before heading to you.";
        activeLabel = "Technician is preparing";
      } else {
        current = 4;
        headline = "Technician on the way";
        detail = "Heading to your address now.";
        activeLabel = "Technician is on the way";
      }
      break;
    default:
      return null;
  }

  return {
    headline,
    detail,
    steps: REQUEST_STEPS.map((label, index) => ({
      label: index === current ? activeLabel : label,
      state: index < current ? "done" : index === current ? "current" : "todo",
    })),
  };
}

export function jobNumberLabel(job: JobTicket): string {
  return formatJobNumber(job.job_number, job.id);
}

/** What the big banner at the top of the app is about, most urgent first. */
export type BannerKind =
  | "QUOTE"
  | "EN_ROUTE"
  | "ON_SITE"
  | "WORKING"
  | "REVIEW"
  | "PREPARING"
  | "CONFIRMED"
  | "PENDING";

const BANNER_PRIORITY: BannerKind[] = [
  "QUOTE",
  "EN_ROUTE",
  "ON_SITE",
  "WORKING",
  "REVIEW",
  "PREPARING",
  "CONFIRMED",
  "PENDING",
];

function bannerKindOf(job: JobTicket): BannerKind | null {
  switch (job.status) {
    case "PENDING":
      return "PENDING";
    case "UNASSIGNED":
      return "CONFIRMED";
    case "SCHEDULED":
      if (!job.staff_accepted_at) return "CONFIRMED";
      return job.en_route_at ? "EN_ROUTE" : "PREPARING";
    case "ESTIMATE_PENDING":
      return job.quote_submitted_at && !job.quote_approved_at ? "QUOTE" : "ON_SITE";
    case "IN_PROGRESS":
      return "WORKING";
    case "COMPLETED":
      return "REVIEW";
    default:
      return null;
  }
}

export function pickBanner(
  jobs: JobTicket[]
): { job: JobTicket; kind: BannerKind; others: number } | null {
  const candidates = jobs
    .map((job) => ({ job, kind: bannerKindOf(job) }))
    .filter((c): c is { job: JobTicket; kind: BannerKind } => c.kind !== null)
    .sort((a, b) => BANNER_PRIORITY.indexOf(a.kind) - BANNER_PRIORITY.indexOf(b.kind));
  if (candidates.length === 0) return null;
  return { ...candidates[0], others: candidates.length - 1 };
}

// Straight-line distance understates a real drive, and a technician rarely
// holds top speed through town, so pad it and assume a modest average.
const ROAD_FACTOR = 1.4;
const AVERAGE_SPEED_KMH = 25;
// A position older than this means the technician's app is closed or
// backgrounded — an ETA from it would be a guess dressed up as a fact.
const FRESH_LOCATION_MS = 3 * 60 * 1000;

export type Eta = { minutes: number | null; stale: boolean };

/** Rough arrival estimate from the technician's last reported position. */
export function estimateEta(
  location: { lat: number; lng: number; updated_at: string } | null,
  destination: { lat: number; lng: number } | null
): Eta {
  if (!location) return { minutes: null, stale: false };
  const stale = Date.now() - Date.parse(location.updated_at) > FRESH_LOCATION_MS;
  if (stale || !destination) return { minutes: null, stale };
  const km = distanceKm(location, destination) * ROAD_FACTOR;
  return { minutes: Math.max(1, Math.round((km / AVERAGE_SPEED_KMH) * 60)), stale: false };
}

// Within this straight-line distance of the door the technician counts as "almost there"
// (the database sends the matching notification from the same 500 m).
export const NEARBY_KM = 0.5;

export type Proximity = { eta: Eta; near: boolean };

/** ETA plus whether the technician is close enough to say "almost there". Never claims either from a stale position. */
export function techProximity(
  location: { lat: number; lng: number; updated_at: string } | null,
  destination: { lat: number; lng: number } | null
): Proximity {
  const eta = estimateEta(location, destination);
  const near = Boolean(location && destination && !eta.stale && distanceKm(location, destination) <= NEARBY_KM);
  return { eta, near };
}

export function formatEta(minutes: number): string {
  if (minutes < 60) return `about ${minutes} min${minutes === 1 ? "" : "s"}`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest === 0 ? `about ${hours} hr` : `about ${hours} hr ${rest} min`;
}
