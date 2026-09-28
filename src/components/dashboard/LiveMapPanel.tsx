"use client";

import dynamic from "next/dynamic";
import { MapPin } from "lucide-react";
import type { Shop } from "@/lib/supabase/types";

const LiveFieldMap = dynamic(() => import("./LiveFieldMap"), {
  ssr: false,
  loading: () => <p className="p-4 text-sm text-slate-500">Loading map...</p>,
});

/**
 * The owner's live map, docked on the right of the dashboard on every tab
 * (see the layout in app/dashboard/page.tsx) instead of living behind a
 * sidebar tab — so where the technicians are is always in view while the
 * owner works the job board.
 */
export default function LiveMapPanel({ shop }: { shop: Shop }) {
  return (
    <section className="flex h-[480px] flex-col overflow-hidden rounded-2xl border border-slate-200/70 bg-white shadow-sm shadow-slate-900/5 xl:h-[calc(100vh-3rem)]">
      <header className="flex items-center gap-3 border-b border-slate-200 px-4 py-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-blue text-white shadow-md shadow-brand-blue/25">
          <MapPin className="h-4 w-4" />
        </span>
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-slate-900">Live Field Map</h2>
          <p className="text-[11px] leading-snug text-slate-500">
            Where your technicians are right now while they&apos;re clocked in.
          </p>
        </div>
      </header>
      <div className="relative min-h-0 flex-1">
        <LiveFieldMap shop={shop} fill />
      </div>
    </section>
  );
}
