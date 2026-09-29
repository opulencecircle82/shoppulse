"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { JobTicket } from "@/lib/supabase/types";
import {
  fetchTicketStaffLocation,
  fetchTicketTechnician,
  fetchTicketWaitEstimate,
  type TicketTechnician,
  type TicketWaitEstimate,
} from "@/lib/customer/bookings";
import {
  formatEta,
  jobNumberLabel,
  paymentDue,
  pickBanner,
  techProximity,
  type BannerKind,
} from "@/lib/customer/jobStages";
import { timeAgo } from "@/lib/dashboard/format";

const LOCATION_POLL_MS = 15000;
const WAIT_ESTIMATE_POLL_MS = 20000;

/** Banners where the technician is out on the road or at the door, so a live position is worth reading. */
const TRACKABLE: BannerKind[] = ["EN_ROUTE", "PREPARING", "ON_SITE", "WORKING"];
const LIVE: BannerKind[] = ["EN_ROUTE", "ON_SITE", "WORKING"];

const GRADIENTS: Record<BannerKind, string> = {
  QUOTE: "from-brand-orange to-brand-orange-dark",
  EN_ROUTE: "from-brand-sky to-brand-blue-dark",
  ON_SITE: "from-brand-emerald-dark to-slate-900",
  WORKING: "from-brand-emerald-dark to-slate-900",
  REVIEW: "from-brand-blue to-slate-900",
  PREPARING: "from-brand-blue to-slate-900",
  CONFIRMED: "from-brand-blue to-slate-900",
  PENDING: "from-slate-600 to-slate-900",
};

type Pin = { lat: number; lng: number };

/**
 * The strip at the very top of the customer's app: the one thing happening
 * right now, in plain words ("Juan is on the way — ETA about 15 mins"). Its
 * button opens that request's page, where the live map and "Message us" are.
 */
export default function LiveStatusBanner({ jobs, pin }: { jobs: JobTicket[]; pin: Pin | null }) {
  const pick = useMemo(() => pickBanner(jobs), [jobs]);
  if (!pick) return null;
  // Keyed by job so switching to another booking starts with a clean slate.
  return <Banner key={pick.job.id} job={pick.job} kind={pick.kind} others={pick.others} pin={pin} />;
}

function Banner({
  job,
  kind,
  others,
  pin,
}: {
  job: JobTicket;
  kind: BannerKind;
  others: number;
  pin: Pin | null;
}) {
  const [technician, setTechnician] = useState<TicketTechnician | null>(null);
  const [location, setLocation] = useState<{ lat: number; lng: number; updated_at: string } | null>(null);
  const [waitEstimate, setWaitEstimate] = useState<TicketWaitEstimate | null>(null);
  const trackable = TRACKABLE.includes(kind);
  // The only banners a technician hasn't been put on yet — the one case "every technician is busy" can apply to.
  const awaitingAssignment = kind === "PENDING" || (kind === "CONFIRMED" && job.status === "UNASSIGNED");

  useEffect(() => {
    if (!trackable) return;
    let active = true;
    fetchTicketTechnician(job.id)
      .then((tech) => {
        if (active) setTechnician(tech);
      })
      .catch(() => {});
    const poll = () =>
      fetchTicketStaffLocation(job.id)
        .then((loc) => {
          if (active) setLocation(loc);
        })
        .catch(() => {});
    poll();
    const interval = setInterval(poll, LOCATION_POLL_MS);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [job.id, trackable]);

  useEffect(() => {
    if (!awaitingAssignment) return;
    let active = true;
    function poll() {
      fetchTicketWaitEstimate(job.id)
        .then((estimate) => {
          if (active) setWaitEstimate(estimate);
        })
        .catch(() => {});
    }
    poll();
    const interval = setInterval(poll, WAIT_ESTIMATE_POLL_MS);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [job.id, awaitingAssignment]);

  const destination: Pin | null =
    job.booking_latitude !== null && job.booking_longitude !== null
      ? { lat: job.booking_latitude, lng: job.booking_longitude }
      : pin;
  const { eta, near } = techProximity(location, destination);
  const name = technician?.full_name.trim().split(/\s+/)[0] ?? "Your technician";
  const live = LIVE.includes(kind);

  let headline: string;
  let subline: string;
  let cta: string;
  switch (kind) {
    case "QUOTE":
      headline = "Your quote is ready";
      subline = "Review the estimate and approve it so the repair can start.";
      cta = "Review Quote";
      break;
    case "EN_ROUTE":
      headline = near ? `${name} is almost there` : `${name} is on the way`;
      subline = near
        ? "Just around the corner — please be ready."
        : eta.minutes !== null
          ? `ETA ${formatEta(eta.minutes)}`
          : job.en_route_at
            ? `Left ${timeAgo(job.en_route_at)} — heading to your address`
            : "Heading to your address";
      cta = "Track Technician";
      break;
    case "ON_SITE":
      headline = `${name} has arrived`;
      subline = "Diagnosing the issue — a quote is on its way.";
      cta = "View Job";
      break;
    case "WORKING":
      headline = "Work is in progress";
      subline = job.started_at ? `${name} started ${timeAgo(job.started_at)}` : `${name} is on the job`;
      cta = "View Live Proof";
      if (paymentDue(job)) {
        subline = "Please pay so your technician can finish the job.";
        cta = "Pay Now";
      }
      break;
    case "REVIEW": {
      // Says only what is still left to do: pay, rate, or both.
      const owes = paymentDue(job);
      const rated = Boolean(job.customer_reviewed_at);
      headline = "Your job is complete";
      subline = owes
        ? rated
          ? "Review the proof and pay for the service."
          : "Review the proof, pay and rate the service."
        : "Review the proof and rate the service.";
      cta = owes ? "Review & Pay" : "Review & Rate";
      break;
    }
    case "PREPARING":
      headline = `${name} confirmed your job`;
      subline = "Getting ready to head to you.";
      cta = "View Job";
      break;
    case "CONFIRMED":
      headline = "Your booking is confirmed";
      subline =
        job.status === "UNASSIGNED"
          ? waitEstimate?.allBusy
            ? "Every technician is busy right now — see your request for details."
            : "The shop is assigning a technician."
          : "A technician has been assigned.";
      cta = "View Job";
      break;
    case "PENDING":
      headline = "Waiting for the shop to confirm";
      subline = waitEstimate?.allBusy
        ? "Every technician is busy right now — see your request for details."
        : "We'll let you know the moment they accept.";
      cta = "View Request";
      break;
  }

  return (
    <div className={`mt-4 rounded-2xl bg-gradient-to-br ${GRADIENTS[kind]} p-5 shadow-md shadow-blue-500/20`}>
      <div className="flex items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-1 text-[10px] font-bold text-white">
          {live && <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" />}
          {live ? "LIVE" : "UPDATE"} · TICKET {jobNumberLabel(job)}
        </span>
        {others > 0 && (
          <span className="text-[10px] font-medium text-white/80">
            +{others} more active {others === 1 ? "booking" : "bookings"}
          </span>
        )}
      </div>

      <p className="mt-3 text-lg font-bold leading-tight text-white">{headline}</p>
      <p className="mt-1 text-sm text-white/90">{subline}</p>
      <p className="mt-1 truncate text-xs text-white/70">{job.service_type}</p>

      <div className="mt-4">
        <Link
          href={cta === "Pay Now" ? `/client/${job.id}#pay` : `/client/${job.id}`}
          className="inline-flex items-center rounded-full bg-white px-4 py-2 text-xs font-bold text-slate-900 shadow-sm"
        >
          {cta}
        </Link>
      </div>
    </div>
  );
}
