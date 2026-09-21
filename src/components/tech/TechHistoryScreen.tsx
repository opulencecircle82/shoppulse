"use client";

import { CheckCircle2 } from "lucide-react";
import type { JobTicket, Shop } from "@/lib/supabase/types";

const FINISHED_STATUSES = new Set(["COMPLETED", "APPROVED", "DISPUTED"]);

export default function TechHistoryScreen({
  shop,
  allTickets,
}: {
  shop: Shop;
  allTickets: JobTicket[];
}) {
  const history = allTickets
    .filter((t) => FINISHED_STATUSES.has(t.status))
    .sort((a, b) => {
      const aDate = a.completed_at ?? a.created_at;
      const bDate = b.completed_at ?? b.created_at;
      return new Date(bDate).getTime() - new Date(aDate).getTime();
    });

  return (
    <main className="min-h-screen bg-brand-navy px-5 pb-24 pt-6">
      <div className="mx-auto max-w-lg">
        <h1 className="text-lg font-bold text-white">Job History</h1>
        <p className="mt-1 text-sm text-slate-400">
          {history.length} completed job{history.length === 1 ? "" : "s"}.
        </p>

        {history.length === 0 ? (
          <div className="mt-6 rounded-2xl bg-white/5 p-6 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-white/10">
              <CheckCircle2 className="h-5 w-5 text-slate-400" />
            </div>
            <p className="mt-3 text-sm text-slate-400">
              No completed jobs yet — they&apos;ll show up here once you finish one.
            </p>
          </div>
        ) : (
          <div className="mt-6 space-y-2">
            {history.map((job) => (
              <div key={job.id} className="rounded-xl bg-white/5 px-4 py-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-sm font-semibold text-white">
                    {job.client_name}
                  </p>
                  {job.completed_at && (
                    <span className="shrink-0 text-[10px] text-slate-500">
                      {new Date(job.completed_at).toLocaleDateString()}
                    </span>
                  )}
                </div>
                <p className="mt-0.5 truncate text-xs text-slate-400">
                  {job.service_type} · {job.service_address}
                </p>
                {job.total_invoice_amount > 0 && (
                  <p className="mt-1 text-xs font-semibold text-brand-emerald">
                    {shop.currency} {job.total_invoice_amount.toFixed(2)}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
