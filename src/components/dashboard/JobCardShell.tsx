import type { ReactNode } from "react";
import type { JobTicket } from "@/lib/supabase/types";
import { initials } from "@/lib/dashboard/format";
import { STAGE_BY_STATUS } from "./stages";

/**
 * The frame every job card shares: a plain white card with a header band
 * tinted in the job's stage color (avatar, client, service and the stage
 * name), and the card's own content underneath. Keeping it in one place
 * means every stage looks the same apart from its color.
 */
export default function JobCardShell({
  ticket,
  onClick,
  children,
}: {
  ticket: JobTicket;
  onClick?: () => void;
  children: ReactNode;
}) {
  const stage = STAGE_BY_STATUS.get(ticket.status);

  return (
    <div
      onClick={onClick}
      className={`overflow-hidden rounded-2xl border bg-white shadow-sm shadow-slate-900/5 ${
        ticket.is_emergency ? "border-red-500/50 ring-1 ring-red-500/30" : "border-slate-200/70"
      } ${onClick ? "cursor-pointer transition-shadow hover:shadow-lg hover:shadow-brand-blue/10" : ""}`}
    >
      {ticket.is_emergency && (
        <p className="bg-red-500 px-4 py-1 text-[10px] font-bold tracking-wide text-white">
          🚨 EMERGENCY
        </p>
      )}

      <header
        className={`flex items-center gap-3 border-b px-4 py-3 ${
          stage?.header ?? "border-slate-200 bg-slate-100"
        }`}
      >
        <span
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-xs font-bold shadow-sm shadow-slate-900/10 ${
            stage?.tint ?? "text-slate-600"
          }`}
        >
          {initials(ticket.client_name)}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-slate-900">{ticket.client_name}</p>
          <p className="truncate text-xs text-slate-600">{ticket.service_type}</p>
        </div>
        {stage && (
          <span
            className={`shrink-0 rounded-full bg-white px-2.5 py-1 text-[10px] font-bold shadow-sm shadow-slate-900/10 ${stage.tint}`}
          >
            {stage.label}
          </span>
        )}
      </header>

      <div className="p-4 [&>*:first-child]:mt-0">{children}</div>
    </div>
  );
}
