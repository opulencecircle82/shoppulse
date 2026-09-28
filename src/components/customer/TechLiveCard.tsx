"use client";

import type { ReactNode } from "react";
import dynamic from "next/dynamic";
import { BellRing, MapPin, Navigation, Store } from "lucide-react";
import { formatEta, techProximity } from "@/lib/customer/jobStages";
import { distanceKm } from "@/lib/geo/distance";
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
  shop = null,
  children,
}: {
  location: (Point & { updated_at: string }) | null;
  destination: Point | null;
  /** Where the business is (its own pin), when it has set one. */
  shop?: (Point & { name: string }) | null;
  children?: ReactNode;
}) {
  const { eta, near } = techProximity(location, destination);
  // Once the technician is at the door the map zooms in on them and the address — unless the shop is right
  // there too (within 1 km), in which case it stays in the picture.
  const shopInView = Boolean(shop) && (!near || (destination !== null && shop !== null && distanceKm(shop, destination) <= 1));

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
            {/* The shop stays in frame while the technician is on the way; once they're at the door the map
                zooms in on them and the customer's address instead. */}
            <TechTrackerMap technician={location} destination={destination} shop={shop} fitShop={shopInView} />
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-300">
              <span className="flex items-center gap-1">
                <span className="h-2.5 w-2.5 rounded-full bg-brand-emerald" /> Technician
              </span>
              {destination && (
                <span className="flex items-center gap-1">
                  <MapPin className="h-3 w-3 text-brand-sky" /> Your address
                </span>
              )}
              {shop && shopInView && (
                <span className="flex items-center gap-1">
                  <Store className="h-3 w-3 text-brand-orange" /> {shop.name}
                </span>
              )}
              {!shop && (
                <span className="text-slate-500">The shop hasn&apos;t pinned its location yet</span>
              )}
            </div>
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
