"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { CheckCircle2, ClipboardList, Clock, Navigation, Wrench, type LucideIcon } from "lucide-react";
import type { JobTicket } from "@/lib/supabase/types";
import {
  CUSTOMER_TONE_CLASSES,
  PIPELINE,
  customerJobStatus,
  jobNumberLabel,
  pipelineStageOf,
  type PipelineStageId,
} from "@/lib/customer/jobStages";

const STAGE_ICONS: Record<PipelineStageId, LucideIcon> = {
  PENDING: Clock,
  EN_ROUTE: Navigation,
  IN_PROGRESS: Wrench,
  REVIEW: CheckCircle2,
};

const STAGE_INDEX = new Map(PIPELINE.map((stage, index) => [stage.id, index]));

/** Four little segments showing how far along the booking is. */
function StageTracker({ job, stageId }: { job: JobTicket; stageId: PipelineStageId }) {
  const status = customerJobStatus(job);
  const reached = STAGE_INDEX.get(stageId) ?? 0;
  return (
    <div className="mt-3 flex gap-1" aria-hidden="true">
      {PIPELINE.map((stage, index) => (
        <span
          key={stage.id}
          className={`h-1 flex-1 rounded-full ${
            index <= reached ? CUSTOMER_TONE_CLASSES[status.tone].bar : "bg-white/10"
          }`}
        />
      ))}
    </div>
  );
}

function BookingCard({ job }: { job: JobTicket }) {
  const status = customerJobStatus(job);
  const stageId = pipelineStageOf(job);

  return (
    <Link
      href={`/client/${job.id}`}
      className="block rounded-2xl bg-white/5 p-4 shadow-md shadow-black/20 transition-shadow hover:shadow-lg"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-semibold text-slate-500">{jobNumberLabel(job)}</span>
        <span
          className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${CUSTOMER_TONE_CLASSES[status.tone].chip}`}
        >
          {status.label}
        </span>
      </div>
      <p className="mt-2 text-sm font-semibold text-white">{job.service_type}</p>
      <p className="mt-0.5 line-clamp-2 text-xs text-slate-400">{job.service_address}</p>
      {status.detail && <p className="mt-1 text-[11px] text-slate-500">{status.detail}</p>}
      {stageId && <StageTracker job={job} stageId={stageId} />}
      <span className="mt-3 inline-block text-xs font-semibold text-brand-blue">{status.action} →</span>
    </Link>
  );
}

/**
 * "My Service Bookings": the customer's bookings sorted into four stages,
 * with a counter on each — the same idea as the order tabs of an online shop.
 * Pick a stage to see its bookings; cancelled, declined and long-finished ones
 * are tucked under "Past bookings".
 */
export default function ServiceBookingsHub({ jobs }: { jobs: JobTicket[] }) {
  const [selected, setSelected] = useState<PipelineStageId | null>(null);
  const [showPast, setShowPast] = useState(false);

  const { byStage, past } = useMemo(() => {
    const groups: Record<PipelineStageId, JobTicket[]> = {
      PENDING: [],
      EN_ROUTE: [],
      IN_PROGRESS: [],
      REVIEW: [],
    };
    const pastJobs: JobTicket[] = [];
    for (const job of jobs) {
      const stage = pipelineStageOf(job);
      if (stage) groups[stage].push(job);
      else pastJobs.push(job);
    }
    return { byStage: groups, past: pastJobs };
  }, [jobs]);

  // Until the customer taps a stage, open the first one that has something in it.
  const activeId =
    selected ?? PIPELINE.find((stage) => byStage[stage.id].length > 0)?.id ?? "PENDING";
  const activeStage = PIPELINE.find((stage) => stage.id === activeId)!;
  const activeJobs = byStage[activeId];

  return (
    <section className="mt-5">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
        My Service Bookings
      </p>

      <div role="tablist" aria-label="Booking stages" className="mt-3 grid grid-cols-4 gap-2">
        {PIPELINE.map((stage) => {
          const Icon = STAGE_ICONS[stage.id];
          const count = byStage[stage.id].length;
          const isActive = stage.id === activeId;
          return (
            <button
              key={stage.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => setSelected(stage.id)}
              className={`flex flex-col items-center gap-1.5 rounded-2xl px-1 py-2.5 text-center transition-colors ${
                isActive ? "bg-white/10" : "hover:bg-white/5"
              }`}
            >
              <span className="relative">
                <span
                  className={`flex h-11 w-11 items-center justify-center rounded-full ${
                    isActive ? "bg-brand-blue text-white" : "bg-white/10 text-slate-300"
                  }`}
                >
                  <Icon className="h-5 w-5" />
                </span>
                {count > 0 && (
                  <span className="absolute -right-1.5 -top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-brand-orange px-1 text-[10px] font-bold text-white ring-2 ring-brand-navy">
                    {count > 9 ? "9+" : count}
                  </span>
                )}
              </span>
              <span
                className={`text-[10px] font-semibold leading-tight ${
                  isActive ? "text-white" : "text-slate-400"
                }`}
              >
                {stage.label}
              </span>
            </button>
          );
        })}
      </div>

      <div role="tabpanel" className="mt-3">
        {activeJobs.length === 0 ? (
          <div className="rounded-2xl bg-white/5 p-6 text-center shadow-md shadow-black/20">
            <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-brand-blue/10">
              <ClipboardList className="h-4 w-4 text-brand-blue" />
            </div>
            <p className="mt-3 text-sm text-slate-400">
              {jobs.length === 0
                ? "No bookings yet. Book a service below or pick a business from the list."
                : activeStage.empty}
            </p>
          </div>
        ) : (
          <ul className="space-y-3">
            {activeJobs.map((job) => (
              <li key={job.id}>
                <BookingCard job={job} />
              </li>
            ))}
          </ul>
        )}
      </div>

      {past.length > 0 && (
        <div className="mt-3">
          <button
            type="button"
            onClick={() => setShowPast((open) => !open)}
            aria-expanded={showPast}
            className="text-xs font-semibold text-slate-400 hover:text-white"
          >
            {showPast ? "Hide" : "Show"} past bookings ({past.length})
          </button>
          {showPast && (
            <ul className="mt-3 space-y-3">
              {past.map((job) => (
                <li key={job.id}>
                  <BookingCard job={job} />
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  );
}
