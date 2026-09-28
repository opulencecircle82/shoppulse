"use client";

import type { ReactNode } from "react";
import dynamic from "next/dynamic";
import { BellRing, MapPin, Navigation, Store, Wrench } from "lucide-react";
import { formatEta, techProximity } from "@/lib/customer/jobStages";
import { distanceKm } from "@/lib/geo/distance";
import { timeAgo } from "@/lib/dashboard/format";

const TechTrackerMap = dynamic(() => import("./TechTrackerMap"), {
  ssr: false,
  loading: () => <div className="h-[220px] rounded-xl bg-white/5" />,
});

type Point = { lat: number; lng: number };

/** Where the technician is in the job: getting ready, on the road, or at the customer's place. */
export type TrackPhase = "preparing" | "en_route" | "on_site";

/**
 * The map card on the customer's request page from the moment a technician has the job until it is done: a plain
 * sentence about what's happening ("The tech is on its way" — then, once they're close, "The tech is almost near
 * you"; on site: "Your technician is on site"), the map with the technician, the customer's address AND the shop,
 * a legend saying which pin is which, and whatever actions the page hands in (Message us).
 * The map shows whatever is known — even before the technician's app has shared a position, the shop and the
 * customer's address are drawn.
 */
export default function TechLiveCard({
  phase = "en_route",
  detail,
  location,
  destination,
  shop = null,
  children,
}: {
  phase?: TrackPhase;
  /** The line under the heading while on site (what the technician is doing). */
  detail?: string;
  location: (Point & { updated_at: string }) | null;
  destination: Point | null;
  /** Where the business is (its own pin) and its street address, when it has set them. */
  shop?: (Point & { name: string; address?: string | null }) | null;
  children?: ReactNode;
}) {
  const { eta, near } = techProximity(location, destination);
  const onTheRoad = phase === "en_route";
  const almostThere = onTheRoad && near;
  // Once the technician is at the door the map zooms in on them and the address — unless the shop is right
  // there too (within 1 km), in which case it stays in the picture. At the customer's place, show everything.
  const shopInView =
    Boolean(shop) &&
    (!almostThere || (destination !== null && shop !== null && distanceKm(shop, destination) <= 1));
  const hasMap = Boolean(location || destination || shop);

  return (
    <div className="mt-5 rounded-xl bg-white/5 p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Live tracking</p>

      {almostThere ? (
        <div className="mt-2 flex items-start gap-3 rounded-xl bg-brand-emerald/15 p-3.5 ring-1 ring-brand-emerald/40">
          <BellRing className="mt-0.5 h-5 w-5 shrink-0 text-brand-emerald" />
          <div>
            <p className="text-base font-bold text-white">The tech is almost near you</p>
            <p className="mt-0.5 text-sm text-slate-300">
              Just a few minutes away — please be ready to meet them.
            </p>
          </div>
        </div>
      ) : phase === "on_site" ? (
        <div className="mt-2 flex items-start gap-3">
          <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-emerald/20">
            <Wrench className="h-4 w-4 text-brand-emerald" />
          </span>
          <div>
            <p className="text-base font-bold text-white">Your technician is on site</p>
            {detail && <p className="mt-0.5 text-sm text-slate-400">{detail}</p>}
          </div>
        </div>
      ) : (
        <div className="mt-2 flex items-start gap-3">
          <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-sky/20">
            <Navigation className="h-4 w-4 text-brand-sky" />
          </span>
          <div>
            <p className="text-base font-bold text-white">
              {onTheRoad ? "The tech is on its way" : "Your technician is getting ready"}
            </p>
            <p className="mt-0.5 text-sm text-slate-400">
              {!onTheRoad
                ? "They'll set off for your address soon."
                : eta.minutes !== null
                  ? `ETA ${formatEta(eta.minutes)}`
                  : location === null
                    ? "Locating your technician..."
                    : "Heading to your address now."}
            </p>
          </div>
        </div>
      )}

      <div className="mt-4">
        {hasMap ? (
          <>
            <TechTrackerMap technician={location} destination={destination} shop={shop} fitShop={shopInView} />
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-300">
              {location && (
                <span className="flex items-center gap-1">
                  <span className="h-2.5 w-2.5 rounded-full bg-brand-emerald" /> Technician
                </span>
              )}
              {destination && (
                <span className="flex items-center gap-1">
                  <MapPin className="h-3 w-3 text-brand-sky" /> Your address
                </span>
              )}
              {shop && shopInView && (
                <span className="flex items-center gap-1">
                  <Store className="h-3 w-3 text-brand-orange" /> {shop.name}
                  {shop.address ? ` · ${shop.address.trim()}` : ""}
                </span>
              )}
              {!shop && (
                <span className="text-slate-500">The shop hasn&apos;t pinned its location yet</span>
              )}
            </div>
            <p className="mt-2 text-[11px] text-slate-400">
              {location === null
                ? "Your technician's position appears here as soon as their app shares it."
                : eta.stale
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
