"use client";

import { useState } from "react";
import { MapPin } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import type { Shop, JobTicket } from "@/lib/supabase/types";
import TechNotificationBell from "./TechNotificationBell";

function mapsUrl(address: string) {
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}`;
}

export default function TechHomeScreen({
  shop,
  staffId,
  task,
  queue,
  onOpenTask,
  onSignedOut,
  onRefresh,
}: {
  shop: Shop;
  staffId: string;
  task: JobTicket | null;
  queue: JobTicket[];
  onOpenTask: (ticket: JobTicket) => void;
  onSignedOut: () => void;
  onRefresh: () => void;
}) {
  const [responding, setResponding] = useState(false);

  async function handleSignOut() {
    await supabase.auth.signOut();
    onSignedOut();
  }

  async function handleAcceptJob() {
    if (!task) return;
    setResponding(true);
    await supabase.rpc("accept_job_assignment", { p_ticket_id: task.id });
    setResponding(false);
    onRefresh();
  }

  async function handleDeclineJob() {
    if (!task) return;
    setResponding(true);
    await supabase.rpc("decline_job_assignment", { p_ticket_id: task.id });
    setResponding(false);
    onRefresh();
  }

  const isInProgress = task?.status === "IN_PROGRESS";
  const needsAcceptance = task?.status === "SCHEDULED" && !task.staff_accepted_at;

  return (
    <main className="min-h-screen bg-brand-navy">
      <header className="flex items-center justify-between px-5 py-4">
        <h1 className="text-lg font-bold text-white">{shop.shop_name}</h1>
        <div className="flex items-center gap-1">
          <TechNotificationBell staffId={staffId} />
          <button
            type="button"
            onClick={handleSignOut}
            className="text-sm font-medium text-slate-400 hover:text-white"
          >
            Sign Out
          </button>
        </div>
      </header>

      <div className="px-5 pb-10">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Active Task
        </p>

        {!task ? (
          <div className="mt-3 rounded-2xl bg-white/5 p-6 text-center">
            <p className="text-sm text-slate-400">
              No job assigned to you right now. Check back later.
            </p>
          </div>
        ) : needsAcceptance ? (
          <div className="mt-3 w-full rounded-2xl bg-white/5 p-5">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/15 px-2.5 py-1 text-[10px] font-bold text-amber-400">
              NEEDS YOUR CONFIRMATION
            </span>
            <p className="mt-3 text-lg font-bold text-white">{task.client_name}</p>
            <p className="mt-0.5 text-sm text-slate-300">{task.service_type}</p>
            <p className="mt-2 text-xs text-slate-500">{task.service_address}</p>
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={handleAcceptJob}
                disabled={responding}
                className="flex-1 rounded-full bg-brand-orange px-4 py-2.5 text-xs font-bold text-white disabled:opacity-60"
              >
                Accept Job
              </button>
              <button
                type="button"
                onClick={handleDeclineJob}
                disabled={responding}
                className="flex-1 rounded-full border border-white/20 px-4 py-2.5 text-xs font-bold text-slate-300 disabled:opacity-60"
              >
                Decline
              </button>
            </div>
          </div>
        ) : (
          <div className="mt-3 rounded-2xl bg-white/5 p-5">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-emerald/15 px-2.5 py-1 text-[10px] font-bold text-brand-emerald">
                {isInProgress ? "IN PROGRESS" : "SCHEDULED"}
              </span>
              <a
                href={mapsUrl(task.service_address)}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="flex items-center gap-1 text-xs font-medium text-brand-blue"
              >
                <MapPin className="h-3 w-3" /> Maps
              </a>
            </div>
            <button
              type="button"
              onClick={() => onOpenTask(task)}
              className="mt-3 block w-full text-left"
            >
              <p className="text-lg font-bold text-white">{task.client_name}</p>
              <p className="mt-0.5 text-sm text-slate-300">{task.service_type}</p>
              <p className="mt-2 text-xs text-slate-500">{task.service_address}</p>
              <span className="mt-4 inline-block rounded-full bg-brand-orange px-5 py-2 text-xs font-bold text-white">
                {isInProgress ? "Complete Job" : "Start Job"}
              </span>
            </button>
          </div>
        )}

        {queue.length > 0 && (
          <div className="mt-6">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Next Up ({queue.length})
            </p>
            <div className="mt-3 space-y-2">
              {queue.map((job) => (
                <div
                  key={job.id}
                  className="rounded-xl bg-white/5 px-4 py-3"
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-sm font-semibold text-white">
                      {job.client_name}
                    </p>
                    {job.preferred_date && (
                      <span className="shrink-0 text-[10px] text-slate-500">
                        {new Date(job.preferred_date).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 truncate text-xs text-slate-400">
                    {job.service_type} · {job.service_address}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
