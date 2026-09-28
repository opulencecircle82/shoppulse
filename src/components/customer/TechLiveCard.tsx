"use client";

import type { ReactNode } from "react";
import dynamic from "next/dynamic";
import { BellRing, Navigation } from "lucide-react";
import { formatEta, techProximity } from "@/lib/customer/jobStages";
import { timeAgo } from "@/lib/dashboard/format";

const TechTrackerMap = dynamic(() => import("./TechTrackerMap"), {
  ssr: false,
  loading: () => <div className="h-[220px] rounded-xl bg-white/5" />,
});

type Point = { lat: number; lng: number };

/**
 * Live tracking on the customer's request page while the technician is on the
 * road: what's happening in plain words ("The tech is on its way" — then, once
 * they're close, "The tech is almost near you"), the technician's position on a
 * map with the customer's address, and whatever actions the page hands in
 * (Message us).
 */
export default function TechLiveCard({
  location,
  destination,
  children,
}: {
  location: (Point & { updated_at: string }) | null;
  destination: Point | null;
  children?: ReactNode;
}) {
  const { eta, near } = techProximity(location, destination);

  return (
    <div className="mt-5 rounded-xl bg-white/5 p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Live tracking</p>

      {near ? (
        <div className="mt-2 flex items-start gap-3 rounded-xl bg-brand-emerald/15 p-3.5 ring-1 ring-brand-emerald/40">
          <BellRing className="mt-0.5 h-5 w-5 shrink-0 text-brand-emerald" />
          <div>
            <p className="text-base font-bold text-white">The tech is almost near you</p>
            <p className="mt-0.5 text-sm text-slate-300">
              Just a few minutes away — please be ready to meet them.
            </p>
          </div>
        </div>
      ) : (
        <div className="mt-2 flex items-start gap-3">
          <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-sky/20">
            <Navigation className="h-4 w-4 text-brand-sky" />
          </span>
          <div>
            <p className="text-base font-bold text-white">The tech is on its way</p>
            <p className="mt-0.5 text-sm text-slate-400">
              {eta.minutes !== null
                ? `ETA ${formatEta(eta.minutes)}`
                : location === null
                  ? "Locating your technician..."
                  : "Heading to your address now."}
            </p>
          </div>
        </div>
      )}

      <div className="mt-4">
        {location ? (
          <>
            <TechTrackerMap technician={location} destination={destination} />
            <p className="mt-2 text-[11px] text-slate-400">
              {eta.stale
                ? `Last seen ${timeAgo(location.updated_at)} — the technician's app may be closed.`
                : `Updated ${timeAgo(location.updated_at)} · refreshes every few seconds`}
            </p>
          </>
        ) : (
          <div className="flex h-[120px] items-center justify-center rounded-xl bg-white/5 px-4 text-center text-xs text-slate-400">
            The map appears as soon as your technician&apos;s app shares its position.
          </div>
        )}
      </div>

      {children && <div className="mt-4">{children}</div>}
    </div>
  );
}
