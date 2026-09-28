"use client";

import dynamic from "next/dynamic";
import { MapPin, PanelRightClose, PanelRightOpen } from "lucide-react";
import type { Shop } from "@/lib/supabase/types";

const LiveFieldMap = dynamic(() => import("./LiveFieldMap"), {
  ssr: false,
  loading: () => <p className="p-4 text-sm text-slate-500">Loading map...</p>,
});

/**
 * The owner's live map, docked on the right of the dashboard on every tab
 * (see the layout in app/dashboard/page.tsx) instead of living behind a
 * sidebar tab — so where the technicians are is always in view while the
 * owner works the job board. It can be collapsed to a slim rail when the
 * job board needs the full width.
 */
export default function LiveMapPanel({
  shop,
  collapsed,
  onToggle,
}: {
  shop: Shop;
  collapsed: boolean;
  onToggle: () => void;
}) {
  if (collapsed) {
    return (
      <button
        type="button"
        onClick={onToggle}
        aria-label="Show the live field map"
        className="flex w-full items-center gap-3 rounded-2xl border-[3px] border-brand-blue bg-white px-4 py-3 text-left shadow-lg shadow-brand-blue/15 transition-colors hover:bg-brand-blue/5 xl:w-14 xl:flex-col xl:gap-4 xl:px-0 xl:py-4"
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-blue text-white shadow-md shadow-brand-blue/25">
          <MapPin className="h-4 w-4" />
        </span>
        <span className="text-sm font-semibold text-slate-900 xl:rotate-180 xl:[writing-mode:vertical-rl]">
          Live Field Map
        </span>
        <PanelRightOpen className="ml-auto h-4 w-4 text-brand-blue xl:ml-0" />
      </button>
    );
  }

  return (
    <section className="isolate flex h-[480px] flex-col overflow-hidden rounded-2xl border-[3px] border-brand-blue bg-white shadow-lg shadow-brand-blue/15 xl:h-[calc(100vh-3rem)]">
      <header className="flex items-center gap-3 border-b border-brand-blue/15 px-4 py-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-blue text-white shadow-md shadow-brand-blue/25">
          <MapPin className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-semibold text-slate-900">Live Field Map</h2>
          <p className="text-[11px] leading-snug text-slate-500">
            Where your technicians are right now while they&apos;re clocked in.
          </p>
        </div>
        <button
          type="button"
          onClick={onToggle}
          aria-label="Hide the live field map"
          title="Hide map — gives the job board the full width"
          className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-slate-500 transition-colors before:absolute before:-inset-1.5 before:content-[''] hover:bg-slate-100 hover:text-brand-blue"
        >
          <PanelRightClose className="h-4 w-4" />
        </button>
      </header>
      <div className="relative min-h-0 flex-1">
        <LiveFieldMap shop={shop} fill />
      </div>
    </section>
  );
}
