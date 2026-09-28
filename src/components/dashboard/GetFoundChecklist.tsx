"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Check, MapPin } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import type { Shop } from "@/lib/supabase/types";
import type { DashboardTabId } from "./DashboardSidebarNav";
import { GO_LIVE_EVENT, hasBusinessLocation, hasWorkingSchedule } from "./GoLiveButton";

/**
 * Customers in the app only see businesses that are listed, pinned on the map and
 * (for the services list) have added services. A brand-new shop has none of that,
 * so it stays invisible with no hint why — this card says exactly what is missing
 * and takes the owner there. It disappears once everything is done.
 */
export default function GetFoundChecklist({
  shop,
  onSelectTab,
}: {
  shop: Shop;
  onSelectTab: (tab: DashboardTabId) => void;
}) {
  // null until the count has come back, so the card doesn't flash a false "add a service".
  const [serviceCount, setServiceCount] = useState<number | null>(null);

  useEffect(() => {
    let active = true;
    supabase
      .from("shop_services")
      .select("id", { count: "exact", head: true })
      .eq("shop_id", shop.id)
      .then(({ count }) => {
        if (active) setServiceCount(count ?? 0);
      });
    return () => {
      active = false;
    };
  }, [shop.id]);

  const items: {
    key: string;
    label: string;
    hint: string;
    done: boolean;
    href?: string;
    tab?: DashboardTabId;
    /** Opens that step of the LIVE button (the owner never has to hunt through Settings). */
    goLive?: "hours" | "location";
    action: string;
  }[] = [
    {
      key: "pin",
      label: "Pin your business on the map",
      hint: "Customers see where your shop is on their tracking map, and find you by distance — without a pin they can't.",
      done: hasBusinessLocation(shop),
      goLive: "location",
      action: "Set location",
    },
    {
      key: "hours",
      label: "Set your working days and hours",
      hint: "Customers see Open Now or Closed from these.",
      done: hasWorkingSchedule(shop),
      goLive: "hours",
      action: "Set hours",
    },
    {
      key: "city",
      label: "Add your city and business category",
      hint: "Used for the category buttons and city search in the customer app.",
      done: Boolean(shop.city && shop.business_category),
      href: "/dashboard/settings",
      action: "Add details",
    },
    {
      key: "services",
      label: "Add at least one service",
      hint: "Your services and prices appear in \"Services Near You\".",
      done: serviceCount === null || serviceCount > 0,
      tab: "services",
      action: "Add a service",
    },
    {
      key: "listed",
      label: "Show your business in the customer app",
      hint: "Turn on the listing in your Company Profile.",
      done: shop.is_publicly_listed,
      href: "/dashboard/settings",
      action: "Turn on",
    },
  ];

  const remaining = items.filter((item) => !item.done);
  if (remaining.length === 0) return null;

  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-orange/15 text-brand-orange-dark">
          <MapPin className="h-4 w-4" />
        </span>
        <div>
          <p className="text-sm font-semibold text-slate-900">Get found by customers near you</p>
          <p className="mt-0.5 text-xs text-slate-600">
            {remaining.length === items.length
              ? "Customers can't see your business in the app yet. Finish these steps:"
              : `${remaining.length} more step${remaining.length === 1 ? "" : "s"} and customers nearby can find you:`}
          </p>
        </div>
      </div>

      <ul className="mt-4 space-y-2.5">
        {items.map((item) => (
          <li key={item.key} className="flex items-start gap-3">
            <span
              className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${
                item.done ? "bg-brand-emerald text-white" : "border-2 border-brand-orange/50 bg-white"
              }`}
            >
              {item.done && <Check className="h-3 w-3" strokeWidth={3} />}
            </span>
            <div className="min-w-0 flex-1">
              <p className={`text-sm ${item.done ? "text-slate-500 line-through" : "font-medium text-slate-900"}`}>
                {item.label}
              </p>
              {!item.done && <p className="mt-0.5 text-xs text-slate-500">{item.hint}</p>}
            </div>
            {!item.done &&
              (item.href ? (
                <Link
                  href={item.href}
                  className="shrink-0 whitespace-nowrap rounded-full border border-brand-blue/40 px-3 py-1 text-xs font-semibold text-brand-blue hover:bg-brand-blue/5"
                >
                  {item.action}
                </Link>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    if (item.goLive) window.dispatchEvent(new CustomEvent(GO_LIVE_EVENT, { detail: item.goLive }));
                    else if (item.tab) onSelectTab(item.tab);
                  }}
                  className="shrink-0 whitespace-nowrap rounded-full border border-brand-blue/40 px-3 py-1 text-xs font-semibold text-brand-blue hover:bg-brand-blue/5"
                >
                  {item.action}
                </button>
              ))}
          </li>
        ))}
      </ul>
    </div>
  );
}
