"use client";

import { supabase } from "@/lib/supabase/client";
import type { Shop, JobTicket } from "@/lib/supabase/types";

export default function TechHomeScreen({
  shop,
  task,
  onOpenTask,
  onSignedOut,
}: {
  shop: Shop;
  task: JobTicket | null;
  onOpenTask: (ticket: JobTicket) => void;
  onSignedOut: () => void;
}) {
  async function handleSignOut() {
    await supabase.auth.signOut();
    onSignedOut();
  }

  const isInProgress = task?.status === "IN_PROGRESS";

  return (
    <main className="min-h-screen bg-brand-navy">
      <header className="flex items-center justify-between px-5 py-4">
        <h1 className="text-lg font-bold text-white">{shop.shop_name}</h1>
        <button
          type="button"
          onClick={handleSignOut}
          className="text-sm font-medium text-slate-400 hover:text-white"
        >
          Sign Out
        </button>
      </header>

      <div className="px-5 pb-10">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Today&apos;s Task
        </p>

        {!task ? (
          <div className="mt-3 rounded-2xl bg-white/5 p-6 text-center">
            <p className="text-sm text-slate-400">
              No job assigned to you right now. Check back later.
            </p>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => onOpenTask(task)}
            className="mt-3 w-full rounded-2xl bg-white/5 p-5 text-left transition-colors hover:bg-white/10"
          >
            <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-emerald/15 px-2.5 py-1 text-[10px] font-bold text-brand-emerald">
              {isInProgress ? "IN PROGRESS" : "SCHEDULED"}
            </span>
            <p className="mt-3 text-lg font-bold text-white">{task.client_name}</p>
            <p className="mt-0.5 text-sm text-slate-300">{task.service_type}</p>
            <p className="mt-2 text-xs text-slate-500">{task.service_address}</p>
            <span className="mt-4 inline-block rounded-full bg-brand-orange px-5 py-2 text-xs font-bold text-white">
              {isInProgress ? "Complete Job" : "Start Job"}
            </span>
          </button>
        )}
      </div>
    </main>
  );
}
