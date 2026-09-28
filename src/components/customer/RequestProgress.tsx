import { Check } from "lucide-react";
import type { RequestProgress as Progress } from "@/lib/customer/jobStages";

/**
 * "Where is my request?" — the steps a booking goes through before the
 * technician arrives, with the current one lit and a plain-words line on what
 * the customer is waiting for (the shop, a technician, or the technician to
 * get ready). `compact` drops that wording when a live tracking card above already says it.
 */
export default function RequestProgress({ progress, compact = false }: { progress: Progress; compact?: boolean }) {
  return (
    <div className="mt-5 rounded-xl bg-white/5 p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Request status</p>
      {!compact && (
        <>
          <p className="mt-1.5 text-base font-bold text-white">{progress.headline}</p>
          <p className="mt-0.5 text-sm text-slate-400">{progress.detail}</p>
        </>
      )}

      <ol className={`${compact ? "mt-3" : "mt-4"} space-y-0`}>
        {progress.steps.map((step, index) => {
          const isLast = index === progress.steps.length - 1;
          return (
            <li key={step.label} className="relative flex gap-3 pb-4 last:pb-0">
              {!isLast && (
                <span
                  aria-hidden="true"
                  className={`absolute left-[9px] top-5 h-[calc(100%-1rem)] w-0.5 ${
                    step.state === "done" ? "bg-brand-emerald" : "bg-white/10"
                  }`}
                />
              )}
              <span
                aria-hidden="true"
                className={`relative mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${
                  step.state === "done"
                    ? "bg-brand-emerald text-white"
                    : step.state === "current"
                      ? "bg-brand-sky/20 ring-2 ring-brand-sky"
                      : "bg-white/10"
                }`}
              >
                {step.state === "done" && <Check className="h-3 w-3" strokeWidth={3} />}
                {step.state === "current" && (
                  <span className="h-2 w-2 animate-pulse rounded-full bg-brand-sky" />
                )}
              </span>
              <span
                className={`text-sm ${
                  step.state === "current"
                    ? "font-semibold text-white"
                    : step.state === "done"
                      ? "text-slate-300"
                      : "text-slate-500"
                }`}
              >
                {step.label}
                {step.state === "current" && <span className="sr-only"> (now)</span>}
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
