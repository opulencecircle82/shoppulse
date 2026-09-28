import type { JobStatus } from "@/lib/supabase/types";
import { PROCESS_STEPS, STAGE_BY_STATUS, processStepIndex } from "./stages";

/**
 * A slim segmented bar showing how far along its journey a job is, so a
 * card answers "where is this one in the process?" without opening it.
 */
export default function JobProgress({ status }: { status: JobStatus }) {
  const index = processStepIndex(status);
  const stage = STAGE_BY_STATUS.get(status);
  if (index === null || !stage) return null;

  return (
    <div
      role="img"
      aria-label={`Step ${index + 1} of ${PROCESS_STEPS.length}: ${stage.label}`}
    >
      <div className="flex gap-1">
        {PROCESS_STEPS.map((step, i) => (
          <span
            key={step}
            className={`h-1.5 flex-1 rounded-full ${i <= index ? stage.dot : "bg-slate-200"}`}
          />
        ))}
      </div>
      <p className="mt-1.5 text-[10px] font-medium text-slate-500">
        Step {index + 1} of {PROCESS_STEPS.length}
      </p>
    </div>
  );
}
