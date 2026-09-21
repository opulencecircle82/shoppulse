"use client";

import { MapPin, Navigation as NavigationIcon } from "lucide-react";
import type { JobTicket } from "@/lib/supabase/types";

function mapsUrl(address: string) {
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}`;
}

export default function TechRouteScreen({
  task,
  queue,
  onOpenTask,
}: {
  task: JobTicket | null;
  queue: JobTicket[];
  onOpenTask: (ticket: JobTicket) => void;
}) {
  const stops = task ? [task, ...queue] : queue;

  return (
    <main className="min-h-screen bg-brand-navy px-5 pb-24 pt-6">
      <div className="mx-auto max-w-lg">
        <h1 className="text-lg font-bold text-white">Today&apos;s Route</h1>
        <p className="mt-1 text-sm text-slate-400">
          {stops.length === 0
            ? "No stops scheduled for today."
            : `${stops.length} stop${stops.length > 1 ? "s" : ""}, in order.`}
        </p>

        {stops.length === 0 ? (
          <div className="mt-6 rounded-2xl bg-white/5 p-6 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-white/10">
              <NavigationIcon className="h-5 w-5 text-slate-400" />
            </div>
            <p className="mt-3 text-sm text-slate-400">
              No jobs assigned to you right now.
            </p>
          </div>
        ) : (
          <div className="mt-6 space-y-3">
            {stops.map((stop, index) => (
              <div key={stop.id} className="flex gap-3 rounded-2xl bg-white/5 p-4">
                <div className="flex flex-col items-center">
                  <span
                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                      index === 0
                        ? "bg-brand-orange text-white"
                        : "bg-white/10 text-slate-300"
                    }`}
                  >
                    {index + 1}
                  </span>
                  {index < stops.length - 1 && (
                    <span className="mt-1 w-px flex-1 bg-white/10" />
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => onOpenTask(stop)}
                  className="flex-1 pb-1 text-left"
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-sm font-semibold text-white">
                      {stop.client_name}
                    </p>
                    {index === 0 && (
                      <span className="shrink-0 rounded-full bg-brand-orange/15 px-2 py-0.5 text-[10px] font-bold text-brand-orange">
                        NEXT
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 text-xs text-slate-400">{stop.service_type}</p>
                  <div className="mt-1.5 flex items-center gap-1 text-xs text-slate-500">
                    <MapPin className="h-3 w-3 shrink-0" />
                    <span className="truncate">{stop.service_address}</span>
                  </div>
                </button>
                <a
                  href={mapsUrl(stop.service_address)}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="flex h-9 w-9 shrink-0 items-center justify-center self-center rounded-full bg-brand-blue/15 text-brand-blue"
                  aria-label="Navigate"
                >
                  <NavigationIcon className="h-4 w-4" />
                </a>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
