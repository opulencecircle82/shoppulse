"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { fetchShopBySlug, isShopOpenNow, type BookingShop } from "@/lib/customer/bookings";

const DAY_LABELS: Record<string, string> = {
  MON: "Mon",
  TUE: "Tue",
  WED: "Wed",
  THU: "Thu",
  FRI: "Fri",
  SAT: "Sat",
  SUN: "Sun",
};

export default function ShopDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;

  const [loading, setLoading] = useState(true);
  const [shop, setShop] = useState<BookingShop | null>(null);
  const [notFound, setNotFound] = useState(false);

  const load = useCallback(async () => {
    const shopRow = await fetchShopBySlug(slug);
    if (!shopRow) {
      setNotFound(true);
      setLoading(false);
      return;
    }
    setShop(shopRow);
    setLoading(false);
  }, [slug]);

  useEffect(() => {
    const id = setTimeout(() => {
      load();
    }, 0);
    return () => clearTimeout(id);
  }, [load]);

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-blue border-t-transparent" />
      </main>
    );
  }

  if (notFound || !shop) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 px-6 text-center">
        <p className="text-sm text-slate-500">
          We couldn&apos;t find this business. Double-check the link and try again.
        </p>
      </main>
    );
  }

  const open = isShopOpenNow(shop);
  const hasHours = Boolean(shop.business_hours_open && shop.business_hours_close);

  return (
    <main className="min-h-screen bg-slate-50 px-5 py-6">
      <div className="mx-auto max-w-lg">
        <button
          type="button"
          onClick={() => router.back()}
          className="text-sm font-medium text-slate-500 hover:text-slate-900"
        >
          ← Back
        </button>

        <div className="mt-4 rounded-2xl bg-white p-6 shadow-sm shadow-slate-900/5">
          <div className="flex items-center gap-3">
            {shop.logo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={shop.logo_url}
                alt=""
                className="h-14 w-14 shrink-0 rounded-xl object-cover"
              />
            ) : (
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-lg font-bold text-brand-blue">
                {shop.shop_name.slice(0, 1).toUpperCase()}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate text-lg font-bold text-slate-900">
                {shop.shop_name}
              </p>
              <p className="mt-0.5 text-xs text-slate-500">
                {[shop.business_category, shop.city].filter(Boolean).join(" · ") ||
                  "Service provider"}
              </p>
            </div>
            {hasHours && (
              <span
                className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                  open
                    ? "bg-emerald-50 text-emerald-600"
                    : "bg-slate-100 text-slate-500"
                }`}
              >
                {open ? "Open Now" : "Closed"}
              </span>
            )}
          </div>

          {hasHours && (
            <div className="mt-5 border-t border-slate-100 pt-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Working Hours
              </p>
              <p className="mt-1.5 text-sm text-slate-700">
                {shop.business_hours_open} – {shop.business_hours_close}
              </p>
              <p className="mt-1 text-sm text-slate-500">
                {shop.business_days.length > 0
                  ? shop.business_days
                      .map((d) => DAY_LABELS[d] ?? d)
                      .join(", ")
                  : "No days set"}
              </p>
            </div>
          )}

          <Link
            href={`/customer/book/${shop.slug}`}
            className="mt-6 block w-full rounded-full bg-brand-blue px-6 py-3.5 text-center text-sm font-bold text-white shadow-md shadow-blue-500/30"
          >
            Book Now
          </Link>
        </div>
      </div>
    </main>
  );
}
